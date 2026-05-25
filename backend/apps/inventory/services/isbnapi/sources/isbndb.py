"""ISBNdb (Tier 3, paid) source.

Docs: https://isbndb.com/apidocs/v2
Disabled if ISBNDB_API_KEY is not set in settings.
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
URL_TEMPLATE = "https://api2.isbndb.com/book/{isbn}"


@limits(calls=100, period=60)
def _check_quota() -> None:
    pass


class ISBNdbSource(BookSource):
    name = "isbndb"
    priority = 30  # paid; usually escalation after free tiers

    @property
    def enabled(self) -> bool:
        return bool(str(getattr(settings, "ISBNDB_API_KEY", "") or "").strip())

    async def _do_fetch(
        self, isbn_13: str,
    ) -> tuple[Optional[NormalizedBook], dict, Optional[int], list[dict]]:
        _check_quota()
        return await self._fetch_with_retry(isbn_13)

    @retry_transient
    async def _fetch_with_retry(
        self, isbn_13: str,
    ) -> tuple[Optional[NormalizedBook], dict, Optional[int], list[dict]]:
        api_key = str(getattr(settings, "ISBNDB_API_KEY", "") or "").strip()
        headers = {"Authorization": api_key, "Accept": "application/json"}
        async with httpx.AsyncClient() as client:
            response = await client.get(
                URL_TEMPLATE.format(isbn=isbn_13),
                headers=headers,
                timeout=TIMEOUT_SECONDS,
            )
            if response.status_code == 404:
                # ISBNdb returns 404 for unknown ISBNs; treat as miss, not error.
                return None, {}, 404, []
            response.raise_for_status()
            data = response.json()

        http_status = response.status_code
        info = data.get("book") or {}
        if not info:
            return None, data, http_status, []

        authors = info.get("authors") or []
        if isinstance(authors, str):
            authors = [authors]

        subjects = info.get("subjects") or []
        categories = [s for s in subjects if isinstance(s, str)]

        thumbnail = info.get("image") or None
        cover_urls = [{"url": thumbnail, "size_hint": "large"}] if thumbnail else []

        normalized = NormalizedBook(
            title=info.get("title") or info.get("title_long"),
            authors=authors,
            isbn10=info.get("isbn"),
            isbn13=info.get("isbn13"),
            publisher=info.get("publisher"),
            published_date=info.get("date_published"),
            description=info.get("synopsis"),
            page_count=info.get("pages"),
            categories=categories,
            language=info.get("language"),
            thumbnail=thumbnail,
            preview_link=None,
            source=self.name,
        )
        return normalized, info, http_status, cover_urls
