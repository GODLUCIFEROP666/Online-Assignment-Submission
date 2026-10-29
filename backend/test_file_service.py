import asyncio
import io
import os
import sys
from pathlib import Path
from unittest import IsolatedAsyncioTestCase, main

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from starlette.datastructures import UploadFile
from app.db.session import init_db, mongodb_manager, get_mongodb_db
from app.services.file_service import store_upload, load_stored_file, gridfs_bucket, uploads_dir

class TestFileServiceGridFS(IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        await init_db()
        self.db = await get_mongodb_db()

    async def asyncTearDown(self):
        mongodb_manager.close_db()

    async def test_gridfs_persistence_without_local_disk(self):
        # 1. Prepare sample binary content
        test_content = b"This is a test submission content for GridFS persistence verification.\nLine 2.\nLine 3."
        test_filename = "sample_test_assignment.txt"
        
        file_obj = io.BytesIO(test_content)
        upload = UploadFile(filename=test_filename, file=file_obj, size=len(test_content))
        upload.headers = {"content-type": "text/plain"}

        # 2. Store upload using store_upload
        result = await store_upload(self.db, upload, max_bytes=10 * 1024 * 1024)
        self.assertIsNotNone(result.get("gridfs_id"), "GridFS ID must be generated")
        self.assertIsNotNone(result.get("file_name"), "Generated file name must not be None")
        
        file_name = result["file_name"]
        gridfs_id = result["gridfs_id"]

        # 3. Simulate ephemeral container restart: intentionally delete the local file if written
        local_path = uploads_dir() / file_name
        if local_path.exists():
            local_path.unlink()
        self.assertFalse(local_path.exists(), "Local cached file must be deleted to test pure GridFS retrieval")

        # 4. Retrieve file purely from GridFS via load_stored_file
        loaded = await load_stored_file(self.db, file_name=file_name, gridfs_id=gridfs_id)
        self.assertIsNotNone(loaded, "Must successfully retrieve file from GridFS")
        self.assertEqual(loaded["content"], test_content, "Retrieved content must match uploaded content exactly")
        
        # 5. Clean up the test file from GridFS
        bucket = gridfs_bucket(self.db)
        await bucket.delete(gridfs_id)
        print("\n[SUCCESS] GridFS stored and retrieved binary file perfectly with 0 local disk dependency.")

if __name__ == "__main__":
    import unittest
    unittest.main()
