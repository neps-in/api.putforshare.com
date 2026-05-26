"""Backoff-driven suppression for ISBNs that no source has metadata for.

Pattern (PRD §12.2 / §6.2):

    - Before the cascade: call `is_suppressed(isbn_13)`. If True, the resolver
      short-circuits without hitting any external API.
    - When the cascade returns nothing from any source: call `record_miss(isbn_13)`.
      The first miss creates a row with retry_after = now + 1 day; subsequent
      misses extend the backoff: 1d → 7d → 30d → 90d → never (year 9999).
    - When the cascade returns data from at least one source: call `clear(isbn_13)`.
      A previously-suppressed ISBN that now resolves should not stay suppressed.

All functions are sync; the resolver wraps them with `sync_to_async` because
`BookMetadataService.get()` runs inside an asyncio event loop.
"""

import datetime as _dt
import logging
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from apps.inventory.models import ISBNNotFoundCache

logger = logging.getLogger(__name__)

# Days to wait before each subsequent retry. attempts=1 uses index 0, etc.
# After this list is exhausted, retry_after is set to year 9999 ("never").
BACKOFF_DAYS = [1, 7, 30, 90]
_NEVER = _dt.datetime(9999, 1, 1, tzinfo=_dt.timezone.utc)


def _retry_after_for(attempts: int) -> _dt.datetime:
    """Return the retry_after datetime for a given attempt count (1-indexed)."""
    if attempts <= 0:
        return timezone.now()
    if attempts <= len(BACKOFF_DAYS):
        return timezone.now() + timedelta(days=BACKOFF_DAYS[attempts - 1])
    return _NEVER


def is_suppressed(isbn_13: str) -> bool:
    """True if this ISBN has an active suppression (retry_after in the future)."""
    return ISBNNotFoundCache.objects.filter(
        isbn_13=isbn_13, retry_after__gt=timezone.now()
    ).exists()


def get_suppression(isbn_13: str) -> ISBNNotFoundCache | None:
    """Return the suppression row if active, else None. Useful for richer error messages."""
    return (
        ISBNNotFoundCache.objects
        .filter(isbn_13=isbn_13, retry_after__gt=timezone.now())
        .first()
    )


@transaction.atomic
def record_miss(isbn_13: str) -> ISBNNotFoundCache:
    """Mark this ISBN as missing from every source; advance the backoff schedule.

    Creates a new row on first miss (attempts=1, retry_after=now+1d), or
    increments attempts and pushes retry_after out further on subsequent misses.
    select_for_update() prevents concurrent racers from both incrementing
    against a stale `attempts` value.
    """
    row, created = ISBNNotFoundCache.objects.select_for_update().get_or_create(
        isbn_13=isbn_13,
        defaults={"attempts": 1, "retry_after": _retry_after_for(1)},
    )
    if not created:
        row.attempts += 1
        row.retry_after = _retry_after_for(row.attempts)
        row.save(update_fields=["attempts", "retry_after"])
    logger.info(
        "ISBNNotFoundCache: %s attempts=%d retry_after=%s",
        isbn_13, row.attempts, row.retry_after.isoformat(),
    )
    return row


def clear(isbn_13: str) -> int:
    """Remove any suppression for this ISBN.

    Called after a successful cascade — if at least one source has data,
    we shouldn't continue to suppress lookups even if this ISBN was previously
    flagged. Returns the number of rows deleted (0 or 1).
    """
    deleted, _ = ISBNNotFoundCache.objects.filter(isbn_13=isbn_13).delete()
    if deleted:
        logger.info("ISBNNotFoundCache: cleared %s after successful cascade", isbn_13)
    return deleted
