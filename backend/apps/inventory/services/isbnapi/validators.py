"""
Quality validators for individual field values.
Each validator returns True if the value is acceptable, False otherwise.
Used during the merge step to skip low-quality values before falling back.
"""

import logging
from typing import Optional
from datetime import datetime

import httpx

logger = logging.getLogger(__name__)


def is_valid_title(value: Optional[str]) -> bool:
    if not value or not value.strip():
        return False
    return len(value.strip()) >= 2


def is_valid_authors(value: list) -> bool:
    if not value:
        return False
    # Reject if all authors are "Unknown" or empty strings
    meaningful = [a for a in value if a and a.strip().lower() not in ("unknown", "n/a", "")]
    return len(meaningful) > 0


def is_valid_description(value: Optional[str]) -> bool:
    if not value or not value.strip():
        return False
    if len(value.strip()) < 20:
        return False
    placeholders = {
        "no description available",
        "description not available",
        "n/a",
        "none",
        "not available",
    }
    return value.strip().lower() not in placeholders


def is_valid_page_count(value: Optional[int]) -> bool:
    if value is None:
        return False
    return 1 <= value <= 10_000


def is_valid_published_date(value: Optional[str]) -> bool:
    if not value or not value.strip():
        return False
    # Accept year-only (e.g. "2001"), year-month, or full date
    formats = ["%Y-%m-%d", "%Y-%m", "%Y", "%B %d, %Y", "%b %d, %Y", "%d %B %Y"]
    for fmt in formats:
        try:
            datetime.strptime(value.strip(), fmt)
            return True
        except ValueError:
            continue
    return False


def is_valid_language(value: Optional[str]) -> bool:
    return bool(value and value.strip())


def is_valid_publisher(value: Optional[str]) -> bool:
    if not value or not value.strip():
        return False
    return value.strip().lower() not in ("unknown", "n/a", "")


def is_valid_categories(value: list) -> bool:
    return bool(value and len(value) > 0)


def is_valid_preview_link(value: Optional[str]) -> bool:
    return bool(value and value.startswith("http"))


def is_valid_price(value) -> bool:
    """Accept any positive numeric price; reject None, zero, negative, or non-numeric."""
    if value is None:
        return False
    try:
        return float(value) > 0
    except (TypeError, ValueError):
        return False


async def is_valid_thumbnail(url: Optional[str]) -> bool:
    """
    Async validator: does a HEAD request to check the URL is reachable
    and actually returns an image content-type.
    Falls back gracefully on any network error.
    """
    if not url or not url.startswith("http"):
        return False
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.head(url, timeout=3, follow_redirects=True)
            if resp.status_code != 200:
                return False
            content_type = resp.headers.get("content-type", "")
            return content_type.startswith("image/")
    except Exception as exc:
        logger.debug("Thumbnail validation failed for %s: %s", url, exc)
        return False
