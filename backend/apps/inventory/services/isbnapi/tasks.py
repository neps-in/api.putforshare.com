"""Celery tasks for the ISBN metadata resolver.

Three tasks:

    enrich_isbn_task(isbn, force_refresh=False)
        Resolve metadata for one ISBN. If a Book row exists for that ISBN
        (matched by isbn_13 or isbn_10), persist the merged result onto it.
        Used by the POST /api/v1/books/enrich/ endpoint and the periodic
        refresh_stale_books_task.

    refresh_stale_books_task()
        Daily sweep: find Books with no last_fetched_at OR last_fetched_at
        older than 365 days and enqueue enrich_isbn_task for each.

    cleanup_not_found_cache_task()
        Weekly sweep: purge ISBNNotFoundCache rows whose last_attempt_at is
        older than 180 days. Lets previously-given-up ISBNs re-enter the
        cascade naturally without manual intervention.

Tasks are auto-discovered by Celery because `apps/inventory/tasks.py` imports
this module at the bottom — `autodiscover_tasks()` only scans `<app>/tasks.py`,
not nested service packages.
"""

import logging
from datetime import timedelta

import structlog
from celery import shared_task
from django.db.models import Avg, Count, Q
from django.utils import timezone

from apps.inventory.models import Book, ISBNLookupLog, ISBNNotFoundCache

from .persistence import persist_merged_book
from .service import get_book_metadata_sync

logger = logging.getLogger(__name__)
struct_log = structlog.get_logger("isbn_resolver")

# Re-fetch a Book that hasn't been touched by the resolver in this long.
STALE_REFRESH_DAYS = 365

# Drop ISBNNotFoundCache rows whose last attempt was this long ago.
# Even "never"-retry rows expire — if the resolver gave up 6 months ago, a
# fresh attempt is reasonable next time someone asks.
NOT_FOUND_PURGE_DAYS = 180

# Drop ISBNLookupLog audit rows older than this. The table grows unboundedly
# (one row per source per cascade attempt), and rows older than ~3 months
# rarely matter for live debugging. 90 days is enough for trend analysis and
# post-incident forensics without keeping the table at multi-million-row scale.
LOOKUP_LOG_PURGE_DAYS = 90


@shared_task(
    bind=True,
    name="apps.inventory.services.isbnapi.tasks.enrich_isbn_task",
    max_retries=3,
    default_retry_delay=60,
    acks_late=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
)
def enrich_isbn_task(self, isbn: str, force_refresh: bool = False) -> dict:
    """Resolve metadata for one ISBN and persist to a matching Book row if any.

    Returns a JSON-serializable dict summarizing the outcome:

        {
            "isbn": <isbn_13 or input>,
            "found": <bool: did the cascade return usable data>,
            "book_id": <int|None: matched Book row, if one exists>,
            "confidence": <int: 0-100 metadata_quality_score>,
            "sources": <list[str]: contributing source names>,
            "error": <str|None>,
        }
    """
    merged = get_book_metadata_sync(isbn, force_refresh=force_refresh)

    book = None
    if merged.isbn13 or merged.isbn10:
        book = Book.objects.filter(
            Q(isbn_13=merged.isbn13 or "") | Q(isbn_10=merged.isbn10 or "")
        ).first()
        if book is not None:
            persist_merged_book(book, merged)
            logger.info("enrich_isbn_task: enriched Book #%s for ISBN %s", book.id, isbn)
        else:
            logger.info("enrich_isbn_task: no Book row matches ISBN %s (resolved cache only)", isbn)

    return {
        "isbn": merged.isbn13 or isbn,
        "found": bool(merged.title or merged.isbn13) and not merged.error,
        "book_id": book.id if book is not None else None,
        "confidence": merged.confidence,
        "sources": merged.sources,
        "error": merged.error,
    }


@shared_task(
    name="apps.inventory.services.isbnapi.tasks.refresh_stale_books_task",
    acks_late=True,
)
def refresh_stale_books_task() -> dict:
    """Daily sweep: enqueue enrich_isbn_task for every Book past its stale window.

    A Book counts as stale if its `last_fetched_at` is older than 365 days OR
    is NULL (never enriched). Books without an isbn_13 are skipped — there's
    nothing to resolve.

    Returns a summary dict: {"enqueued": N, "skipped_no_isbn": M}.
    """
    cutoff = timezone.now() - timedelta(days=STALE_REFRESH_DAYS)
    queryset = (
        Book.objects
        .filter(Q(last_fetched_at__lt=cutoff) | Q(last_fetched_at__isnull=True))
        .exclude(isbn_13="")
        .only("id", "isbn_13")
    )
    enqueued = 0
    for book in queryset.iterator(chunk_size=200):
        enrich_isbn_task.delay(book.isbn_13)
        enqueued += 1
    logger.info("refresh_stale_books_task: enqueued %d enrichments", enqueued)
    return {"enqueued": enqueued, "stale_cutoff": cutoff.isoformat()}


@shared_task(
    name="apps.inventory.services.isbnapi.tasks.cleanup_not_found_cache_task",
    acks_late=True,
)
def cleanup_not_found_cache_task() -> dict:
    """Weekly sweep: drop ISBNNotFoundCache rows older than 180 days.

    Includes "never"-retry rows (retry_after=year 9999): if the resolver gave
    up on an ISBN 6 months ago, letting it try again is cheap insurance against
    permanently-suppressed ISBNs that have since become catalogued.
    """
    cutoff = timezone.now() - timedelta(days=NOT_FOUND_PURGE_DAYS)
    deleted, _ = ISBNNotFoundCache.objects.filter(last_attempt_at__lt=cutoff).delete()
    logger.info("cleanup_not_found_cache_task: deleted %d rows older than %s", deleted, cutoff.isoformat())
    return {"deleted": deleted, "cutoff": cutoff.isoformat()}


@shared_task(
    name="apps.inventory.services.isbnapi.tasks.daily_isbn_metrics_task",
    acks_late=True,
)
def daily_isbn_metrics_task() -> dict:
    """Daily rollup: aggregate the last 24h of ISBNLookupLog + Book.last_fetched_at.

    Emits a single `isbn.daily_metrics` structlog event with:
      - total_lookups: row count in ISBNLookupLog over the window
      - distinct_isbns: unique ISBNs in the window
      - new_books_enriched: Books whose last_fetched_at falls in the window
      - per_source: list of {source, total, hits, misses, errors, success_rate, avg_latency_ms}

    The PRD's "covers downloaded" line is intentionally omitted — covers are
    deferred to the existing product-image system, not the resolver.
    """
    cutoff = timezone.now() - timedelta(hours=24)
    window = ISBNLookupLog.objects.filter(created_on__gte=cutoff)

    total_lookups = window.count()
    distinct_isbns = window.values("isbn").distinct().count()
    new_books = Book.objects.filter(last_fetched_at__gte=cutoff).count()

    per_source_qs = window.values("source").annotate(
        total=Count("id"),
        hits=Count("id", filter=Q(status="hit")),
        misses=Count("id", filter=Q(status="miss")),
        errors=Count("id", filter=Q(status="error")),
        rate_limited=Count("id", filter=Q(status="rate_limited")),
        avg_latency_ms=Avg("latency_ms"),
    ).order_by("source")
    per_source = []
    for row in per_source_qs:
        total = row["total"] or 0
        per_source.append({
            "source": row["source"],
            "total": total,
            "hits": row["hits"],
            "misses": row["misses"],
            "errors": row["errors"],
            "rate_limited": row["rate_limited"],
            "success_rate": round((row["hits"] / total) * 100, 1) if total else 0.0,
            "avg_latency_ms": round(row["avg_latency_ms"] or 0, 1),
        })

    metrics = {
        "window_hours": 24,
        "window_start": cutoff.isoformat(),
        "total_lookups": total_lookups,
        "distinct_isbns": distinct_isbns,
        "new_books_enriched": new_books,
        "per_source": per_source,
    }
    struct_log.info("isbn.daily_metrics", **metrics)
    return metrics


@shared_task(
    name="apps.inventory.services.isbnapi.tasks.cleanup_isbn_lookup_log_task",
    acks_late=True,
)
def cleanup_isbn_lookup_log_task() -> dict:
    """Weekly sweep: drop ISBNLookupLog audit rows older than 90 days.

    The table receives one row per source per cascade attempt (so a typical
    successful lookup with 4 sources writes 4 rows). Without pruning the
    table grows unboundedly. 90 days keeps enough history for trend analysis
    and post-incident forensics; older rows are deleted in a single SQL DELETE.
    """
    cutoff = timezone.now() - timedelta(days=LOOKUP_LOG_PURGE_DAYS)
    deleted, _ = ISBNLookupLog.objects.filter(created_on__lt=cutoff).delete()
    logger.info("cleanup_isbn_lookup_log_task: deleted %d rows older than %s", deleted, cutoff.isoformat())
    return {"deleted": deleted, "cutoff": cutoff.isoformat()}
