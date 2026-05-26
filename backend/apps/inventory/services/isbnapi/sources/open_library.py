"""Open Library API source.

Docs: https://openlibrary.org/dev/docs/api/books
Polite cap: ~100 req/min (PRD §13).
"""

import logging
from typing import Optional

import httpx
from ratelimit import limits

from ..schemas import NormalizedBook
from .base import DEFAULT_HEADERS, BookSource, retry_transient

logger = logging.getLogger(__name__)

TIMEOUT_SECONDS = 5
URL = "https://openlibrary.org/api/books"


@limits(calls=100, period=60)
def _check_quota() -> None:
    pass


class OpenLibrarySource(BookSource):
    name = "open_library"
    priority = 20
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
        params = {
            "bibkeys": f"ISBN:{isbn_13}",
            "format": "json",
            "jscmd": "data",
        }
        async with httpx.AsyncClient(headers=DEFAULT_HEADERS) as client:
            response = await client.get(URL, params=params, timeout=TIMEOUT_SECONDS)
            response.raise_for_status()
            data = response.json()

        http_status = response.status_code
        key = f"ISBN:{isbn_13}"
        info = data.get(key)
        if not info:
            return None, data, http_status, []

        authors = [a.get("name") for a in info.get("authors", []) if a.get("name")]
        categories = [s.get("name") for s in info.get("subjects", []) if s.get("name")]

        cover = info.get("cover") or {}
        cover_urls: list[dict] = []
        for size_hint in ("large", "medium", "small"):
            url = cover.get(size_hint)
            if url:
                cover_urls.append({"url": url, "size_hint": size_hint})
        thumbnail = cover_urls[0]["url"] if cover_urls else None

        identifiers = info.get("identifiers") or {}
        isbn10_list = identifiers.get("isbn_10") or []
        isbn13_list = identifiers.get("isbn_13") or []

        publishers = info.get("publishers") or []
        publisher = publishers[0].get("name") if publishers else None

        normalized = NormalizedBook(
            title=info.get("title"),
            subtitle=info.get("subtitle"),
            authors=authors,
            isbn10=isbn10_list[0] if isbn10_list else None,
            isbn13=isbn13_list[0] if isbn13_list else None,
            publisher=publisher,
            published_date=info.get("publish_date"),
            description=None,  # Open Library /data endpoint rarely carries description
            page_count=info.get("number_of_pages"),
            categories=categories,
            language=None,
            thumbnail=thumbnail,
            preview_link=info.get("url"),
            source=self.name,
        )
        return normalized, info, http_status, cover_urls
