"""
BookMetadataService — top-level orchestrator.
Call get_book_metadata_sync(isbn) from sync code, or `await service.get(isbn)`
from async code. Handles: cache check → parallel fetch → merge → cache write.
"""

import asyncio
import logging

from .cache import cache_book, get_cached_book
from .isbn import InvalidISBN, normalize
from .merger import merge_sources
from .schemas import MergedBookResponse
from .sources import SOURCES

logger = logging.getLogger(__name__)


class BookMetadataService:
    """Async service. Construct once and call `.get(raw_isbn)` per lookup."""

    def __init__(self, sources=None):
        # Allow injecting an alternate source list (tests, A/B), default to the
        # registered tuple in sources/__init__.py.
        self._sources = list(sources if sources is not None else SOURCES)

    async def get(self, raw_isbn: str) -> MergedBookResponse:
        try:
            parsed = normalize(raw_isbn)
        except InvalidISBN as exc:
            return MergedBookResponse(error=str(exc), retryable=False)
        isbn = parsed["isbn_13"]

        # 1. Cache check
        cached = get_cached_book(isbn)
        if cached is not None:
            cached.cached = True
            return cached

        # 2. Parallel fetch from all enabled sources. BookSource.fetch() never
        # raises — it converts internal errors to SourceResult(error=...).
        enabled = [s for s in self._sources if s.enabled]
        if not enabled:
            logger.warning("No enabled sources to query for ISBN %s", isbn)
            return MergedBookResponse(
                error=f"No metadata sources available for ISBN {isbn}.",
                retryable=False,
            )

        logger.info("Fetching metadata for ISBN %s from %d sources", isbn, len(enabled))
        results = await asyncio.gather(*(s.fetch(isbn) for s in enabled))

        # 3. Build the {source_name: NormalizedBook|None} dict the merger expects.
        raw_sources = {r.source: r.normalized for r in results}

        # 4. If every source missed, return a retryable error.
        if all(book is None for book in raw_sources.values()):
            logger.warning("No data found for ISBN %s from any source", isbn)
            return MergedBookResponse(
                error=f"No metadata found for ISBN {isbn}.",
                retryable=True,
            )

        # 5. Merge.
        merged = await merge_sources(raw_sources)

        # 6. Cache (only if we got something meaningful).
        if merged.title or merged.isbn13:
            cache_book(isbn, merged)

        return merged


def get_book_metadata_sync(isbn: str) -> MergedBookResponse:
    """Blocking wrapper — use only outside of an existing async event loop."""
    return asyncio.run(BookMetadataService().get(isbn))
