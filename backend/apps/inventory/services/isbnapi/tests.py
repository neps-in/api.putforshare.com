"""
Tests for book_metadata app.
Run with: python manage.py test book_metadata
"""

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

from django.test import RequestFactory, TestCase, TransactionTestCase

from apps.inventory.services.isbnapi.isbn import (
    InvalidISBN,
    clean,
    normalize,
    to_isbn10,
    to_isbn13,
    validate,
)
from apps.inventory.services.isbnapi.schemas import NormalizedBook, MergedBookResponse
from apps.inventory.services.isbnapi.sources.base import SourceResult
from apps.inventory.services.isbnapi.validators import (
    is_valid_title, is_valid_authors, is_valid_description,
    is_valid_page_count, is_valid_published_date,
)
from apps.inventory.services.isbnapi.merger import merge_sources, _pick_scalar
from apps.inventory.services.isbnapi.service import BookMetadataService


def _fake_source(name: str, normalized=None) -> MagicMock:
    """Build a mock BookSource that resolves directly to a SourceResult."""
    src = MagicMock()
    src.name = name
    src.enabled = True
    src.fetch = AsyncMock(
        return_value=SourceResult(
            found=normalized is not None,
            normalized=normalized,
            source=name,
            http_status=200 if normalized is not None else 404,
        )
    )
    return src


# ---------------------------------------------------------------------------
# ISBN normalize (stdnum-backed)
# ---------------------------------------------------------------------------

class ISBNNormalizeTests(TestCase):
    """Covers apps.inventory.services.isbnapi.isbn (PRD Phase 1)."""

    # Matilda - Roald Dahl. Real, in-print, well-known.
    VALID_ISBN10 = "0140328726"
    VALID_ISBN13 = "9780140328721"

    # Order of the Phoenix paperback variant — known-valid ISBN-10 with X check digit.
    X_CHECK_ISBN10 = "043942089X"

    # Synthetic but checksum-valid 979-prefix ISBN-13. No ISBN-10 form exists.
    VALID_ISBN13_979 = "9791000000008"

    def test_valid_isbn10_round_trips(self):
        result = normalize(self.VALID_ISBN10)
        self.assertEqual(result["isbn_10"], self.VALID_ISBN10)
        self.assertEqual(result["isbn_13"], self.VALID_ISBN13)

    def test_valid_isbn13_back_to_isbn10(self):
        result = normalize(self.VALID_ISBN13)
        self.assertEqual(result["isbn_10"], self.VALID_ISBN10)
        self.assertEqual(result["isbn_13"], self.VALID_ISBN13)

    def test_hyphenated_input(self):
        result = normalize("978-0-14-032872-1")
        self.assertEqual(result["isbn_13"], self.VALID_ISBN13)

    def test_isbn_prefix_strip(self):
        result = normalize("ISBN: 978-0-14-032872-1")
        self.assertEqual(result["isbn_13"], self.VALID_ISBN13)

    def test_lowercase_x_check_digit(self):
        result = normalize("043942089x")
        self.assertEqual(result["isbn_10"], self.X_CHECK_ISBN10)

    def test_invalid_checksum_raises(self):
        # Same as VALID_ISBN13 but last digit changed.
        with self.assertRaises(InvalidISBN):
            normalize("9780140328722")

    def test_empty_string_raises(self):
        with self.assertRaises(InvalidISBN):
            normalize("")

    def test_whitespace_only_raises(self):
        with self.assertRaises(InvalidISBN):
            normalize("   ")

    def test_garbage_raises(self):
        with self.assertRaises(InvalidISBN):
            normalize("not-an-isbn")

    def test_979_prefix_has_no_isbn10(self):
        result = normalize(self.VALID_ISBN13_979)
        self.assertEqual(result["isbn_13"], self.VALID_ISBN13_979)
        self.assertIsNone(result["isbn_10"])

    def test_validate_returns_bool(self):
        self.assertTrue(validate(self.VALID_ISBN13))
        self.assertTrue(validate(self.VALID_ISBN10))
        self.assertFalse(validate("9780140328722"))
        self.assertFalse(validate(""))

    def test_clean_strips_prefix_punct_and_uppercases_x(self):
        self.assertEqual(clean("ISBN: 978-0-14-032872-1"), self.VALID_ISBN13)
        self.assertEqual(clean("isbn:9780140328721"), self.VALID_ISBN13)
        self.assertEqual(clean("043942089x"), self.X_CHECK_ISBN10)
        self.assertEqual(clean(""), "")
        self.assertEqual(clean("   "), "")

    def test_to_isbn13_passthrough(self):
        self.assertEqual(to_isbn13(self.VALID_ISBN10), self.VALID_ISBN13)
        self.assertEqual(to_isbn13(self.VALID_ISBN13), self.VALID_ISBN13)

    def test_to_isbn10_for_979_returns_none(self):
        self.assertIsNone(to_isbn10(self.VALID_ISBN13_979))


# ---------------------------------------------------------------------------
# Validators
# ---------------------------------------------------------------------------

class ValidatorTests(TestCase):
    def test_title_valid(self):
        self.assertTrue(is_valid_title("Dune"))

    def test_title_empty(self):
        self.assertFalse(is_valid_title(""))
        self.assertFalse(is_valid_title(None))

    def test_authors_valid(self):
        self.assertTrue(is_valid_authors(["Frank Herbert"]))

    def test_authors_unknown(self):
        self.assertFalse(is_valid_authors(["Unknown"]))
        self.assertFalse(is_valid_authors([]))

    def test_description_too_short(self):
        self.assertFalse(is_valid_description("Short"))

    def test_description_placeholder(self):
        self.assertFalse(is_valid_description("No description available"))

    def test_description_valid(self):
        self.assertTrue(is_valid_description("A sweeping science fiction epic set on a desert planet."))

    def test_page_count_valid(self):
        self.assertTrue(is_valid_page_count(412))

    def test_page_count_zero(self):
        self.assertFalse(is_valid_page_count(0))

    def test_page_count_too_large(self):
        self.assertFalse(is_valid_page_count(99999))

    def test_published_date_year_only(self):
        self.assertTrue(is_valid_published_date("1965"))

    def test_published_date_full(self):
        self.assertTrue(is_valid_published_date("1965-08-01"))

    def test_published_date_invalid(self):
        self.assertFalse(is_valid_published_date("not-a-date"))


# ---------------------------------------------------------------------------
# Merger
# ---------------------------------------------------------------------------

class MergerTests(TestCase):
    def _make_google(self, **kwargs) -> NormalizedBook:
        defaults = dict(
            title="Dune", authors=["Frank Herbert"],
            isbn13="9780340960196", publisher="Hodder",
            published_date="1965", description="A sweeping science fiction epic about the desert planet Arrakis.",
            page_count=412, categories=["Science Fiction"],
            language="en", thumbnail="https://books.google.com/cover.jpg",
            preview_link="https://books.google.com/preview", source="google_books",
        )
        defaults.update(kwargs)
        return NormalizedBook(**defaults)

    def _make_isbndb(self, **kwargs) -> NormalizedBook:
        defaults = dict(
            title="Dune", authors=["Frank Herbert"],
            isbn13="9780340960196", publisher="Hodder & Stoughton",
            published_date="1965-01-01", description=None,
            page_count=None, categories=[],
            language="en", thumbnail="https://images.isbndb.com/cover.jpg",
            preview_link=None, source="isbndb",
        )
        defaults.update(kwargs)
        return NormalizedBook(**defaults)

    def test_merge_uses_google_title(self):
        sources = {
            "google_books": self._make_google(title="Dune (Google)"),
            "open_library": None,
            "isbndb": self._make_isbndb(title="Dune (ISBNDB)"),
        }
        value, source = _pick_scalar("title", sources)
        self.assertEqual(value, "Dune (Google)")
        self.assertEqual(source, "google_books")

    def test_merge_falls_back_when_google_title_missing(self):
        sources = {
            "google_books": self._make_google(title=None),
            "open_library": None,
            "isbndb": self._make_isbndb(title="Dune (ISBNDB)"),
        }
        value, source = _pick_scalar("title", sources)
        self.assertEqual(value, "Dune (ISBNDB)")
        self.assertEqual(source, "isbndb")

    def test_field_origins_tracks_per_field_source(self):
        # Google contributes editorial fields; Open Library contributes publisher.
        google = self._make_google(
            title="Dune (Google)",
            publisher=None,  # force fallback to Open Library
        )

        async def _make_openlib():
            return NormalizedBook(
                title=None,
                authors=[],
                isbn13="9780340960196",
                publisher="Hodder Open Library",
                published_date=None,
                description=None,
                page_count=None,
                categories=[],
                language=None,
                thumbnail=None,
                preview_link=None,
                source="open_library",
            )

        sources = {
            "google_books": google,
            "open_library": asyncio.run(_make_openlib()),
            "isbndb": None,
        }

        async def run():
            with patch(
                "apps.inventory.services.isbnapi.merger.is_valid_thumbnail",
                new=AsyncMock(return_value=True),
            ):
                return await merge_sources(sources)

        result = asyncio.run(run())

        # Google wins title per FIELD_PRIORITY.
        self.assertEqual(result.title, "Dune (Google)")
        self.assertEqual(result.field_origins["title"], "google_books")
        # Open Library wins publisher because Google's publisher was None.
        self.assertEqual(result.publisher, "Hodder Open Library")
        self.assertEqual(result.field_origins["publisher"], "open_library")
        # Fields nobody supplied stay out of field_origins (neither source had isbn10).
        self.assertNotIn("isbn10", result.field_origins)

    def test_full_merge_produces_merged_response(self):
        sources = {
            "google_books": self._make_google(),
            "open_library": None,
            "isbndb": self._make_isbndb(),
        }
        # Patch thumbnail validator to avoid real HTTP
        async def run():
            with patch("apps.inventory.services.isbnapi.merger.is_valid_thumbnail", new=AsyncMock(return_value=True)):
                return await merge_sources(sources)

        result = asyncio.run(run())
        self.assertIsInstance(result, MergedBookResponse)
        self.assertEqual(result.title, "Dune")
        self.assertIn("google_books", result.sources)
        self.assertGreater(result.confidence, 0)

    def test_all_sources_none_returns_empty(self):
        sources = {"google_books": None, "open_library": None, "isbndb": None}

        async def run():
            with patch("apps.inventory.services.isbnapi.merger.is_valid_thumbnail", new=AsyncMock(return_value=False)):
                return await merge_sources(sources)

        result = asyncio.run(run())
        self.assertIsNone(result.title)
        self.assertEqual(result.confidence, 0)


# ---------------------------------------------------------------------------
# Service — integration-level with mocked fetchers
# ---------------------------------------------------------------------------

class ServiceTests(TestCase):
    # Dune by Frank Herbert. Real, checksum-valid ISBN-13.
    DUNE_ISBN13 = "9780340960196"

    def _run(self, coro):
        return asyncio.run(coro)

    def _dune(self) -> NormalizedBook:
        return NormalizedBook(
            title="Dune",
            authors=["Frank Herbert"],
            isbn13=self.DUNE_ISBN13,
            description="Sci-fi classic set on the desert planet Arrakis.",
            page_count=412,
            thumbnail="https://books.google.com/cover.jpg",
            source="google_books",
        )

    def test_returns_merged_response(self):
        sources = [
            _fake_source("google_books", normalized=self._dune()),
            _fake_source("open_library", normalized=None),
            _fake_source("isbndb", normalized=None),
        ]
        with patch("apps.inventory.services.isbnapi.merger.is_valid_thumbnail", new=AsyncMock(return_value=True)), \
             patch("apps.inventory.services.isbnapi.service.get_cached_book", return_value=None), \
             patch("apps.inventory.services.isbnapi.service.cache_book"):
            service = BookMetadataService(sources=sources)
            result = self._run(service.get(self.DUNE_ISBN13))
        self.assertEqual(result.title, "Dune")
        self.assertIsNone(result.error)
        for src in sources:
            src.fetch.assert_awaited_once_with(self.DUNE_ISBN13)

    def test_invalid_isbn_returns_error(self):
        result = self._run(BookMetadataService(sources=[]).get("not-valid"))
        self.assertIsNotNone(result.error)
        self.assertFalse(result.retryable)

    def test_cache_hit_skips_fetch(self):
        cached = MergedBookResponse(title="Cached Dune", confidence=90)
        source = _fake_source("google_books", normalized=self._dune())
        with patch("apps.inventory.services.isbnapi.service.get_cached_book", return_value=cached):
            service = BookMetadataService(sources=[source])
            result = self._run(service.get(self.DUNE_ISBN13))
        source.fetch.assert_not_awaited()
        self.assertEqual(result.title, "Cached Dune")
        self.assertTrue(result.cached)

    def test_all_sources_fail_returns_retryable_error(self):
        sources = [
            _fake_source("google_books", normalized=None),
            _fake_source("open_library", normalized=None),
            _fake_source("isbndb", normalized=None),
        ]
        with patch("apps.inventory.services.isbnapi.service.get_cached_book", return_value=None):
            service = BookMetadataService(sources=sources)
            result = self._run(service.get(self.DUNE_ISBN13))
        self.assertIsNotNone(result.error)
        self.assertTrue(result.retryable)

    def test_no_enabled_sources_returns_error(self):
        disabled = _fake_source("isbndb", normalized=None)
        disabled.enabled = False
        with patch("apps.inventory.services.isbnapi.service.get_cached_book", return_value=None):
            service = BookMetadataService(sources=[disabled])
            result = self._run(service.get(self.DUNE_ISBN13))
        self.assertIsNotNone(result.error)
        self.assertFalse(result.retryable)
        disabled.fetch.assert_not_awaited()


# ---------------------------------------------------------------------------
# BookSource base class — error handling + ISBNLookupLog persistence
# ---------------------------------------------------------------------------

class BookSourceBaseTests(TransactionTestCase):
    """Verify BookSource.fetch() converts exceptions to SourceResults and logs to DB.

    Uses TransactionTestCase (not TestCase) so async ORM writes via
    sync_to_async are visible to test assertions — TestCase wraps each test
    in a transaction whose connection isn't shared with the thread that
    sync_to_async dispatches to.
    """

    DUNE_ISBN13 = "9780340960196"

    def _run(self, coro):
        return asyncio.run(coro)

    def _make_source(self, name: str, behavior):
        """Build a BookSource subclass whose _do_fetch runs `behavior(isbn)`."""
        from apps.inventory.services.isbnapi.sources.base import BookSource

        async def _do_fetch(self, isbn_13):
            return await behavior(isbn_13)

        cls = type(
            "_TestSource",
            (BookSource,),
            {"name": name, "enabled": True, "_do_fetch": _do_fetch},
        )
        return cls()

    def test_hit_returns_found_result_and_logs_hit(self):
        from apps.inventory.models import ISBNLookupLog

        async def behavior(isbn_13):
            return (
                NormalizedBook(title="Dune", isbn13=isbn_13, source="probe"),
                {"raw": "ok"},
                200,
                [{"url": "https://example.com/cover.jpg", "size_hint": "large"}],
            )

        source = self._make_source("probe", behavior)
        result = self._run(source.fetch(self.DUNE_ISBN13))

        self.assertTrue(result.found)
        self.assertEqual(result.normalized.title, "Dune")
        self.assertEqual(result.http_status, 200)
        log = ISBNLookupLog.objects.get(source="probe", isbn=self.DUNE_ISBN13)
        self.assertEqual(log.status, "hit")
        self.assertEqual(log.http_status, 200)

    def test_miss_returns_not_found_and_logs_miss(self):
        from apps.inventory.models import ISBNLookupLog

        async def behavior(isbn_13):
            return None, {}, 404, []

        source = self._make_source("probe", behavior)
        result = self._run(source.fetch(self.DUNE_ISBN13))

        self.assertFalse(result.found)
        self.assertIsNone(result.normalized)
        log = ISBNLookupLog.objects.get(source="probe", isbn=self.DUNE_ISBN13)
        self.assertEqual(log.status, "miss")

    def test_exception_returns_error_result_and_logs_error(self):
        from apps.inventory.models import ISBNLookupLog

        async def behavior(isbn_13):
            raise RuntimeError("boom")

        source = self._make_source("probe", behavior)
        result = self._run(source.fetch(self.DUNE_ISBN13))

        self.assertFalse(result.found)
        self.assertEqual(result.error, "boom")
        log = ISBNLookupLog.objects.get(source="probe", isbn=self.DUNE_ISBN13)
        self.assertEqual(log.status, "error")
        self.assertEqual(log.error, "boom")

    def test_rate_limit_exception_logs_rate_limited(self):
        from ratelimit import RateLimitException

        from apps.inventory.models import ISBNLookupLog

        async def behavior(isbn_13):
            raise RateLimitException("quota exceeded", 60)

        source = self._make_source("probe", behavior)
        result = self._run(source.fetch(self.DUNE_ISBN13))

        self.assertEqual(result.error, "rate_limited")
        log = ISBNLookupLog.objects.get(source="probe", isbn=self.DUNE_ISBN13)
        self.assertEqual(log.status, "rate_limited")

    def test_disabled_source_short_circuits_without_logging(self):
        from apps.inventory.models import ISBNLookupLog

        async def behavior(isbn_13):
            raise AssertionError("should not be called")

        source = self._make_source("probe", behavior)
        source.enabled = False
        result = self._run(source.fetch(self.DUNE_ISBN13))

        self.assertEqual(result.error, "disabled")
        self.assertFalse(ISBNLookupLog.objects.filter(source="probe").exists())
