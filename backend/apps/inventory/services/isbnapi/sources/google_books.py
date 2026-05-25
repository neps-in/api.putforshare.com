"""Google Books API source.

Docs: https://developers.google.com/books/docs/v1/reference/volumes/list
Free tier: 1K/day without a key, 100K/day with a free Google Cloud key.
"""

import logging
from typing import Optional

import httpx
from django.conf import settings
from ratelimit import limits

from ..schemas import NormalizedBook
from .base import BookSource, retry_transient

logger = logging.getLogger(__name__)

TIMEOUT_SECONDS = 5
URL = "https://www.googleapis.com/books/v1/volumes"


# Google's documented quota is 1000/day unauthenticated, 100K/day with key.
# Per-process 100 calls / 100 seconds is a conservative burst cap; the source
# raises RateLimitException when crossed and base.fetch() logs it.
@limits(calls=100, period=100)
def _check_quota() -> None:
    pass


class GoogleBooksSource(BookSource):
    name = "google_books"
    priority = 10
    enabled = True

    async def _do_fetch(
        self, isbn_13: str,
    ) -> tuple[Optional[NormalizedBook], dict, Optional[int], list[dict]]:
        _check_quota()
        return await self._fetch_with_retry(isbn_13)

    @retry_transient
    async def _fetch_with_retry(
        self, isbn_13: str,
    ) -> tuple[Optional[NormalizedBook], dict, Optional[int], list[dict]]:
        api_key = str(getattr(settings, "GOOGLE_BOOKS_API_KEY", "") or "").strip()
        params: dict[str, str] = {"q": f"isbn:{isbn_13}"}
        if api_key:
            params["key"] = api_key

        async with httpx.AsyncClient() as client:
            response = await client.get(URL, params=params, timeout=TIMEOUT_SECONDS)
            response.raise_for_status()
            data = response.json()

        http_status = response.status_code
        items = data.get("items") or []
        if not items:
            return None, data, http_status, []

        info = items[0].get("volumeInfo", {}) or {}
        identifiers = info.get("industryIdentifiers") or []
        isbn10 = next((i.get("identifier") for i in identifiers if i.get("type") == "ISBN_10"), None)
        isbn13 = next((i.get("identifier") for i in identifiers if i.get("type") == "ISBN_13"), None)

        image_links = info.get("imageLinks") or {}
        cover_urls: list[dict] = []
        for size_hint in ("extraLarge", "large", "medium", "small", "thumbnail", "smallThumbnail"):
            url = image_links.get(size_hint)
            if url:
                cover_urls.append({"url": url.replace("http://", "https://"), "size_hint": size_hint})

        thumbnail = cover_urls[0]["url"] if cover_urls else None

        normalized = NormalizedBook(
            title=info.get("title"),
            authors=info.get("authors") or [],
            isbn10=isbn10,
            isbn13=isbn13,
            publisher=info.get("publisher"),
            published_date=info.get("publishedDate"),
            description=info.get("description"),
            page_count=info.get("pageCount"),
            categories=info.get("categories") or [],
            language=info.get("language"),
            thumbnail=thumbnail,
            preview_link=info.get("previewLink"),
            source=self.name,
        )
        return normalized, items[0], http_status, cover_urls
