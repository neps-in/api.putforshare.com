"""End-to-end cover pipeline orchestrator.

    process_and_upload_covers(isbn_13, candidates) -> {
        "is_default": bool,
        "default_url": str,
        "variants": {
            "thumbnail": {"webp": url, "jpeg": url},
            "small":     {"webp": url, "jpeg": url},
            "medium":    {"webp": url, "jpeg": url},
            "large":     {"webp": url, "jpeg": url},  # only if source >= 1200px wide
        },
    }

When no candidate yields a usable cover (no candidates, downloads fail,
validation fails, or Pillow can't decode), `is_default=True` is returned and
`variants` is empty — callers should use `default_url` as the single fallback.
"""

import asyncio
import logging
from typing import Optional

from .fetcher import fetch_best_cover
from .placeholder import default_cover_url
from .processor import CoverVariant, process_cover
from .storage import build_cover_storage_key, upload_to_bunny

logger = logging.getLogger(__name__)


async def _upload_one(isbn_13: str, variant: CoverVariant) -> tuple[CoverVariant, str]:
    storage_key = build_cover_storage_key(isbn_13, variant.size, variant.format)
    url = await upload_to_bunny(storage_key, variant.content, variant.content_type)
    return variant, url


def _empty_result() -> dict:
    return {
        "is_default": True,
        "default_url": default_cover_url(),
        "variants": {},
    }


async def process_and_upload_covers(
    isbn_13: str,
    candidates: list[dict],
) -> dict:
    """Run the cover pipeline for one book. See module docstring for return shape."""
    fetched: Optional[tuple[bytes, str]] = await fetch_best_cover(candidates)
    if fetched is None:
        logger.info("Cover pipeline: no usable candidate for ISBN %s, using default.", isbn_13)
        return _empty_result()

    raw_bytes, _content_type = fetched
    variants = process_cover(raw_bytes)
    if not variants:
        logger.warning("Cover pipeline: processor produced no variants for ISBN %s.", isbn_13)
        return _empty_result()

    # Upload all variants in parallel — Bunny is fine with concurrent PUTs.
    upload_results = await asyncio.gather(
        *(_upload_one(isbn_13, v) for v in variants),
        return_exceptions=True,
    )

    variants_out: dict[str, dict[str, str]] = {}
    for outcome in upload_results:
        if isinstance(outcome, BaseException):
            logger.error("Cover pipeline: upload failed for ISBN %s: %s", isbn_13, outcome)
            continue
        variant, url = outcome
        variants_out.setdefault(variant.size, {})[variant.format] = url

    if not variants_out:
        # Every upload failed — degrade gracefully to the default cover.
        return _empty_result()

    return {
        "is_default": False,
        "default_url": default_cover_url(),
        "variants": variants_out,
    }
