"""
Filesystem cache for merged book metadata.

Storage layout:

    CACHE_DIR/
        978/
            9780340960196.json     ← canonical file (always ISBN-13)
            ...
        034/
            0340960191.json        ← relative symlink → ../978/9780340960196.json
            ...

The canonical filename is always the ISBN-13. ISBN-10 lookups resolve via
relative symlink, so there is exactly one physical JSON per book. ISBN-13s
starting with `979` have no ISBN-10 equivalent — only the .json file exists,
no symlink.

The cache is **permanent** — files have no TTL. To force a re-fetch, call
invalidate_book(isbn) or use force_refresh in the resolver. The 3-char shard
prefix keeps any single directory's fan-out modest at scale.

No external dependencies beyond the Python standard library + Django settings.
"""

import json
import logging
import os
from pathlib import Path
from typing import Optional

from django.conf import settings

from .schemas import MergedBookResponse

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

def _cache_dir() -> Path:
    base = getattr(settings, "BOOK_CACHE_DIR", None)
    if base:
        return Path(base)
    return Path(settings.BASE_DIR) / "book_cache"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _clean(isbn: str) -> str:
    """Strip hyphens and whitespace, uppercase the ISBN-10 'X' check digit."""
    return isbn.replace("-", "").replace(" ", "").strip().upper()


def _is_isbn13(isbn: str) -> bool:
    return len(isbn) == 13 and isbn.isdigit()


def _is_isbn10(isbn: str) -> bool:
    if len(isbn) != 10:
        return False
    return isbn[:9].isdigit() and (isbn[9].isdigit() or isbn[9] == "X")


def _shard_for(isbn: str) -> str:
    """3-char shard prefix for an ISBN file."""
    return isbn[:3]


def _book_path(isbn: str) -> Path:
    """Sharded path for any ISBN form: CACHE_DIR/{isbn[:3]}/{isbn}.json"""
    return _cache_dir() / _shard_for(isbn) / f"{isbn}.json"


def _ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_cached_book(isbn: str) -> Optional[MergedBookResponse]:
    """
    Look up a book by ISBN (either ISBN-10 or ISBN-13).

    The ISBN-10 path is a symlink to the ISBN-13 file; Path.exists() and
    Path.read_text() follow it transparently, so callers don't need to know
    which form they have.

    Cache is permanent — no TTL check. Stale-schema files (e.g. from older
    code versions whose fields don't match the current dataclass) are
    auto-purged on read.
    """
    cleaned = _clean(isbn)
    if not (_is_isbn13(cleaned) or _is_isbn10(cleaned)):
        return None

    path = _book_path(cleaned)
    if not path.exists():
        logger.debug("Cache MISS for ISBN %s", isbn)
        return None

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return MergedBookResponse(**data)
    except (json.JSONDecodeError, TypeError) as exc:
        logger.warning(
            "Cache decode error for %s (%s); discarding stale file.", path, exc,
        )
        invalidate_book(isbn)
        return None


def cache_book(isbn: str, book: MergedBookResponse) -> None:
    """
    Persist a MergedBookResponse to {isbn_13[:3]}/{isbn_13}.json.

    If both ISBN forms are known and they differ, create a relative symlink
    at {isbn_10[:3]}/{isbn_10}.json → ../{isbn_13[:3]}/{isbn_13}.json so
    lookups by either form resolve to the same physical file.

    For ISBN-13s starting with 979 (no ISBN-10 equivalent), only the .json
    is written; no symlink.
    """
    isbn10 = _clean(book.isbn10) if book.isbn10 else None
    isbn13 = _clean(book.isbn13) if book.isbn13 else None
    input_c = _clean(isbn)

    # Fill in from the input ISBN if the merged result doesn't carry it.
    if _is_isbn13(input_c) and not isbn13:
        isbn13 = input_c
    elif _is_isbn10(input_c) and not isbn10:
        isbn10 = input_c

    if not isbn13 or not _is_isbn13(isbn13):
        # Canonical filename is always ISBN-13. Without it we can't safely cache.
        logger.warning("Cannot cache: no ISBN-13 available for input '%s'", isbn)
        return

    canonical = _book_path(isbn13)
    _ensure_dir(canonical.parent)

    # Atomic write: hidden tmp file in same dir, then os.replace.
    tmp = canonical.with_name(f".{canonical.name}.tmp")
    try:
        tmp.write_text(json.dumps(book.to_dict(), indent=2), encoding="utf-8")
        os.replace(tmp, canonical)
    except Exception as exc:
        logger.error("Failed to write cache for ISBN %s: %s", isbn, exc)
        tmp.unlink(missing_ok=True)
        return

    # ISBN-10 symlink (if both forms known and different).
    if isbn10 and _is_isbn10(isbn10) and isbn10 != isbn13:
        alias = _book_path(isbn10)
        _ensure_dir(alias.parent)
        # Relative target so the cache root is portable: ../{shard_13}/{isbn_13}.json
        rel_target = os.path.relpath(canonical, alias.parent)
        try:
            # Atomic symlink swap: create tmp link, replace into place.
            tmp_link = alias.with_name(f".{alias.name}.tmp")
            tmp_link.unlink(missing_ok=True)
            os.symlink(rel_target, tmp_link)
            os.replace(tmp_link, alias)
        except OSError as exc:
            logger.warning("Failed to create ISBN-10 symlink %s: %s", alias, exc)

    logger.debug("Cached ISBN %s → %s (alias=%s)", isbn, canonical, isbn10)


def invalidate_book(isbn: str) -> None:
    """
    Remove the canonical file and any sibling ISBN-10 symlink.

    Works whether the caller passes the ISBN-10 or ISBN-13 form. If the
    given path is a symlink, both the symlink and its target are removed.
    """
    cleaned = _clean(isbn)
    path = _book_path(cleaned)

    if path.is_symlink():
        # Caller passed ISBN-10; remove both the alias and the canonical file.
        try:
            target = path.resolve()
        except OSError:
            target = None
        path.unlink(missing_ok=True)
        if target and target.exists():
            target.unlink(missing_ok=True)
        return

    if not path.exists():
        return

    # Caller passed ISBN-13 (or a 979-prefix ISBN-13 with no alias). Read the
    # file once to discover the alternate-form ISBN so we can remove its
    # symlink too. If the file is unreadable, skip the alias cleanup.
    other: Optional[str] = None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        other = data.get("isbn10") if _is_isbn13(cleaned) else data.get("isbn13")
    except Exception:
        pass

    path.unlink(missing_ok=True)

    if other:
        alias = _book_path(_clean(other))
        if alias.is_symlink() or alias.exists():
            alias.unlink(missing_ok=True)


def list_cached_isbns() -> list[str]:
    """Return all canonical (non-symlink) ISBN-13s currently cached."""
    cache_dir = _cache_dir()
    if not cache_dir.exists():
        return []
    results = []
    for shard in cache_dir.iterdir():
        if not shard.is_dir():
            continue
        for f in shard.glob("*.json"):
            if f.is_symlink():
                continue  # alias — count only canonical files
            results.append(f.stem)
    return sorted(results)
