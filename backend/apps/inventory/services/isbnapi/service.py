"""
BookMetadataService — top-level orchestrator.
Call get_book_metadata_sync(isbn) from sync code, or `await service.get(isbn)`
from async code. Handles: cache check → suppression check → parallel fetch →
merge → cache write + suppression bookkeeping.

Emits structured events via structlog at every decision point (cache hit,
suppression hit, cascade complete, all-miss). Event names are stable and
namespaced under "isbn." for grep/filtering.
"""

import asyncio
import logging
import time

import structlog
from asgiref.sync import sync_to_async

from .cache import cache_book, get_cached_book, invalidate_book
from .isbn import InvalidISBN, normalize
from .merger import merge_sources
from . import not_found_cache
from .schemas import MergedBookResponse
from .sources import SOURCES

logger = logging.getLogger(__name__)
struct_log = structlog.get_logger("isbn_resolver")

# Async wrappers for the ORM-backed suppression helpers (DB ops are sync).
_get_suppression_async = sync_to_async(not_found_cache.get_suppression)
_record_miss_async = sync_to_async(not_found_cache.record_miss)
_clear_not_found_async = sync_to_async(not_found_cache.clear)


class BookMetadataService:
    """Async service. Construct once and call `.get(raw_isbn)` per lookup."""

    def __init__(self, sources=None):
        # Allow injecting an alternate source list (tests, A/B), default to the
        # registered tuple in sources/__init__.py.
        self._sources = list(sources if sources is not None else SOURCES)

    async def get(self, raw_isbn: str, force_refresh: bool = False) -> MergedBookResponse:
        """Resolve metadata for `raw_isbn`. See module docstring for event grammar."""
        t0 = time.monotonic()
        try:
            parsed = normalize(raw_isbn)
        except InvalidISBN as exc:
            struct_log.info("isbn.invalid_input", raw=raw_isbn, error=str(exc))
            return MergedBookResponse(error=str(exc), retryable=False)
        isbn = parsed["isbn_13"]
        isbn_10 = parsed.get("isbn_10")

        # 1. Filesystem cache check (skipped on force_refresh)
        if not force_refresh:
            cached = get_cached_book(isbn)
            if cached is not None:
                cached.cached = True
                struct_log.info(
                    "isbn.cache_hit",
                    isbn=isbn,
                    quality_score=cached.confidence,
                    sources=cached.sources,
                    latency_ms=int((time.monotonic() - t0) * 1000),
                )
                return cached

        # 1.5. ISBNNotFoundCache check — skip on force_refresh (admins/operators
        # need a way to retry a suppressed ISBN before the backoff expires).
        if not force_refresh:
            suppression = await _get_suppression_async(isbn)
            if suppression is not None:
                struct_log.info(
                    "isbn.suppressed",
                    isbn=isbn,
                    attempts=suppression.attempts,
                    retry_after=suppression.retry_after.isoformat(),
                    latency_ms=int((time.monotonic() - t0) * 1000),
                )
                return MergedBookResponse(
                    isbn13=isbn,
                    isbn10=isbn_10,
                    error=(
                        f"No metadata found for ISBN {isbn} "
                        f"(suppressed; attempts={suppression.attempts}, "
                        f"retry after {suppression.retry_after.isoformat()})."
                    ),
                    retryable=False,
                )

        # 2. Parallel fetch from all enabled sources. BookSource.fetch() never
        # raises — it converts internal errors to SourceResult(error=...).
        enabled = [s for s in self._sources if s.enabled]
        if not enabled:
            struct_log.warning("isbn.no_sources_enabled", isbn=isbn)
            return MergedBookResponse(
                error=f"No metadata sources available for ISBN {isbn}.",
                retryable=False,
            )

        results = await asyncio.gather(*(s.fetch(isbn) for s in enabled))

        # 3. Build the {source_name: NormalizedBook|None} dict the merger expects.
        raw_sources = {r.source: r.normalized for r in results}
        contributing = sum(1 for v in raw_sources.values() if v is not None)

        # 4. If every source missed, record the miss in ISBNNotFoundCache.
        if contributing == 0:
            invalidate_book(isbn)
            row = await _record_miss_async(isbn)
            struct_log.warning(
                "isbn.all_miss",
                isbn=isbn,
                sources_called=len(enabled),
                attempts=row.attempts,
                retry_after=row.retry_after.isoformat(),
                force_refresh=force_refresh,
                latency_ms=int((time.monotonic() - t0) * 1000),
            )
            return MergedBookResponse(
                isbn13=isbn,
                isbn10=isbn_10,
                error=(
                    f"No metadata found for ISBN {isbn} "
                    f"(attempt #{row.attempts}; next retry after {row.retry_after.isoformat()})."
                ),
                retryable=True,
            )

        # 5. Merge.
        merged = await merge_sources(raw_sources)

        # 5a. Ensure the queried ISBN forms are populated.
        if not merged.isbn13:
            merged.isbn13 = isbn
        if not merged.isbn10 and isbn_10:
            merged.isbn10 = isbn_10

        # 5b. Clear any previous suppression.
        await _clear_not_found_async(isbn)

        # 6. Cache.
        if merged.title or merged.isbn13:
            cache_book(isbn, merged)

        struct_log.info(
            "isbn.cascade_complete",
            isbn=isbn,
            cache_hit=False,
            force_refresh=force_refresh,
            sources_called=len(enabled),
            sources_contributing=contributing,
            quality_score=merged.confidence,
            latency_ms=int((time.monotonic() - t0) * 1000),
        )
        return merged


def get_book_metadata_sync(isbn: str, force_refresh: bool = False) -> MergedBookResponse:
    """Blocking wrapper — use only outside of an existing async event loop.

    `force_refresh=True` bypasses the FS cache + suppression — see
    BookMetadataService.get() for details.
    """
    return asyncio.run(BookMetadataService().get(isbn, force_refresh=force_refresh))
