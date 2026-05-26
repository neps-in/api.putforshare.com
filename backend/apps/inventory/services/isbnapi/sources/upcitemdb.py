"""UPCitemdb source — pricing + cover fallback only.

Docs: https://upcitemdb.com/api/explorer
- Free trial: 100/day, no auth, https://api.upcitemdb.com/prod/trial/lookup
- Paid: user_key header at https://api.upcitemdb.com/prod/v1/lookup

ISBN-13s are valid EAN-13 barcodes, so they can be looked up here.

**Narrow scope** (per PRD §3.4): contributes ONLY
  - list_price_usd (lowest non-zero offer)
  - cover image URL candidates

Does NOT contribute title, authors, brand, or other fields. UPCitemdb is a
generic product DB; book metadata is unreliable and authors are typically
embedded inside the title string. The merger's FIELD_PRIORITY map is what
actually enforces this — but we leave those fields None here as a second
line of defence.

list_price_usd is INTERNAL — see schemas.py for the no-public-exposure rule.
"""

import logging
from typing import Optional

import httpx
from django.conf import settings
from ratelimit import limits

from ..schemas import NormalizedBook
from .base import DEFAULT_HEADERS, BookSource, retry_transient

logger = logging.getLogger(__name__)

TIMEOUT_SECONDS = 5
TRIAL_URL = "https://api.upcitemdb.com/prod/trial/lookup"
PAID_URL = "https://api.upcitemdb.com/prod/v1/lookup"


# Trial is 100/day; this is a per-process burst guard, not the daily cap.
@limits(calls=10, period=60)
def _check_quota() -> None:
    pass


class UPCitemdbSource(BookSource):
    name = "upcitemdb"
    priority = 40  # lowest of the registered sources; pricing + cover fallback

    @property
    def enabled(self) -> bool:
        # Trial endpoint requires no auth; always on.
        return True

    async def _do_fetch(
        self, isbn_13: str,
    ) -> tuple[Optional[NormalizedBook], dict, Optional[int], list[dict]]:
        _check_quota()
        return await self._fetch_with_retry(isbn_13)

    @retry_transient
    async def _fetch_with_retry(
        self, isbn_13: str,
    ) -> tuple[Optional[NormalizedBook], dict, Optional[int], list[dict]]:
        api_key = str(getattr(settings, "UPCITEMDB_API_KEY", "") or "").strip()

        if api_key:
            url = PAID_URL
            headers = {**DEFAULT_HEADERS, "user_key": api_key}
        else:
            url = TRIAL_URL
            headers = dict(DEFAULT_HEADERS)
        params = {"upc": isbn_13}

        async with httpx.AsyncClient() as client:
            response = await client.get(
                url, params=params, headers=headers, timeout=TIMEOUT_SECONDS,
            )
            response.raise_for_status()
            data = response.json()

        http_status = response.status_code
        code = data.get("code")
        items = data.get("items") or []

        # All "no useful data" outcomes return a miss so the cascade can continue:
        #   - empty items[]      → ISBN not in their catalogue
        #   - INVALID_UPC        → checksum/format rejected (shouldn't happen post-Phase 1)
        #   - EXCEED_LIMIT       → 100/day trial quota hit
        if not items or code in ("INVALID_UPC", "EXCEED_LIMIT"):
            if code == "EXCEED_LIMIT":
                logger.warning("UPCitemdb daily quota exceeded for %s", isbn_13)
            return None, data, http_status, []

        item = items[0]

        # Pricing: lowest non-zero offer. The shape is items[].offers[].price.
        offers = item.get("offers") or []
        prices = [
            o.get("price") for o in offers
            if isinstance(o.get("price"), (int, float)) and o["price"] > 0
        ]
        list_price_usd = float(min(prices)) if prices else None

        # Covers: each image URL becomes a candidate. Size hint unknown.
        images = item.get("images") or []
        cover_urls = [
            {"url": img, "size_hint": "unknown"}
            for img in images
            if isinstance(img, str) and img.startswith("http")
        ]
        thumbnail = cover_urls[0]["url"] if cover_urls else None

        # Narrow scope: leave title/authors/isbn fields None so the merger
        # never picks them up from UPCitemdb. The FIELD_PRIORITY map already
        # excludes upcitemdb from those fields; this is belt-and-suspenders.
        # The resolver service will set isbn13 on the merged response from
        # the queried ISBN, so we don't need to echo it here.
        normalized = NormalizedBook(
            list_price_usd=list_price_usd,
            thumbnail=thumbnail,
            source=self.name,
        )
        return normalized, item, http_status, cover_urls
