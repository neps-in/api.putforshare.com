"""Tests for the cover image pipeline."""

import asyncio
import io
from unittest.mock import AsyncMock, MagicMock, patch

from django.test import TestCase, override_settings
from PIL import Image

from apps.photos.covers.fetcher import (
    fetch_best_cover,
    sort_candidates,
)
from apps.photos.covers.pipeline import process_and_upload_covers
from apps.photos.covers.placeholder import (
    DEFAULT_COVER_STORAGE_KEY,
    default_cover_url,
)
from apps.photos.covers.processor import (
    CoverVariant,
    OUTPUT_FORMATS,
    SIZE_DIMENSIONS,
    process_cover,
)
from apps.photos.covers.storage import (
    build_cdn_url,
    build_cover_storage_key,
    upload_to_bunny,
)


def _make_jpeg(width: int = 1200, height: int = 1800, color=(200, 50, 50)) -> bytes:
    """Synthetic in-memory JPEG of the requested size."""
    img = Image.new("RGB", (width, height), color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()


def _run(coro):
    return asyncio.run(coro)


# ---------------------------------------------------------------------------
# placeholder.py + storage.py path helpers
# ---------------------------------------------------------------------------

@override_settings(BUNNY_CDN_HOSTNAME="pfs-store.b-cdn.net")
class PlaceholderAndPathTests(TestCase):
    def test_default_cover_url_uses_cdn_hostname(self):
        self.assertEqual(
            default_cover_url(),
            "https://pfs-store.b-cdn.net/covers/default-book-cover.jpg",
        )

    def test_default_cover_storage_key_constant(self):
        self.assertEqual(DEFAULT_COVER_STORAGE_KEY, "covers/default-book-cover.jpg")

    def test_build_cover_storage_key_shards_by_first_three_isbn_digits(self):
        self.assertEqual(
            build_cover_storage_key("9780140328721", "thumbnail", "webp"),
            "covers/978/9780140328721/thumbnail.webp",
        )

    def test_build_cdn_url_quotes_path_segments(self):
        url = build_cdn_url("covers/978/9780140328721/large.jpeg")
        self.assertEqual(url, "https://pfs-store.b-cdn.net/covers/978/9780140328721/large.jpeg")


# ---------------------------------------------------------------------------
# storage.upload_to_bunny - mocks the httpx client
# ---------------------------------------------------------------------------

@override_settings(
    BUNNY_STORAGE_ZONE="pfs-book-assets",
    BUNNY_STORAGE_ACCESS_KEY="test-access-key",
    BUNNY_STORAGE_ENDPOINT="storage.bunnycdn.com",
    BUNNY_CDN_HOSTNAME="pfs-store.b-cdn.net",
)
class StorageUploadTests(TestCase):
    def _patch_client(self, status_code: int = 201):
        response = MagicMock()
        response.status_code = status_code
        response.text = "OK"
        client_instance = MagicMock()
        client_instance.put = AsyncMock(return_value=response)
        client_cm = MagicMock()
        client_cm.__aenter__ = AsyncMock(return_value=client_instance)
        client_cm.__aexit__ = AsyncMock(return_value=None)
        return patch(
            "apps.photos.covers.storage.httpx.AsyncClient",
            return_value=client_cm,
        ), client_instance

    def test_upload_puts_bytes_with_access_key_header(self):
        patcher, client_instance = self._patch_client()
        with patcher:
            url = _run(
                upload_to_bunny(
                    "covers/978/9780140328721/thumbnail.webp",
                    b"fake-webp-bytes",
                    "image/webp",
                )
            )

        self.assertEqual(
            url,
            "https://pfs-store.b-cdn.net/covers/978/9780140328721/thumbnail.webp",
        )
        client_instance.put.assert_awaited_once()
        args, kwargs = client_instance.put.call_args
        self.assertEqual(
            args[0],
            "https://storage.bunnycdn.com/pfs-book-assets/covers/978/9780140328721/thumbnail.webp",
        )
        self.assertEqual(kwargs["headers"]["AccessKey"], "test-access-key")
        self.assertEqual(kwargs["headers"]["Content-Type"], "image/webp")
        self.assertEqual(kwargs["content"], b"fake-webp-bytes")

    def test_upload_raises_on_non_2xx(self):
        from apps.photos.covers.storage import BunnyUploadError

        patcher, _client_instance = self._patch_client(status_code=500)
        with patcher, self.assertRaises(BunnyUploadError):
            _run(
                upload_to_bunny(
                    "covers/978/9780140328721/thumbnail.webp",
                    b"x",
                    "image/webp",
                )
            )


# ---------------------------------------------------------------------------
# fetcher.fetch_best_cover
# ---------------------------------------------------------------------------

class FetcherTests(TestCase):
    def test_sort_candidates_prefers_extralarge_then_large(self):
        candidates = [
            {"url": "u1", "size_hint": "thumbnail"},
            {"url": "u2", "size_hint": "extraLarge"},
            {"url": "u3", "size_hint": "medium"},
            {"url": "u4", "size_hint": "large"},
        ]
        ordered = sort_candidates(candidates)
        self.assertEqual([c["url"] for c in ordered], ["u2", "u4", "u3", "u1"])

    def _patch_client(self, sequence):
        """sequence: list of either (status_code, content_type, body_bytes) or Exception."""
        responses = []
        for entry in sequence:
            if isinstance(entry, BaseException):
                responses.append(entry)
                continue
            status_code, content_type, body = entry
            resp = MagicMock()
            resp.status_code = status_code
            resp.headers = {"content-type": content_type}
            resp.content = body
            resp.raise_for_status = MagicMock(
                side_effect=None if status_code == 200 else Exception(f"HTTP {status_code}")
            )
            responses.append(resp)

        client_instance = MagicMock()
        client_instance.get = AsyncMock(side_effect=responses)
        client_cm = MagicMock()
        client_cm.__aenter__ = AsyncMock(return_value=client_instance)
        client_cm.__aexit__ = AsyncMock(return_value=None)
        return patch(
            "apps.photos.covers.fetcher.httpx.AsyncClient",
            return_value=client_cm,
        )

    def test_returns_first_valid_image(self):
        good_jpeg = _make_jpeg(width=400, height=600)
        candidates = [
            {"url": "https://example.com/large.jpg", "size_hint": "large"},
            {"url": "https://example.com/thumb.jpg", "size_hint": "thumbnail"},
        ]
        with self._patch_client([(200, "image/jpeg", good_jpeg)]):
            result = _run(fetch_best_cover(candidates))
        self.assertIsNotNone(result)
        content, mime = result
        self.assertEqual(content, good_jpeg)
        self.assertEqual(mime, "image/jpeg")

    def test_skips_too_small_image(self):
        too_small = _make_jpeg(width=50, height=50)
        good = _make_jpeg(width=400, height=600)
        candidates = [
            {"url": "https://a.com/large.jpg", "size_hint": "large"},
            {"url": "https://a.com/medium.jpg", "size_hint": "medium"},
        ]
        with self._patch_client([
            (200, "image/jpeg", too_small),
            (200, "image/jpeg", good),
        ]):
            result = _run(fetch_best_cover(candidates))
        self.assertIsNotNone(result)
        self.assertEqual(result[0], good)

    def test_rejects_non_image_content_type(self):
        candidates = [{"url": "https://x.com/page.html", "size_hint": "large"}]
        with self._patch_client([(200, "text/html", b"<html></html>")]):
            result = _run(fetch_best_cover(candidates))
        self.assertIsNone(result)

    def test_empty_candidates_returns_none(self):
        result = _run(fetch_best_cover([]))
        self.assertIsNone(result)


# ---------------------------------------------------------------------------
# processor.process_cover - real Pillow processing
# ---------------------------------------------------------------------------

class ProcessorTests(TestCase):
    def test_full_size_source_produces_all_sizes_and_formats(self):
        raw = _make_jpeg(width=1500, height=2250)  # bigger than 1200 -> "large" emitted
        variants = process_cover(raw)
        expected_count = len(SIZE_DIMENSIONS) * len(OUTPUT_FORMATS)
        self.assertEqual(len(variants), expected_count)
        produced = {(v.size, v.format) for v in variants}
        for size in SIZE_DIMENSIONS:
            for fmt in OUTPUT_FORMATS:
                self.assertIn((size, fmt), produced)

    def test_skips_large_when_source_below_1200_wide(self):
        raw = _make_jpeg(width=800, height=1200)
        variants = process_cover(raw)
        self.assertTrue(all(v.size != "large" for v in variants))
        self.assertEqual(len(variants), (len(SIZE_DIMENSIONS) - 1) * len(OUTPUT_FORMATS))

    def test_malformed_input_returns_empty_list(self):
        variants = process_cover(b"not-an-image")
        self.assertEqual(variants, [])

    def test_variants_have_correct_canvas_dimensions(self):
        raw = _make_jpeg(width=600, height=900)
        variants = process_cover(raw)
        for v in variants:
            target_w, target_h = SIZE_DIMENSIONS[v.size]
            self.assertEqual((v.width, v.height), (target_w, target_h))

    def test_jpeg_variants_have_image_jpeg_content_type(self):
        raw = _make_jpeg(width=600, height=900)
        variants = process_cover(raw)
        jpeg_variants = [v for v in variants if v.format == "jpeg"]
        self.assertTrue(jpeg_variants)
        for v in jpeg_variants:
            self.assertEqual(v.content_type, "image/jpeg")


# ---------------------------------------------------------------------------
# pipeline.process_and_upload_covers - end-to-end with mocks
# ---------------------------------------------------------------------------

@override_settings(BUNNY_CDN_HOSTNAME="pfs-store.b-cdn.net")
class PipelineTests(TestCase):
    DUNE_ISBN13 = "9780340960196"

    def _variant(self, size: str, format_: str) -> CoverVariant:
        return CoverVariant(
            size=size,
            format=format_,
            content=b"x",
            width=100,
            height=150,
            content_type=f"image/{format_}",
        )

    def test_falls_back_to_default_when_fetcher_returns_none(self):
        with patch(
            "apps.photos.covers.pipeline.fetch_best_cover",
            new=AsyncMock(return_value=None),
        ):
            result = _run(process_and_upload_covers(self.DUNE_ISBN13, []))
        self.assertTrue(result["is_default"])
        self.assertEqual(result["variants"], {})
        self.assertEqual(
            result["default_url"],
            "https://pfs-store.b-cdn.net/covers/default-book-cover.jpg",
        )

    def test_falls_back_to_default_when_processor_produces_nothing(self):
        with patch(
            "apps.photos.covers.pipeline.fetch_best_cover",
            new=AsyncMock(return_value=(b"junk", "image/jpeg")),
        ), patch(
            "apps.photos.covers.pipeline.process_cover",
            return_value=[],
        ):
            result = _run(process_and_upload_covers(self.DUNE_ISBN13, [{"url": "x"}]))
        self.assertTrue(result["is_default"])
        self.assertEqual(result["variants"], {})

    def test_uploads_all_variants_and_returns_url_map(self):
        variants = [
            self._variant("thumbnail", "webp"),
            self._variant("thumbnail", "jpeg"),
            self._variant("small", "webp"),
            self._variant("small", "jpeg"),
        ]

        async def fake_upload(storage_key, content, content_type):
            return f"https://pfs-store.b-cdn.net/{storage_key}"

        with patch(
            "apps.photos.covers.pipeline.fetch_best_cover",
            new=AsyncMock(return_value=(b"raw", "image/jpeg")),
        ), patch(
            "apps.photos.covers.pipeline.process_cover",
            return_value=variants,
        ), patch(
            "apps.photos.covers.pipeline.upload_to_bunny",
            new=AsyncMock(side_effect=fake_upload),
        ):
            result = _run(process_and_upload_covers(self.DUNE_ISBN13, [{"url": "x"}]))

        self.assertFalse(result["is_default"])
        self.assertEqual(set(result["variants"].keys()), {"thumbnail", "small"})
        self.assertEqual(
            result["variants"]["thumbnail"]["webp"],
            f"https://pfs-store.b-cdn.net/covers/978/{self.DUNE_ISBN13}/thumbnail.webp",
        )
        self.assertEqual(
            result["variants"]["small"]["jpeg"],
            f"https://pfs-store.b-cdn.net/covers/978/{self.DUNE_ISBN13}/small.jpeg",
        )

    def test_degrades_to_default_when_every_upload_fails(self):
        with patch(
            "apps.photos.covers.pipeline.fetch_best_cover",
            new=AsyncMock(return_value=(b"raw", "image/jpeg")),
        ), patch(
            "apps.photos.covers.pipeline.process_cover",
            return_value=[self._variant("thumbnail", "webp")],
        ), patch(
            "apps.photos.covers.pipeline.upload_to_bunny",
            new=AsyncMock(side_effect=RuntimeError("Bunny down")),
        ):
            result = _run(process_and_upload_covers(self.DUNE_ISBN13, [{"url": "x"}]))
        self.assertTrue(result["is_default"])
        self.assertEqual(result["variants"], {})
