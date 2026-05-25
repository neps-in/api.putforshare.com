"""Async cover image fetcher.

Given a list of candidate cover URLs (with size hints), try them largest-first,
download each, validate it's a real image (min dimensions, not a known
no-image placeholder), and return the first successful payload.

Returned bytes are not yet processed — see processor.py for resize/format
conversion.
"""

import hashlib
import io
import logging
from typing import Optional

import httpx
from PIL import Image, UnidentifiedImageError

logger = logging.getLogger(__name__)

# Minimum dimensions for a usable book cover. Below this and we treat the
# image as a placeholder regardless of source.
MIN_WIDTH = 100
MIN_HEIGHT = 150

# SHA-256 hashes of known "no image available" placeholders that Google Books
# (and other APIs) return when the real cover is missing. Populate as we
# encounter new placeholder bytes in production. An empty set is OK — the
# dimension check catches most placeholders by itself.
KNOWN_NO_IMAGE_HASHES: set[str] = set()

# Size hints in preferred order. extraLarge -> thumbnail.
SIZE_HINT_RANK: dict[str, int] = {
    "extraLarge": 0,
    "large": 1,
    "medium": 2,
    "small": 3,
    "thumbnail": 4,
    "smallThumbnail": 5,
}

DOWNLOAD_TIMEOUT_SECONDS = 8.0


def sort_candidates(candidates: list[dict]) -> list[dict]:
    """Stable-sort candidates largest hint first. Unknown hints sort last."""
    return sorted(
        candidates,
        key=lambda c: SIZE_HINT_RANK.get(c.get("size_hint", ""), 99),
    )


def _is_known_placeholder(content: bytes) -> bool:
    if not KNOWN_NO_IMAGE_HASHES:
        return False
    digest = hashlib.sha256(content).hexdigest()
    return digest in KNOWN_NO_IMAGE_HASHES


def _validate_image(content: bytes) -> Optional[tuple[int, int, str]]:
    """Return (width, height, format) if `content` is a usable image, else None."""
    try:
        with Image.open(io.BytesIO(content)) as img:
            img.verify()
        # img.verify() leaves the image in an unloaded state; reopen to read dims.
        with Image.open(io.BytesIO(content)) as img:
            width, height = img.size
            format_ = (img.format or "").lower()
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        logger.debug("Cover validation failed: %s", exc)
        return None

    if width < MIN_WIDTH or height < MIN_HEIGHT:
        logger.debug("Cover too small: %dx%d (min %dx%d)", width, height, MIN_WIDTH, MIN_HEIGHT)
        return None

    return width, height, format_


async def _download(client: httpx.AsyncClient, url: str) -> Optional[tuple[bytes, str]]:
    try:
        response = await client.get(url, timeout=DOWNLOAD_TIMEOUT_SECONDS)
        response.raise_for_status()
    except (httpx.HTTPError, httpx.TimeoutException) as exc:
        logger.debug("Cover download failed for %s: %s", url, exc)
        return None

    content_type = response.headers.get("content-type", "").split(";")[0].strip().lower()
    if not content_type.startswith("image/"):
        logger.debug("Cover URL %s returned non-image content-type %r", url, content_type)
        return None
    return response.content, content_type


async def fetch_best_cover(candidates: list[dict]) -> Optional[tuple[bytes, str]]:
    """Try each candidate in size-hint order; return the first that validates.

    Args:
        candidates: list of {"url": str, "size_hint": str} dicts.

    Returns:
        (raw_image_bytes, mime_type) on success; None if every candidate fails
        or the list is empty.
    """
    if not candidates:
        return None

    ordered = sort_candidates(candidates)
    async with httpx.AsyncClient() as client:
        for candidate in ordered:
            url = str(candidate.get("url") or "").strip()
            if not url:
                continue

            downloaded = await _download(client, url)
            if not downloaded:
                continue
            content, content_type = downloaded

            if _is_known_placeholder(content):
                logger.info("Cover %s matched known placeholder hash; rejecting.", url)
                continue

            if not _validate_image(content):
                continue

            logger.info("Cover OK from %s (%d bytes, %s)", url, len(content), content_type)
            return content, content_type

    return None
