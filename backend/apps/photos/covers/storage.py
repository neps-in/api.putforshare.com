"""Async Bunny Storage / CDN helpers for the cover pipeline.

Uploads raw bytes directly via httpx PUT — no Django UploadedFile wrapping. Used
by the cover pipeline after Pillow processing has produced the final variants.

Configuration is read from Django settings; canonical env names match
.env.production (BUNNY_STORAGE_ACCESS_KEY, BUNNY_CDN_HOSTNAME) with fallback to
the legacy aliases (BUNNY_STORAGE_PASSWORD, BUNNY_ACCESS_KEY, BUNNY_CDN_BASE_URL,
BUNNY_CDN_URL).
"""

import logging
from urllib.parse import quote

import httpx
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

logger = logging.getLogger(__name__)


class BunnyUploadError(Exception):
    """Bunny returned a non-2xx status to a PUT."""


def _bunny_zone() -> str:
    zone = str(getattr(settings, "BUNNY_STORAGE_ZONE", "") or "").strip()
    if not zone:
        raise ImproperlyConfigured("BUNNY_STORAGE_ZONE is not configured.")
    return zone


def _bunny_endpoint() -> str:
    raw = str(
        getattr(settings, "BUNNY_STORAGE_ENDPOINT", "")
        or "storage.bunnycdn.com"
    ).strip()
    return raw.replace("https://", "").replace("http://", "").strip("/")


def _bunny_access_key() -> str:
    key = str(
        getattr(settings, "BUNNY_STORAGE_ACCESS_KEY", "")
        or getattr(settings, "BUNNY_STORAGE_PASSWORD", "")
        or getattr(settings, "BUNNY_ACCESS_KEY", "")
        or ""
    ).strip()
    if not key:
        raise ImproperlyConfigured(
            "BUNNY_STORAGE_ACCESS_KEY (or legacy BUNNY_STORAGE_PASSWORD / "
            "BUNNY_ACCESS_KEY) must be set for Bunny uploads."
        )
    return key


def _bunny_cdn_base() -> str:
    """Return the CDN base URL with scheme, no trailing slash."""
    hostname = str(getattr(settings, "BUNNY_CDN_HOSTNAME", "") or "").strip()
    if hostname:
        hostname = hostname.replace("https://", "").replace("http://", "").strip("/")
        return f"https://{hostname}"
    legacy = str(
        getattr(settings, "BUNNY_CDN_BASE_URL", "")
        or getattr(settings, "BUNNY_CDN_URL", "")
        or ""
    ).strip().rstrip("/")
    if not legacy:
        raise ImproperlyConfigured(
            "BUNNY_CDN_HOSTNAME (or legacy BUNNY_CDN_BASE_URL / BUNNY_CDN_URL) "
            "must be set for Bunny uploads."
        )
    if not legacy.startswith(("http://", "https://")):
        legacy = f"https://{legacy}"
    return legacy


def build_cover_storage_key(isbn_13: str, size: str, format_: str) -> str:
    """`covers/{isbn_13[:3]}/{isbn_13}/{size}.{format}` — sharded by the first
    three ISBN digits so very large catalogs don't all land in one folder."""
    return f"covers/{isbn_13[:3]}/{isbn_13}/{size}.{format_}"


def build_cdn_url(storage_key: str) -> str:
    """Return the public CDN URL for a Bunny Storage key."""
    return f"{_bunny_cdn_base()}/{quote(storage_key, safe='/')}"


async def upload_to_bunny(
    storage_key: str,
    content: bytes,
    content_type: str,
    *,
    timeout: float = 30.0,
) -> str:
    """PUT raw bytes to Bunny Storage at `storage_key`; return public CDN URL.

    Raises:
        BunnyUploadError: when Bunny responds with a non-2xx status.
        ImproperlyConfigured: when required settings are missing.
    """
    zone = _bunny_zone()
    endpoint = _bunny_endpoint()
    access_key = _bunny_access_key()

    url = f"https://{endpoint}/{zone}/{quote(storage_key, safe='/')}"
    headers = {
        "AccessKey": access_key,
        "Content-Type": content_type or "application/octet-stream",
    }

    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.put(url, content=content, headers=headers)

    if response.status_code not in (200, 201):
        raise BunnyUploadError(
            f"Bunny PUT {storage_key} returned {response.status_code}: "
            f"{response.text[:200]}"
        )

    public_url = build_cdn_url(storage_key)
    logger.info("Bunny upload OK: %s (%d bytes) -> %s", storage_key, len(content), public_url)
    return public_url
