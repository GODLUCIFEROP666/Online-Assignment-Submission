import os
import unittest
from unittest.mock import patch

from app.core.config import Settings
from app.core.db_uri import mask_mongodb_uri, sanitize_and_normalize_mongodb_uri


class TestMongoDBURINormalization(unittest.TestCase):
    """
    Safe test suite verifying URI parsing and credential preservation
    without exposing or hardcoding any real secrets.
    """

    def test_standard_atlas_uri_preserved_intact(self):
        uri = "mongodb+srv://cluster_user:MySecurePassword123@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority"
        cleaned, diag = sanitize_and_normalize_mongodb_uri(uri)
        self.assertEqual(cleaned, uri)
        self.assertEqual(
            diag["masked_uri"],
            "mongodb+srv://cluster_user:*****@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority",
        )
        self.assertNotIn("MySecurePassword123", diag["masked_uri"])

    def test_already_url_encoded_credentials_not_corrupted(self):
        # Passwords with %2B (+), %40 (@), %25 (%), %23 (#)
        uri = "mongodb+srv://user_a:P%2Bss%40word%25123%23@cluster0.abcde.mongodb.net/final?retryWrites=true"
        cleaned, diag = sanitize_and_normalize_mongodb_uri(uri)
        # MUST NOT decode %2B into + or space, or %40 into @
        self.assertEqual(cleaned, uri)
        self.assertIn("P%2Bss%40word%25123%23", uri)
        self.assertIn("*****", diag["masked_uri"])

    def test_password_with_literal_plus_sign(self):
        # A password with a literal + must not be converted into a space
        uri = "mongodb+srv://user_b:Pass+Word+123@cluster0.abcde.mongodb.net/final?retryWrites=true"
        cleaned, diag = sanitize_and_normalize_mongodb_uri(uri)
        self.assertEqual(cleaned, uri)
        self.assertNotIn(" ", cleaned)

    def test_surrounding_quotes_and_whitespace_stripped(self):
        inner_uri = "mongodb+srv://app_user:somePass99@cluster0.abcde.mongodb.net/final?retryWrites=true"
        dirty_uri = f'  "{inner_uri}" \n'
        cleaned, diag = sanitize_and_normalize_mongodb_uri(dirty_uri)
        self.assertEqual(cleaned, inner_uri)
        self.assertTrue(diag["had_whitespace_or_quotes"])

    def test_single_quoted_uri_stripped(self):
        inner_uri = "mongodb+srv://app_user:somePass99@cluster0.abcde.mongodb.net/final?retryWrites=true"
        dirty_uri = f" '{inner_uri}' "
        cleaned, diag = sanitize_and_normalize_mongodb_uri(dirty_uri)
        self.assertEqual(cleaned, inner_uri)
        self.assertTrue(diag["had_whitespace_or_quotes"])

    def test_placeholder_brackets_detected(self):
        template_uri = "mongodb+srv://<DB_USER>:<DB_PASSWORD>@cluster0.abcde.mongodb.net/?retryWrites=true"
        cleaned, diag = sanitize_and_normalize_mongodb_uri(template_uri)
        self.assertTrue(diag["has_placeholder_brackets"])

    def test_local_uri_preserved(self):
        uri = "mongodb://localhost:27017"
        cleaned, diag = sanitize_and_normalize_mongodb_uri(uri)
        self.assertEqual(cleaned, uri)
        self.assertEqual(diag["masked_uri"], uri)

    def test_custom_query_parameters_preserved(self):
        uri = "mongodb+srv://usr:pwd@cluster0.abcde.mongodb.net/custom_db?readPreference=primaryPreferred&connectTimeoutMS=10000"
        cleaned, diag = sanitize_and_normalize_mongodb_uri(uri)
        self.assertEqual(cleaned, uri)
        self.assertIn("readPreference=primaryPreferred", cleaned)
        self.assertIn("connectTimeoutMS=10000", cleaned)

    def test_masking_never_exposes_passwords(self):
        uri = "mongodb+srv://db_admin:UltraSecret987!@my-cluster.mongodb.net/test?retryWrites=true"
        masked = mask_mongodb_uri(uri)
        self.assertNotIn("UltraSecret987!", masked)
        self.assertIn("db_admin:*****@", masked)

    def test_env_var_resolution_priority(self):
        # MONGODB_URI should take priority over DATABASE_URL
        settings = Settings(
            mongodb_uri="mongodb+srv://user_primary:p1@cluster0.mongodb.net/primary",
            database_url="mongodb+srv://user_secondary:p2@cluster0.mongodb.net/secondary",
            mongodb_db_name="test_db",
        )
        self.assertEqual(
            settings.raw_mongodb_uri,
            "mongodb+srv://user_primary:p1@cluster0.mongodb.net/primary",
        )

    def test_database_url_fallback_resolution(self):
        # When MONGODB_URI is not set, DATABASE_URL is used
        settings = Settings(
            mongodb_uri=None,
            database_url="mongodb+srv://user_render:p_render@cluster0.mongodb.net/render_db",
            mongodb_db_name="test_db",
        )
        self.assertEqual(
            settings.raw_mongodb_uri,
            "mongodb+srv://user_render:p_render@cluster0.mongodb.net/render_db",
        )

    def test_default_fallback_when_no_env_set(self):
        settings = Settings(
            mongodb_uri=None,
            database_url=None,
            mongo_uri=None,
            mongodb_url=None,
        )
        self.assertEqual(settings.raw_mongodb_uri, "mongodb://localhost:27017")


if __name__ == "__main__":
    unittest.main()

