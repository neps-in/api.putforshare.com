"""
Merges normalized results from multiple sources into one MergedBookResponse.
Applies field-level priority order and quality validators.
Calculates a confidence score and tracks which sources contributed.
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

from .schemas import NormalizedBook, MergedBookResponse
from .validators import (
    is_valid_title,
    is_valid_authors,
    is_valid_description,
    is_valid_page_count,
    is_valid_published_date,
    is_valid_language,
    is_valid_publisher,
    is_valid_categories,
    is_valid_preview_link,
    is_valid_price,
    is_valid_thumbnail,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Priority order per field
# Each list is ordered most-trusted → least-trusted.
# ---------------------------------------------------------------------------
FIELD_PRIORITY = {
    "title":          ["google_books", "isbndb", "open_library"],
    "subtitle":       ["google_books", "open_library", "isbndb"],
    "authors":        ["google_books", "isbndb", "open_library"],
    "isbn10":         ["isbndb", "google_books", "open_library"],
    "isbn13":         ["isbndb", "google_books", "open_library"],
    "publisher":      ["isbndb", "google_books", "open_library"],
    "published_date": ["isbndb", "google_books", "open_library"],
    "description":    ["google_books", "open_library", "isbndb"],
    "page_count":     ["google_books", "isbndb", "open_library"],
    "categories":     ["google_books", "open_library", "isbndb"],
    "language":       ["google_books", "isbndb", "open_library"],
    "thumbnail":      ["isbndb", "google_books", "open_library", "upcitemdb"],
    "preview_link":   ["google_books", "open_library", "isbndb"],
    # list_price_usd is INTERNAL — never expose in public API. UPCitemdb is the
    # primary free contributor; ISBNdb (paid) is most authoritative when set.
    # upcitemdb is intentionally absent from every other field's priority list
    # so the merger never pulls title/authors/etc. from a generic-product DB.
    "list_price_usd": ["isbndb", "upcitemdb", "google_books"],
}

# Scalar validators (sync)
SCALAR_VALIDATORS = {
    "title":          is_valid_title,
    "subtitle":       is_valid_title,       # same non-empty + len>=2 check
    "authors":        is_valid_authors,
    "isbn10":         is_valid_title,       # non-empty string check is sufficient
    "isbn13":         is_valid_title,
    "publisher":      is_valid_publisher,
    "published_date": is_valid_published_date,
    "description":    is_valid_description,
    "page_count":     is_valid_page_count,
    "categories":     is_valid_categories,
    "language":       is_valid_language,
    "preview_link":   is_valid_preview_link,
    "list_price_usd": is_valid_price,
}

# All tracked fields — used for confidence scoring
ALL_FIELDS = list(FIELD_PRIORITY.keys())


def _pick_scalar(field_name: str, sources: dict[str, Optional[NormalizedBook]]) -> tuple[Optional[object], Optional[str]]:
    """
    Walk the priority list for a scalar field.
    Returns (best_value, contributing_source_name) or (None, None).
    """
    validator = SCALAR_VALIDATORS.get(field_name)
    priority = FIELD_PRIORITY[field_name]

    for source_name in priority:
        book = sources.get(source_name)
        if book is None:
            continue
        value = getattr(book, field_name, None)
        if validator and not validator(value):
            continue
        if not value and value != 0:
            continue
        return value, source_name

    return None, None


async def _pick_thumbnail(sources: dict[str, Optional[NormalizedBook]]) -> tuple[Optional[str], Optional[str]]:
    """
    Walk the priority list for thumbnail.
    Each candidate URL is validated with an async HEAD request.
    """
    priority = FIELD_PRIORITY["thumbnail"]

    for source_name in priority:
        book = sources.get(source_name)
        if book is None:
            continue
        url = book.thumbnail
        if not url:
            continue
        if await is_valid_thumbnail(url):
            return url, source_name
        else:
            logger.debug("Thumbnail from %s failed validation: %s", source_name, url)

    return None, None


def _calculate_confidence(merged: MergedBookResponse) -> int:
    """
    Score 0–100 based on how many of the key fields are filled.
    Core fields are weighted more heavily.
    """
    core_fields = {"title", "authors", "description", "thumbnail", "isbn13"}
    secondary_fields = {"publisher", "published_date", "page_count", "categories", "language"}

    core_filled = sum(
        1 for f in core_fields
        if getattr(merged, f, None) not in (None, [], "")
    )
    secondary_filled = sum(
        1 for f in secondary_fields
        if getattr(merged, f, None) not in (None, [], "")
    )

    # Core = 70 points, secondary = 30 points
    core_score = int((core_filled / len(core_fields)) * 70)
    secondary_score = int((secondary_filled / len(secondary_fields)) * 30)
    return core_score + secondary_score


def _find_missing(merged: MergedBookResponse) -> list[str]:
    missing = []
    for f in ALL_FIELDS:
        val = getattr(merged, f, None)
        if val in (None, [], ""):
            missing.append(f)
    return missing


async def merge_sources(sources: dict[str, Optional[NormalizedBook]]) -> MergedBookResponse:
    """
    Main merge entry point. Takes the dict from fetch_all_sources()
    and produces a single MergedBookResponse.
    """
    contributing_sources: set[str] = set()
    field_origins: dict[str, str] = {}
    merged = MergedBookResponse()

    # --- Scalar fields ---
    scalar_fields = [f for f in ALL_FIELDS if f != "thumbnail"]
    for field_name in scalar_fields:
        value, source = _pick_scalar(field_name, sources)
        if value is not None:
            setattr(merged, field_name, value)
            if source:
                contributing_sources.add(source)
                field_origins[field_name] = source

    # --- Thumbnail (async validation) ---
    thumbnail, thumb_source = await _pick_thumbnail(sources)
    if thumbnail:
        merged.thumbnail = thumbnail
        if thumb_source:
            contributing_sources.add(thumb_source)
            field_origins["thumbnail"] = thumb_source

    # --- Metadata ---
    merged.sources = sorted(contributing_sources)
    merged.field_origins = field_origins
    merged.confidence = _calculate_confidence(merged)
    merged.missing_fields = _find_missing(merged)
    merged.fetched_at = datetime.now(timezone.utc).isoformat()

    return merged
