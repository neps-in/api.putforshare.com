from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .services import clear_language_cache


class LanguageLookupAPITests(APITestCase):
    def setUp(self):
        clear_language_cache()

    def tearDown(self):
        clear_language_cache()

    def test_languages_endpoint_returns_languages_array(self):
        response = self.client.get(reverse("lookup-languages"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertGreater(len(response.data), 0)

        first_item = response.data[0]
        self.assertIn("id", first_item)
        self.assertIn("name", first_item)
        self.assertIn("code", first_item)
