"""Shared BookSource ABC, SourceResult dataclass, and logging helper.

Subclasses override _do_fetch() to issue the actual API call. The public
fetch() in this base class centralizes timing, exception trapping, and
ISBNLookupLog persistence so every source records the same fields.
"""

import logging
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional

import httpx
from asgiref.sync import sync_to_async
from ratelimit import RateLimitException
from tenacity import retry, retry_if_exception, stop_after_attempt, wait_exponential

from ..schemas import NormalizedBook

logger = logging.getLogger(__name__)

# Descriptive User-Agent identifying this project. Open Library (and increasingly
# other free APIs) reject or rate-limit requests without one — see
# https://openlibrary.org/developers/api. Every source uses this header.
USER_AGENT = "PutForShare-ISBN-Resolver/1.0 (+https://putforshare.com; contact: hi@putforshare.com)"
DEFAULT_HEADERS = {"User-Agent": USER_AGENT, "Accept": "application/json"}


def _should_retry_http(exc: BaseException) -> bool:
    """Retry on transient network/server errors, but NOT on 4xx (incl. 404)."""
    if isinstance(exc, (httpx.TimeoutException, httpx.NetworkError)):
        return True
    if isinstance(exc, httpx.HTTPStatusError) and exc.response is not None:
        return exc.response.status_code >= 500
    return False


# Shared retry decorator: 2s, 4s, 8s exponential backoff, up to 3 attempts.
# Reraises the last exception so the base.fetch() error handler can log it.
retry_transient = retry(
    retry=retry_if_exception(_should_retry_http),
    wait=wait_exponential(multiplier=2, min=2, max=8),
    stop=stop_after_attempt(3),
    reraise=True,
)


@dataclass
class SourceResult:
    found: bool = False
    raw: dict = field(default_factory=dict)
    normalized: Optional[NormalizedBook] = None
    cover_urls: list[dict] = field(default_factory=list)  # [{"url": ..., "size_hint": "large"}]
    source: str = ""
    latency_ms: int = 0
    http_status: Optional[int] = None
    error: Optional[str] = None


@sync_to_async
def _persist_lookup_log(**kwargs) -> None:
    # Lazy import to avoid Django app-loading order issues at module import.
    from apps.inventory.models import ISBNLookupLog

    try:
        ISBNLookupLog.objects.create(**kwargs)
    except Exception as exc:  # pragma: no cover - audit log must never break a request
        logger.warning("Failed to persist ISBNLookupLog: %s", exc)


class BookSource(ABC):
    """Abstract base for a per-API source adapter.

    Subclasses set `name`, `priority`, `enabled`, and implement `_do_fetch`.
    The orchestrator calls `fetch(isbn_13)` which handles cross-cutting
    concerns (timing, logging, error wrapping) uniformly.
    """

    name: str = ""
    priority: int = 100  # lower = higher priority
    enabled: bool = True

    async def fetch(self, isbn_13: str) -> SourceResult:
        if not self.enabled:
            return SourceResult(source=self.name, error="disabled")

        start = time.monotonic()
        try:
            normalized, raw, http_status, cover_urls = await self._do_fetch(isbn_13)
        except RateLimitException as exc:
            elapsed_ms = int((time.monotonic() - start) * 1000)
            await _persist_lookup_log(
                isbn=isbn_13[:13], source=self.name, status="rate_limited",
                latency_ms=elapsed_ms, http_status=None, error=str(exc),
            )
            return SourceResult(
                source=self.name, latency_ms=elapsed_ms, error="rate_limited",
            )
        except httpx.HTTPStatusError as exc:
            elapsed_ms = int((time.monotonic() - start) * 1000)
            http_status = exc.response.status_code if exc.response is not None else None
            await _persist_lookup_log(
                isbn=isbn_13[:13], source=self.name, status="error",
                latency_ms=elapsed_ms, http_status=http_status, error=str(exc),
            )
            return SourceResult(
                source=self.name, latency_ms=elapsed_ms,
                http_status=http_status, error=str(exc),
            )
        except Exception as exc:
            elapsed_ms = int((time.monotonic() - start) * 1000)
            await _persist_lookup_log(
                isbn=isbn_13[:13], source=self.name, status="error",
                latency_ms=elapsed_ms, http_status=None, error=str(exc),
            )
            return SourceResult(
                source=self.name, latency_ms=elapsed_ms, error=str(exc),
            )

        elapsed_ms = int((time.monotonic() - start) * 1000)
        status_label = "hit" if normalized is not None else "miss"
        await _persist_lookup_log(
            isbn=isbn_13[:13], source=self.name, status=status_label,
            latency_ms=elapsed_ms, http_status=http_status, error="",
        )

        return SourceResult(
            found=normalized is not None,
            raw=raw or {},
            normalized=normalized,
            cover_urls=cover_urls or [],
            source=self.name,
            latency_ms=elapsed_ms,
            http_status=http_status,
        )

    @abstractmethod
    async def _do_fetch(
        self, isbn_13: str,
    ) -> tuple[Optional[NormalizedBook], dict, Optional[int], list[dict]]:
        """Subclass-provided API call.

        Must return a 4-tuple: (normalized | None, raw_response_dict,
        http_status | None, cover_url_candidates).

        Raising httpx.HTTPStatusError / RateLimitException / any Exception is
        OK; the base class converts those to SourceResult error/rate_limited
        states. Returning normalized=None means "the source had nothing for
        this ISBN" — this is logged as a 'miss', not an error.
        """
