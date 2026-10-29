import os
import unittest
from unittest.mock import patch

from app.core.config import Settings
from app.core.db_uri import mask_mongodb_uri, sanitize_and_normalize_mongodb_uri


class TestMongoDBURINormalization(unittest.TestCase):
    """
    Safe test suite verifying URI parsing, credential preservation,
    and diagnostic generation without exposing or hardcoding any real secrets.
    """

    def test_standard_atlas_uri_ensures_auth_source_admin(self):
        uri = "mongodb+srv://cluster_user:MySecurePassword123@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority"
        cleaned, diag = sanitize_and_normalize_mongodb_uri(uri)
        # authSource=admin must be present for Atlas
        self.assertIn("authSource=admin", cleaned)
        self.assertEqual(diag["auth_source"], "admin")
        self.assertNotIn("MySecurePassword123", diag["masked_uri"])

    def test_atlas_uri_with_database_in_path_appends_auth_source(self):
        uri = "mongodb+srv://user_a:P%2Bss%40word%25123@cluster0.abcde.mongodb.net/final?retryWrites=true"
        cleaned, diag = sanitize_and_normalize_mongodb_uri(uri)
        self.assertIn("authSource=admin", cleaned)
        self.assertEqual(diag["database_path"], "final")
        self.assertEqual(diag["auth_source"], "admin")

    def test_atlas_uri_preserves_explicit_auth_source(self):
        uri = "mongodb+srv://usr:pwd@cluster0.abcde.mongodb.net/final?authSource=customAuth&retryWrites=true"
        cleaned, diag = sanitize_and_normalize_mongodb_uri(uri)
        self.assertIn("authSource=customAuth", cleaned)
        self.assertEqual(diag["auth_source"], "customAuth")

    def test_already_url_encoded_credentials_not_corrupted(self):
        uri = "mongodb+srv://user_a:P%2Bss%40word%25123%23@cluster0.abcde.mongodb.net/final?retryWrites=true"
        cleaned, diag = sanitize_and_normalize_mongodb_uri(uri)
        self.assertIn("P%2Bss%40word%25123%23", cleaned)
        self.assertIn("*****", diag["masked_uri"])

    def test_password_with_literal_plus_sign_escapes_for_pymongo(self):
        # A literal + must be escaped to %2B so PyMongo does not decode it into a space
        uri = "mongodb+srv://user_b:Pass+Word+123@cluster0.abcde.mongodb.net/final?retryWrites=true"
        cleaned, diag = sanitize_and_normalize_mongodb_uri(uri)
        self.assertIn("Pass%2BWord%2B123", cleaned)
        self.assertNotIn(" ", cleaned)

    def test_password_with_literal_at_sign_escapes_for_pymongo(self):
        # An unescaped @ in password must be escaped to %40
        uri = "mongodb+srv://user_c:My@Pass@cluster0.abcde.mongodb.net/final?retryWrites=true"
        cleaned, diag = sanitize_and_normalize_mongodb_uri(uri)
        self.assertIn("My%40Pass", cleaned)

    def test_surrounding_quotes_and_whitespace_stripped(self):
        inner_uri = "mongodb+srv://app_user:somePass99@cluster0.abcde.mongodb.net/final?retryWrites=true"
        dirty_uri = f'  "{inner_uri}" \n'
        cleaned, diag = sanitize_and_normalize_mongodb_uri(dirty_uri)
        self.assertTrue(diag["had_whitespace_or_quotes"])
        self.assertNotIn('"', cleaned)
        self.assertNotIn(' ', cleaned)

    def test_placeholder_brackets_detected(self):
        template_uri = "mongodb+srv://<DB_USER>:<DB_PASSWORD>@cluster0.abcde.mongodb.net/?retryWrites=true"
        cleaned, diag = sanitize_and_normalize_mongodb_uri(template_uri)
        self.assertTrue(diag["has_placeholder_brackets"])

    def test_local_uri_preserved_without_auth_source_injection(self):
        uri = "mongodb://localhost:27017"
        cleaned, diag = sanitize_and_normalize_mongodb_uri(uri)
        self.assertEqual(cleaned, uri)
        self.assertEqual(diag["masked_uri"], uri)
        self.assertEqual(diag["scheme"], "mongodb")

    def test_masking_never_exposes_passwords(self):
        uri = "mongodb+srv://db_admin:UltraSecret987!@my-cluster.mongodb.net/test?retryWrites=true"
        masked = mask_mongodb_uri(uri)
        self.assertNotIn("UltraSecret987!", masked)
        self.assertIn("db_admin:*****@", masked)

    def test_diagnostics_structure(self):
        uri = "mongodb+srv://db_user:SecretPass123@cluster0.abcde.mongodb.net/final?retryWrites=true"
        _, diag = sanitize_and_normalize_mongodb_uri(uri, selected_var="MONGODB_URI", other_vars=["DATABASE_URL"])
        self.assertEqual(diag["selected_var"], "MONGODB_URI")
        self.assertEqual(diag["other_configured_vars"], ["DATABASE_URL"])
        self.assertEqual(diag["host"], "cluster0.abcde.mongodb.net")
        self.assertEqual(diag["database_path"], "final")
        self.assertTrue(diag["has_username"])
        self.assertTrue(diag["has_password"])
        self.assertEqual(diag["password_length"], len("SecretPass123"))
        self.assertFalse(diag["has_placeholder_brackets"])
        self.assertNotIn("SecretPass123", str(diag))

    def test_env_var_resolution_priority(self):
        # MONGODB_URI should take priority over DATABASE_URL
        settings = Settings(
            mongodb_uri="mongodb+srv://user_primary:p1@cluster0.mongodb.net/primary",
            database_url="mongodb+srv://user_secondary:p2@cluster0.mongodb.net/secondary",
            mongodb_db_name="test_db",
        )
        self.assertEqual(settings.selected_mongodb_env_var, "MONGODB_URI")
        self.assertIn("user_primary", settings.raw_mongodb_uri)

    def test_database_url_fallback_resolution(self):
        # When MONGODB_URI is not set, DATABASE_URL is used
        settings = Settings(
            mongodb_uri=None,
            database_url="mongodb+srv://user_render:p_render@cluster0.mongodb.net/render_db",
            mongodb_db_name="test_db",
        )
        self.assertEqual(settings.selected_mongodb_env_var, "DATABASE_URL")
        self.assertIn("user_render", settings.raw_mongodb_uri)

    def test_ignore_non_mongodb_database_url(self):
        # When DATABASE_URL is postgresql, it is ignored in favor of fallback or valid mongodb var
        settings = Settings(
            mongodb_uri=None,
            database_url="postgresql://postgres:secret@localhost:5432/mydb",
            mongodb_db_name="test_db",
        )
        # Should not pick postgresql as a valid mongodb env var
        self.assertEqual(settings.selected_mongodb_env_var, "DATABASE_URL")
        # But raw_mongodb_uri returns the string for user visibility/diagnostics
        self.assertEqual(settings.mongodb_diagnostics["is_valid"], False)

    def test_default_fallback_when_no_env_set(self):
        settings = Settings(
            mongodb_uri=None,
            database_url=None,
            mongo_uri=None,
            mongodb_url=None,
        )
        self.assertEqual(settings.selected_mongodb_env_var, "fallback_localhost")
        self.assertEqual(settings.raw_mongodb_uri, "mongodb://localhost:27017")


if __name__ == "__main__":
    unittest.main()
