from decimal import Decimal
from unittest.mock import patch

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.inventory.models import Author, Book, Category, Product, Publisher
from apps.inventory.services.isbnapi.schemas import MergedBookResponse
from apps.users.models import User


class CatalogAPITests(APITestCase):
    def setUp(self):
        self.books = Category.objects.create(name="Books", slug="books", description="Books category")
        self.soaps = Category.objects.create(name="Soaps", slug="soaps", description="Soaps category")

        self.book_product = Product.objects.create(
            sku="TEST-BOOK-001",
            category=self.books,
            name="Test Book",
            short_description="Test book product",
            description="Book description",
            min_retail_price=Decimal("300.00"),
            max_retail_price=Decimal("350.00"),
            sale_price=Decimal("275.00"),
            stock_quantity=5,
        )
        self.book_product.tags.set(["fiction", "student"])

        self.soap_product = Product.objects.create(
            sku="TEST-SOAP-001",
            category=self.soaps,
            name="Test Soap",
            short_description="Test soap product",
            description="Soap description",
            min_retail_price=Decimal("120.00"),
            max_retail_price=Decimal("140.00"),
            sale_price=Decimal("110.00"),
            stock_quantity=8,
        )
        self.soap_product.tags.set(["organic"])

    def test_products_list_is_paginated(self):
        response = self.client.get(reverse("inventory-products-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("count", response.data)
        self.assertIn("results", response.data)
        self.assertEqual(response.data["count"], 2)

    def test_categories_with_product_count(self):
        response = self.client.get(reverse("inventory-category-with-product-count"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)

        result_by_slug = {row["slug"]: row for row in response.data["results"]}
        self.assertEqual(result_by_slug["books"]["product_count"], 1)
        self.assertEqual(result_by_slug["soaps"]["product_count"], 1)

    def test_tags_with_product_count(self):
        response = self.client.get(reverse("inventory-tag-with-product-count"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)

        result_by_slug = {row["slug"]: row for row in response.data["results"]}
        self.assertEqual(result_by_slug["fiction"]["product_count"], 1)
        self.assertEqual(result_by_slug["student"]["product_count"], 1)
        self.assertEqual(result_by_slug["organic"]["product_count"], 1)

    def test_products_in_category(self):
        response = self.client.get(reverse("inventory-category-products", kwargs={"uuid": self.books.uuid}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["sku"], "TEST-BOOK-001")

    def test_products_in_tag(self):
        response = self.client.get(reverse("inventory-tag-products", kwargs={"slug": "fiction"}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["sku"], "TEST-BOOK-001")

    def test_product_detail_contains_category_and_tags(self):
        response = self.client.get(reverse("inventory-products-detail", kwargs={"uuid": self.book_product.uuid}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["category"]["slug"], "books")
        self.assertIn("fiction", response.data["tags"])
        self.assertTrue(any(tag["slug"] == "fiction" for tag in response.data["tag_details"]))

    def test_graphql_tags_query(self):
        response = self.client.post(
            reverse("graphql"),
            {
                "query": "query Tags($page:Int,$pageSize:Int){ tagsWithProductCount(page:$page,pageSize:$pageSize){ count results { slug product_count } } }",
                "variables": {"page": 1, "pageSize": 5},
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("data", response.data)
        payload = response.data["data"]["tagsWithProductCount"]
        self.assertEqual(payload["count"], 3)


class MeAPIErrorFormatTests(APITestCase):
    def setUp(self):
        self.primary_user = User.objects.create_user(
            email="primary@example.com",
            username="primary-user",
            full_name="Primary User",
            password="testpass123",
            pfs_role="CUSTOMER",
        )
        self.existing_user = User.objects.create_user(
            email="existing@example.com",
            username="taken-username",
            full_name="Existing User",
            password="testpass123",
            pfs_role="CUSTOMER",
        )
        self.client.force_authenticate(self.primary_user)

    def test_me_patch_duplicate_username_returns_standardized_error(self):
        response = self.client.patch(
            reverse("auth-me"),
            {"username": self.existing_user.username},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)
        self.assertIn("errors", response.data)
        self.assertEqual(response.data["status_code"], status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.data["errors"])


class SellerPlanLockAndUpiStatusTests(APITestCase):
    def test_seller_plan_locks_after_first_change(self):
        seller = User.objects.create_user(
            email="seller-lock@example.com",
            username="seller-lock",
            full_name="Seller Lock",
            password="testpass123",
            pfs_role="SELLER",
            plan="SMART_SELL",
            plan_locked=False,
        )
        self.client.force_authenticate(seller)

        response = self.client.patch(reverse("auth-me"), {"plan": "DONATE_50"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        seller.refresh_from_db()
        self.assertEqual(seller.plan, "DONATE_50")
        self.assertTrue(seller.plan_locked)

        response = self.client.patch(reverse("auth-me"), {"plan": "SELF_SELL"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("plan", response.data.get("errors", {}))

    def test_non_seller_plan_not_restricted_by_plan_locked_flag(self):
        customer = User.objects.create_user(
            email="customer-plan@example.com",
            username="customer-plan",
            full_name="Customer Plan",
            password="testpass123",
            pfs_role="CUSTOMER",
            plan="SMART_SELL",
            plan_locked=True,
        )
        self.client.force_authenticate(customer)

        response = self.client.patch(reverse("auth-me"), {"plan": "DONATE_100"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        customer.refresh_from_db()
        self.assertEqual(customer.plan, "DONATE_100")

    def test_admin_can_update_locked_seller_plan_via_admin_endpoint(self):
        seller = User.objects.create_user(
            email="seller-admin-edit@example.com",
            username="seller-admin-edit",
            full_name="Seller Admin Edit",
            password="testpass123",
            pfs_role="SELLER",
            plan="SMART_SELL",
            plan_locked=True,
        )
        admin = User.objects.create_user(
            email="admin-plan@example.com",
            username="admin-plan",
            full_name="Admin User",
            password="testpass123",
            pfs_role="ADMIN",
            is_staff=True,
            is_superuser=True,
        )
        self.client.force_authenticate(admin)

        response = self.client.patch(
            reverse("admin-users-detail", kwargs={"uuid": seller.uuid}),
            {"plan": "DONATE_100"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        seller.refresh_from_db()
        self.assertEqual(seller.plan, "DONATE_100")
        self.assertTrue(seller.plan_locked)

    def test_me_includes_upi_verified_status(self):
        user = User.objects.create_user(
            email="upi-status@example.com",
            username="upi-status",
            full_name="UPI Status",
            password="testpass123",
            pfs_role="SELLER",
            upi_id="seller@upi",
            upi_verified=True,
        )
        self.client.force_authenticate(user)

        response = self.client.get(reverse("auth-me"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"]["upi_id"], "seller@upi")
        self.assertTrue(response.data["user"]["upi_verified"])


class AuthorPublisherCatalogAPITests(APITestCase):
    def setUp(self):
        self.books = Category.objects.create(name="Books AP", slug="books-ap", description="Books category for AP tests")
        self.author = Author.objects.create(name="Author AP")
        self.publisher = Publisher.objects.create(name="Publisher AP", description="Publisher for AP tests")

        self.book = Book.objects.create(
            sku="TEST-AP-BOOK-001",
            category=self.books,
            name="Author Publisher Test Book",
            short_description="Test author/publisher mapping",
            description="Test author/publisher mapping",
            min_retail_price=Decimal("250.00"),
            max_retail_price=Decimal("300.00"),
            sale_price=Decimal("220.00"),
            stock_quantity=4,
            publisher=self.publisher,
            isbn_10="1111111111",
            isbn_13="9781111111111",
            page_count=220,
        )
        self.book.authors.set([self.author])

    def test_authors_with_product_count(self):
        response = self.client.get(reverse("inventory-author-with-product-count"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)
        result_by_name = {row["name"]: row for row in response.data["results"]}
        self.assertEqual(result_by_name["Author AP"]["product_count"], 1)

    def test_publishers_with_product_count(self):
        response = self.client.get(reverse("inventory-publisher-with-product-count"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)
        result_by_name = {row["name"]: row for row in response.data["results"]}
        self.assertEqual(result_by_name["Publisher AP"]["product_count"], 1)

    def test_graphql_publishers_query(self):
        response = self.client.post(
            reverse("graphql"),
            {
                "query": "query Publishers($page:Int,$pageSize:Int){ publishersWithProductCount(page:$page,pageSize:$pageSize){ count results { name product_count } } }",
                "variables": {"page": 1, "pageSize": 10},
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("data", response.data)
        payload = response.data["data"]["publishersWithProductCount"]
        self.assertGreaterEqual(payload["count"], 1)

    def test_product_detail_includes_book_details(self):
        response = self.client.get(reverse("inventory-products-detail", kwargs={"uuid": self.book.uuid}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["product_type"], "BOOK")
        self.assertIsNotNone(response.data["book_details"])
        self.assertEqual(response.data["book_details"]["publisher"]["name"], "Publisher AP")


class SellerCatalogAPITests(APITestCase):
    def setUp(self):
        self.category = Category.objects.create(name="Seller Catalog", slug="seller-catalog", description="Seller category")
        self.seller = User.objects.create_user(
            email="seller-catalog@example.com",
            username="seller-catalog",
            full_name="Seller Catalog",
            password="testpass123",
            pfs_role="SELLER",
        )
        self.other_seller = User.objects.create_user(
            email="other-seller@example.com",
            username="other-seller",
            full_name="Other Seller",
            password="testpass123",
            pfs_role="SELLER",
        )

        self.seller_product = Product.objects.create(
            seller=self.seller,
            sku="SELLER-CAT-001",
            category=self.category,
            name="Seller Product One",
            short_description="Seller product",
            description="Seller product",
            min_retail_price=Decimal("100.00"),
            max_retail_price=Decimal("140.00"),
            sale_price=Decimal("95.00"),
            stock_quantity=5,
            is_active=True,
        )
        Product.objects.create(
            seller=self.other_seller,
            sku="SELLER-CAT-002",
            category=self.category,
            name="Other Seller Product",
            short_description="Other product",
            description="Other product",
            min_retail_price=Decimal("120.00"),
            max_retail_price=Decimal("150.00"),
            sale_price=Decimal("110.00"),
            stock_quantity=4,
            is_active=True,
        )

    def test_sellers_with_product_count(self):
        response = self.client.get(reverse("inventory-seller-with-product-count"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)
        result_by_uuid = {row["uuid"]: row for row in response.data["results"]}
        self.assertEqual(result_by_uuid[str(self.seller.uuid)]["product_count"], 1)
        self.assertEqual(result_by_uuid[str(self.other_seller.uuid)]["product_count"], 1)

    def test_products_by_seller(self):
        response = self.client.get(reverse("inventory-seller-products", kwargs={"uuid": self.seller.uuid}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["uuid"], str(self.seller_product.uuid))


class MyInventoryAPITests(APITestCase):
    def setUp(self):
        self.seller_1 = User.objects.create_user(
            email="seller1@example.com",
            username="seller-1",
            full_name="Seller One",
            password="testpass123",
            pfs_role="SELLER",
            plan="SELF_SELL",
        )
        self.seller_2 = User.objects.create_user(
            email="seller2@example.com",
            username="seller-2",
            full_name="Seller Two",
            password="testpass123",
            pfs_role="SELLER",
        )
        self.books_category = Category.objects.create(name="Books MY", slug="books-my", description="Books category")
        self.soap_category = Category.objects.create(name="Soap MY", slug="soap-my", description="Soap category")
        self.publisher = Publisher.objects.create(name="My Publisher", description="Publisher for My Inventory")
        self.author = Author.objects.create(name="My Author")

        self.seller_1_book = Book.objects.create(
            seller=self.seller_1,
            sku="MY-INV-BOOK-001",
            category=self.books_category,
            name="My Seller Book",
            short_description="Book owned by seller 1",
            description="Book owned by seller 1",
            min_retail_price=Decimal("150.00"),
            max_retail_price=Decimal("180.00"),
            sale_price=Decimal("140.00"),
            stock_quantity=3,
            publisher=self.publisher,
            isbn_10="1111111111",
            isbn_13="9781111111111",
            page_count=120,
        )
        self.seller_1_book.authors.set([self.author])

        Product.objects.create(
            seller=self.seller_2,
            sku="MY-INV-BOOK-002",
            category=self.books_category,
            name="Other Seller Product",
            short_description="Item owned by seller 2",
            description="Item owned by seller 2",
            min_retail_price=Decimal("80.00"),
            max_retail_price=Decimal("100.00"),
            sale_price=Decimal("75.00"),
            stock_quantity=5,
        )

        self.client.force_authenticate(self.seller_1)

    def test_list_returns_only_logged_in_seller_items(self):
        response = self.client.get(reverse("my-inventory-products-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["uuid"], str(self.seller_1_book.uuid))

    def test_create_auto_assigns_seller(self):
        payload = {
            "name": "Created via API",
            "category_uuid": str(self.books_category.uuid),
            "min_retail_price": "120.00",
            "max_retail_price": "150.00",
            "sale_price": "110.00",
            "stock_quantity": 2,
        }
        response = self.client.post(reverse("my-inventory-products-list"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created = Product.objects.get(uuid=response.data["uuid"])
        self.assertEqual(created.seller_id, self.seller_1.id)

    def test_search_matches_isbn_author_publisher(self):
        for term in ("9781111111111", "My Author", "My Publisher"):
            response = self.client.get(reverse("my-inventory-products-list"), {"search": term})
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response.data["count"], 1)

    def test_create_persists_book_metadata(self):
        payload = {
            "name": "Metadata Book",
            "category_uuid": str(self.books_category.uuid),
            "min_retail_price": "200.00",
            "max_retail_price": "250.00",
            "sale_price": "190.00",
            "isbn_10_input": "0123456789",
            "isbn_13_input": "9780123456789",
            "author_name_input": "Author A, Author B",
            "publisher_name_input": "Publisher Meta",
            "book_language_input": "en",
            "book_edition_input": "2nd",
            "cover_type_input": "Paperback",
            "page_count_input": 321,
            "published_year_input": 2022,
        }
        response = self.client.post(reverse("my-inventory-products-list"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created_product = Product.objects.get(uuid=response.data["uuid"])
        self.assertTrue(hasattr(created_product, "book"))
        self.assertEqual(created_product.book.isbn_10, "0123456789")
        self.assertEqual(created_product.book.isbn_13, "9780123456789")
        self.assertEqual(created_product.book.book_language, "en")
        self.assertEqual(created_product.book.book_edition, "2nd")
        self.assertEqual(created_product.book.cover_type, "Paperback")
        self.assertEqual(created_product.book.page_count, 321)
        self.assertEqual(created_product.book.published_year, 2022)
        self.assertEqual(created_product.book.publisher.name, "Publisher Meta")
        self.assertEqual(created_product.book.authors.count(), 2)

    def test_book_inventory_exposes_quality_choices(self):
        payload = {
            "name": "Quality Book",
            "category_uuid": str(self.books_category.uuid),
            "min_retail_price": "200.00",
            "max_retail_price": "250.00",
            "sale_price": "190.00",
            "quality": "NEW",
            "stock_quantity": 1,
        }
        response = self.client.post(reverse("my-inventory-products-list"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["product_type"], "BOOK")
        self.assertEqual(response.data["quality"], "NEW")
        self.assertEqual(response.data["quality_label"], "New")
        self.assertTrue(any(choice["id"] == "NEW" for choice in response.data["quality_choices"]))
        created_book = Book.objects.get(uuid=response.data["uuid"])
        self.assertEqual(created_book.quality, "NEW")
        self.assertEqual(created_book.quality_note, "")

    def test_non_book_inventory_clears_quality_fields(self):
        payload = {
            "name": "Soap Quality",
            "category_uuid": str(self.soap_category.uuid),
            "min_retail_price": "80.00",
            "max_retail_price": "100.00",
            "sale_price": "75.00",
            "quality": "USED_ACCEPTABLE",
            "quality_note": "Should be ignored for soap",
            "stock_quantity": 3,
        }
        response = self.client.post(reverse("my-inventory-products-list"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created_product = Product.objects.get(uuid=response.data["uuid"])
        self.assertEqual(response.data["product_type"], "SOAP")
        self.assertEqual(response.data["quality"], "")
        self.assertEqual(response.data["quality_note"], "")
        self.assertEqual(response.data["quality_label"], "")
        self.assertEqual(response.data["quality_choices"], [])
        self.assertFalse(hasattr(created_product, "book"))
        self.assertFalse(Book.objects.filter(uuid=response.data["uuid"]).exists())

    def test_non_self_sell_plan_cannot_create_inventory(self):
        self.seller_1.plan = "SMART_SELL"
        self.seller_1.save(update_fields=["plan", "updated_on"])

        payload = {
            "name": "Blocked Create",
            "category_uuid": str(self.books_category.uuid),
            "min_retail_price": "120.00",
            "max_retail_price": "150.00",
            "sale_price": "110.00",
            "stock_quantity": 2,
        }
        response = self.client.post(reverse("my-inventory-products-list"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_self_sell_plan_cannot_update_inventory(self):
        self.seller_1.plan = "DONATE_50"
        self.seller_1.save(update_fields=["plan", "updated_on"])

        response = self.client.patch(
            reverse("my-inventory-products-detail", kwargs={"uuid": self.seller_1_book.uuid}),
            {"name": "Blocked Update"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.seller_1_book.refresh_from_db()
        self.assertEqual(self.seller_1_book.name, "My Seller Book")

    def test_non_self_sell_plan_cannot_delete_inventory(self):
        self.seller_1.plan = "DONATE_100"
        self.seller_1.save(update_fields=["plan", "updated_on"])

        response = self.client.delete(reverse("my-inventory-products-detail", kwargs={"uuid": self.seller_1_book.uuid}))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.seller_1_book.refresh_from_db()
        self.assertFalse(self.seller_1_book.is_archived)

    def test_self_sell_delete_soft_deletes_inventory(self):
        self.seller_1.plan = "SELF_SELL"
        self.seller_1.save(update_fields=["plan", "updated_on"])

        response = self.client.delete(reverse("my-inventory-products-detail", kwargs={"uuid": self.seller_1_book.uuid}))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.seller_1_book.refresh_from_db()
        self.assertTrue(self.seller_1_book.is_archived)


class InventoryMetadataFetchAPITests(APITestCase):
    def setUp(self):
        self.seller = User.objects.create_user(
            email="meta-seller@example.com",
            username="meta-seller",
            full_name="Meta Seller",
            password="testpass123",
            pfs_role="SELLER",
        )
        self.client.force_authenticate(self.seller)

    def test_requires_isbn_query_param(self):
        response = self.client.get(reverse("inventory-isbn-fetch"))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("isbn", response.data["errors"])

    @patch("apps.api.views.get_book_metadata_sync")
    def test_returns_provider_payload(self, mock_fetch):
        # Matilda - Roald Dahl. Real ISBN with valid checksum.
        mock_fetch.return_value = MergedBookResponse(
            title="Sample Title",
            authors=["Author One"],
            isbn10="0140328726",
            isbn13="9780140328721",
            publisher="Publisher One",
            published_date="2020",
            description="Sample full description",
            page_count=240,
            language="en",
            thumbnail="https://example.com/cover.jpg",
            sources=["openlibrary"],
        )

        response = self.client.get(reverse("inventory-isbn-fetch"), {"isbn": "978-0-14-032872-1"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["source"], "openlibrary")
        self.assertEqual(response.data["book"]["title"], "Sample Title")
        self.assertEqual(response.data["book"]["published_year"], 2020)
        self.assertEqual(response.data["book"]["isbn_13"], "9780140328721")

    @patch("apps.api.views.get_book_metadata_sync")
    def test_returns_404_when_metadata_not_found(self, mock_fetch):
        mock_fetch.return_value = MergedBookResponse(error="No metadata found.", retryable=True)
        response = self.client.get(reverse("inventory-isbn-fetch"), {"isbn": "9780140328721"})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIsNone(response.data["book"])

    def test_returns_400_for_invalid_checksum(self):
        # Last digit changed from valid 9780140328721. Old regex allowed this through;
        # new stdnum-backed normalize rejects it as a checksum failure.
        response = self.client.get(reverse("inventory-isbn-fetch"), {"isbn": "9780140328722"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("isbn", response.data["errors"])
