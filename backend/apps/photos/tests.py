from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.photos.models import Photo
from apps.users.models import User


PNG_1X1 = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDAT\x08\xd7c\xf8\xff\xff?"
    b"\x00\x05\xfe\x02\xfeA\xa8\xdd\x9a\x00\x00\x00\x00IEND\xaeB`\x82"
)


class PhotoUploadTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="photo-admin@example.com",
            username="photo-admin",
            full_name="Photo Admin",
            password="testpass123",
            pfs_role="ADMIN",
            is_staff=True,
        )
        self.client.force_authenticate(self.user)

    @override_settings(
        PHOTO_STORAGE_BACKEND="bunny",
        BUNNY_STORAGE_ZONE="demo-zone",
        BUNNY_STORAGE_PASSWORD="top-secret",
        BUNNY_STORAGE_ENDPOINT="storage.bunnycdn.com",
        BUNNY_CDN_BASE_URL="https://demo-zone.b-cdn.net",
    )
    @patch("apps.photos.storage.requests.put")
    def test_photo_create_uploads_to_bunny(self, mock_put):
        mock_put.return_value.status_code = 201
        mock_put.return_value.text = ""

        upload = SimpleUploadedFile("cover image.png", PNG_1X1, content_type="image/png")
        response = self.client.post(
            reverse("photos-list"),
            {"file": upload, "alt_tag": "Front cover"},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        photo = Photo.objects.get(uuid=response.data["uuid"])
        self.assertEqual(photo.upload_status, Photo.UploadStatus.UPLOADED)
        self.assertEqual(photo.content_type, "image/png")
        self.assertEqual(photo.width, 1)
        self.assertEqual(photo.height, 1)
        self.assertTrue(photo.storage_key.startswith("uploads/photos/"))
        self.assertEqual(photo.cdn_url, f"https://demo-zone.b-cdn.net/{photo.storage_key}")
        self.assertEqual(photo.uploaded_by, self.user)

        mock_put.assert_called_once()
        request_url = mock_put.call_args.args[0]
        request_headers = mock_put.call_args.kwargs["headers"]
        self.assertIn("/demo-zone/", request_url)
        self.assertEqual(request_headers["AccessKey"], "top-secret")
        self.assertEqual(request_headers["Content-Type"], "image/png")

    @override_settings(PHOTO_STORAGE_BACKEND="bunny")
    def test_presign_upload_rejected_for_bunny_backend(self):
        response = self.client.post(
            reverse("photos-presign-upload"),
            {"file_name": "cover.png", "content_type": "image/png"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Presigned uploads are only available", response.data["detail"])
