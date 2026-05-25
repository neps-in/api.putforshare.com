"""
Filesystem cache for merged book metadata.

Storage layout:
  CACHE_DIR/
    9780340960196.json         ← canonical file, always named by ISBN-13
    0340960191.json            ← symlink (or pointer stub) → 9780340960196.json
    index.json                 ← maps every known ISBN (10 or 13) → canonical ISBN-13

The index is the key to solving the ISBN-10 / ISBN-13 caveat:
  - A lookup by ISBN-10 consults the index, finds the canonical ISBN-13, then
    opens the right file.
  - A lookup by ISBN-13 works the same way — index maps it to itself.
  - If we only know one form at write time, we still store what we have and
    update the index; the other form gets added later if a richer result comes in.

TTL is enforced by checking the file's mtime against CACHE_TTL_SECONDS.
No external dependencies beyond the Python standard library + Django settings.
"""

import json
import logging
import os
import time
from pathlib import Path
from typing import Optional

from django.conf import settings

from .schemas import MergedBookResponse

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# Override via settings.BOOK_CACHE_DIR; defaults to <BASE_DIR>/book_cache
def _cache_dir() -> Path:
    base = getattr(settings, "BOOK_CACHE_DIR", None)
    if base:
        return Path(base)
    return Path(settings.BASE_DIR) / "book_cache"


CACHE_TTL_SECONDS: int = getattr(settings, "BOOK_CACHE_TTL", 48 * 60 * 60)  # 48 h
INDEX_FILENAME = "index.json"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _clean(isbn: str) -> str:
    """Strip hyphens and whitespace, uppercase X (for ISBN-10 check digit)."""
    return isbn.replace("-", "").replace(" ", "").strip().upper()


def _is_isbn13(isbn: str) -> bool:
    return len(isbn) == 13 and isbn.isdigit()


def _is_isbn10(isbn: str) -> bool:
    if len(isbn) != 10:
        return False
    return isbn[:9].isdigit() and (isbn[9].isdigit() or isbn[9] == "X")


def _ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------------------
# Index: ISBN (any form) → canonical ISBN-13
# The index is a plain JSON dict stored at CACHE_DIR/index.json.
# Structure: { "9780340960196": "9780340960196", "0340960191": "9780340960196", ... }
# ---------------------------------------------------------------------------

def _index_path() -> Path:
    return _cache_dir() / INDEX_FILENAME


def _load_index() -> dict[str, str]:
    path = _index_path()
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        logger.warning("Failed to read ISBN index, starting fresh: %s", exc)
        return {}


def _save_index(index: dict[str, str]) -> None:
    path = _index_path()
    _ensure_dir(path.parent)
    # Atomic write via temp file
    tmp = path.with_suffix(".tmp")
    try:
        tmp.write_text(json.dumps(index, indent=2), encoding="utf-8")
        tmp.replace(path)
    except Exception as exc:
        logger.error("Failed to save ISBN index: %s", exc)
        tmp.unlink(missing_ok=True)


def _register_isbns(index: dict[str, str], isbn10: Optional[str], isbn13: Optional[str]) -> str:
    """
    Add both ISBN forms to the index, pointing at the canonical ISBN-13.
    Returns the canonical ISBN-13 (or ISBN-10 as fallback if ISBN-13 unknown).
    Mutates `index` in place — caller is responsible for saving.
    """
    if isbn13:
        canonical = _clean(isbn13)
    elif isbn10:
        # We don't have ISBN-13 yet; use ISBN-10 as temporary canonical
        canonical = _clean(isbn10)
    else:
        raise ValueError("At least one ISBN form is required to register in the index.")

    if isbn13:
        index[_clean(isbn13)] = canonical
    if isbn10:
        index[_clean(isbn10)] = canonical

    return canonical


def _resolve_canonical(isbn: str) -> Optional[str]:
    """
    Given any ISBN form, return the canonical ISBN (ISBN-13 preferred),
    or None if this ISBN is not in the index yet.
    """
    index = _load_index()
    return index.get(_clean(isbn))


# ---------------------------------------------------------------------------
# File path helpers
# ---------------------------------------------------------------------------

def _book_path(canonical_isbn: str) -> Path:
    return _cache_dir() / f"{canonical_isbn}.json"


# ---------------------------------------------------------------------------
# TTL check
# ---------------------------------------------------------------------------

def _is_expired(path: Path) -> bool:
    try:
        age = time.time() - path.stat().st_mtime
        return age > CACHE_TTL_SECONDS
    except FileNotFoundError:
        return True


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_cached_book(isbn: str) -> Optional[MergedBookResponse]:
    """
    Look up a book by ISBN (either ISBN-10 or ISBN-13).

    Strategy:
    1. Clean the input ISBN.
    2. Fast path: if it's ISBN-13, try the file directly without hitting the index.
    3. Fall back to the index for ISBN-10 inputs or cross-form lookups.
    4. Check TTL; return None if expired (caller will re-fetch).
    """
    cleaned = _clean(isbn)

    # Fast path: try direct filename if it looks like an ISBN-13
    if _is_isbn13(cleaned):
        path = _book_path(cleaned)
        if path.exists():
            return _read_file(path, isbn)

    # Index lookup (handles ISBN-10 and cross-form)
    canonical = _resolve_canonical(cleaned)
    if not canonical:
        logger.debug("Cache MISS (not in index) for ISBN %s", isbn)
        return None

    path = _book_path(canonical)
    if not path.exists():
        logger.debug("Cache MISS (file missing) for ISBN %s → %s", isbn, canonical)
        return None

    return _read_file(path, isbn)


def _read_file(path: Path, original_isbn: str) -> Optional[MergedBookResponse]:
    if _is_expired(path):
        logger.debug("Cache EXPIRED for %s", path.name)
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        logger.debug("Cache HIT for ISBN %s → %s", original_isbn, path.name)
        return MergedBookResponse(**data)
    except Exception as exc:
        logger.warning("Cache decode error (%s): %s", path.name, exc)
        path.unlink(missing_ok=True)
        return None


def cache_book(isbn: str, book: MergedBookResponse) -> None:
    """
    Persist a MergedBookResponse to the filesystem.

    The canonical filename is always the ISBN-13 when available.
    Both ISBN-10 and ISBN-13 are registered in the index so future
    lookups by either form will resolve to this file.

    If we already have a file under the other ISBN form, the old file is
    removed and replaced so we never have duplicate entries.
    """
    # Extract both forms from the merged result
    isbn10  = _clean(book.isbn10)  if book.isbn10  else None
    isbn13  = _clean(book.isbn13)  if book.isbn13  else None
    input_c = _clean(isbn)

    # Fill in from the input ISBN itself if the merged result didn't carry it
    if _is_isbn13(input_c) and not isbn13:
        isbn13 = input_c
    elif _is_isbn10(input_c) and not isbn10:
        isbn10 = input_c

    if not isbn10 and not isbn13:
        logger.warning("Cannot cache: no valid ISBN found for input '%s'", isbn)
        return

    index = _load_index()
    canonical = _register_isbns(index, isbn10, isbn13)

    _ensure_dir(_cache_dir())
    path = _book_path(canonical)

    # If a file exists under an old canonical name (e.g. we previously stored
    # under ISBN-10 and now have ISBN-13), remove the old file.
    if isbn10 and isbn13:
        for old_canonical in {index.get(isbn10), index.get(isbn13)} - {canonical, None}:
            old_path = _book_path(old_canonical)
            if old_path.exists():
                logger.info("Migrating cache file %s → %s", old_path.name, path.name)
                old_path.unlink(missing_ok=True)

    try:
        tmp = path.with_suffix(".tmp")
        tmp.write_text(json.dumps(book.to_dict(), indent=2), encoding="utf-8")
        tmp.replace(path)
        _save_index(index)
        logger.debug("Cached ISBN %s → %s (TTL %ds)", isbn, path.name, CACHE_TTL_SECONDS)
    except Exception as exc:
        logger.error("Failed to write cache for ISBN %s: %s", isbn, exc)


def invalidate_book(isbn: str) -> None:
    """
    Delete the cached file and remove all index entries for this ISBN
    (both ISBN-10 and ISBN-13 forms if known).
    """
    cleaned = _clean(isbn)
    index = _load_index()
    canonical = index.get(cleaned)

    if not canonical:
        logger.info("Nothing to invalidate for ISBN %s (not in index)", isbn)
        return

    # Remove all index entries pointing to this canonical
    to_remove = [k for k, v in index.items() if v == canonical]
    for key in to_remove:
        del index[key]
    _save_index(index)

    path = _book_path(canonical)
    path.unlink(missing_ok=True)
    logger.info(
        "Invalidated cache for ISBN %s (file: %s, index entries removed: %s)",
        isbn, path.name, to_remove,
    )


def list_cached_isbns() -> list[str]:
    """Return all canonical ISBNs that are currently cached and not expired."""
    cache_dir = _cache_dir()
    if not cache_dir.exists():
        return []
    results = []
    for f in cache_dir.glob("*.json"):
        if f.name == INDEX_FILENAME:
            continue
        if not _is_expired(f):
            results.append(f.stem)
    return sorted(results)
