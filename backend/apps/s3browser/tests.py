from unittest.mock import patch

from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.users.models import User


class S3BrowserTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="s3-admin@example.com",
            username="s3-admin",
            full_name="S3 Admin",
            password="testpass123",
            pfs_role="ADMIN",
            is_staff=True,
        )
        self.client.force_authenticate(self.user)

    @override_settings(
        PHOTO_STORAGE_BACKEND="bunny",
        AWS_S3_BUCKET_NAME="demo-bucket",
        AWS_S3_REGION_NAME="ap-south-1",
    )
    @patch("apps.s3browser.views.get_s3_client")
    def test_s3_browser_lists_objects_and_folders(self, mock_get_s3_client):
        mock_client = mock_get_s3_client.return_value
        mock_client.list_objects_v2.return_value = {
            "IsTruncated": False,
            "Contents": [
                {
                    "Key": "uploads/photos/2026/report.pdf",
                    "Size": 1234,
                    "ETag": '"etag-1"',
                    "StorageClass": "STANDARD",
                    "LastModified": timezone.now(),
                },
                {
                    "Key": "uploads/photos/2026/empty.txt",
                    "Size": 0,
                    "ETag": '"etag-0"',
                    "StorageClass": "STANDARD",
                    "LastModified": timezone.now(),
                },
            ],
        }

        response = self.client.get(
            reverse("s3-browser-list"),
            {"dir": "uploads/photos/"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["bucket"], "demo-bucket")
        self.assertTrue(any(item["full_path"] == "uploads/photos/2026/report.pdf" for item in response.data["results"]))
        self.assertTrue(any(item["full_path"] == "uploads/photos/2026/empty.txt" for item in response.data["results"]))
        self.assertTrue(any(item["size_bytes"] == 0 for item in response.data["results"]))

    @override_settings(
        PHOTO_STORAGE_BACKEND="bunny",
        AWS_S3_BUCKET_NAME="demo-bucket",
        AWS_S3_REGION_NAME="ap-south-1",
    )
    @patch("apps.s3browser.views.get_s3_client")
    def test_s3_browser_detail_returns_head_metadata(self, mock_get_s3_client):
        mock_client = mock_get_s3_client.return_value
        mock_client.head_object.return_value = {
            "ContentLength": 2048,
            "ContentType": "application/pdf",
            "ETag": '"etag-2"',
            "StorageClass": "STANDARD",
            "LastModified": timezone.now(),
            "CacheControl": "max-age=3600",
            "ContentDisposition": "inline",
            "ContentEncoding": "utf-8",
            "ContentLanguage": "en",
            "Expires": timezone.now(),
            "Metadata": {"author": "team"},
        }

        response = self.client.get(
            reverse("s3-browser-detail"),
            {"key": "uploads/photos/2026/report.pdf"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["bucket"], "demo-bucket")
        self.assertEqual(response.data["data"]["full_path"], "uploads/photos/2026/report.pdf")
        self.assertEqual(response.data["data"]["content_type"], "application/pdf")
        self.assertEqual(response.data["data"]["metadata"], {"author": "team"})
