"""Persist a MergedBookResponse onto an existing Book row.

Public API:
    persist_merged_book(book, merged) -> Book
        Updates a Book row's metadata fields from a merged response.
        Author rows are deduplicated by normalized_name and linked via the
        BookAuthor through model with `order` preserving the merger-supplied
        author sequence. Publisher is looked up or created by case-insensitive
        name. Wrapped in transaction.atomic().

    enrich_book(book, force_refresh=False) -> Book
        High-level convenience: runs the resolver for book.isbn_13 (or _10)
        and persists the result.

**Boundary rules**

Seller-owned fields are *only* filled when currently empty — the resolver
never overwrites them:
    Book.name (Product.name)
    Book.description (Product.description)

Pricing on Product (`min_retail_price`, `max_retail_price`, `sale_price`)
and identity fields (`sku`, `seller`, `category`) are **never** touched —
those are seller transactional data. The resolver's `list_price_inr` /
`list_price_usd` are *publisher's* list prices (book metadata), and live in
the separate `Book.list_price_inr` / `list_price_usd` columns.

`list_price_usd` is **internal-only** — it is persisted for source merging
and analytics but must be excluded from any public API serializer.
"""

import logging
import re
import unicodedata
from typing import Optional

from django.db import transaction
from django.utils import timezone

from apps.inventory.models import Author, Book, BookAuthor, Publisher

from .schemas import MergedBookResponse
from .service import get_book_metadata_sync

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_PUNCT_RE = re.compile(r"[^\w\s]")  # anything that isn't a word char or whitespace


def _normalize_author_name(name: str) -> str:
    """Lowercase, strip accents and punctuation, collapse whitespace — for Author dedup.

    Used to merge "Thomas H. Cormen", "thomas h cormen", and "THOMAS H. CORMEN"
    into the same normalized key, and to keep "José Saramago" and
    "Jose Saramago" pointing at the same Author row.
    """
    if not name:
        return ""
    decomposed = unicodedata.normalize("NFKD", name)
    ascii_form = decomposed.encode("ascii", "ignore").decode("ascii")
    no_punct = _PUNCT_RE.sub(" ", ascii_form)
    return " ".join(no_punct.lower().split())


def _get_or_create_author(name: str) -> Optional[Author]:
    """Resolve or create an Author. Returns None if name is blank."""
    name = (name or "").strip()
    if not name:
        return None
    normalized = _normalize_author_name(name)
    # Prefer existing row to avoid duplicates for accent / case variants.
    author = Author.objects.filter(normalized_name=normalized).first()
    if author is not None:
        return author
    # Author.name has unique=True; if a name collision exists with a different
    # normalized form, prefer that existing row over creating a duplicate.
    existing_by_name = Author.objects.filter(name=name).first()
    if existing_by_name is not None:
        return existing_by_name
    return Author.objects.create(name=name, normalized_name=normalized)


def _get_or_create_publisher(name: str) -> Optional[Publisher]:
    name = (name or "").strip()
    if not name:
        return None
    pub = Publisher.objects.filter(name__iexact=name).first()
    if pub is not None:
        return pub
    return Publisher.objects.create(name=name)


def _parse_year(raw: Optional[str]) -> Optional[int]:
    """Extract a 4-digit year from '2019' / '2019-03' / '2019-03-15' / 'March 2019'."""
    if not raw:
        return None
    s = str(raw).strip()
    if len(s) >= 4 and s[:4].isdigit():
        year = int(s[:4])
        if 1000 <= year <= 9999:
            return year
    # Fallback: scan for any 4-digit run that looks like a year
    import re
    m = re.search(r"\b(1\d{3}|20\d{2}|21\d{2})\b", s)
    if m:
        return int(m.group(1))
    return None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

@transaction.atomic
def persist_merged_book(book: Book, merged: MergedBookResponse) -> Book:
    """Write `merged` onto `book`, dedup Authors, link via BookAuthor.

    Returns the saved Book instance (same object, refreshed-in-memory).
    """
    if merged.error and not (merged.title or merged.isbn13):
        logger.info(
            "persist_merged_book skipped for Book #%s (resolver error: %s)",
            book.id, merged.error,
        )
        return book

    # --- Seller-owned fields: only fill if currently blank ---
    if merged.title and not (book.name or "").strip():
        book.name = merged.title
    if merged.description and not (book.description or "").strip():
        book.description = merged.description

    # --- Pure metadata fields: overwrite from cascade ---
    if merged.subtitle:
        book.subtitle = merged.subtitle
    if merged.isbn10 and not book.isbn_10:
        book.isbn_10 = merged.isbn10
    if merged.isbn13 and not book.isbn_13:
        book.isbn_13 = merged.isbn13
    if merged.page_count and merged.page_count > 0:
        book.page_count = merged.page_count
    if merged.language:
        book.book_language = merged.language
    if merged.published_date:
        book.published_date = merged.published_date
        year = _parse_year(merged.published_date)
        if year:
            book.published_year = year
    # list_price_usd is INTERNAL — stored for merging/analytics, excluded from public serializers.
    if merged.list_price_usd is not None:
        book.list_price_usd = merged.list_price_usd

    # Publisher (FK, get-or-create)
    if merged.publisher:
        pub = _get_or_create_publisher(merged.publisher)
        if pub is not None:
            book.publisher = pub

    # Metadata accounting
    book.metadata_quality_score = merged.confidence or 0
    # Book.sources is JSONField(default=dict). We store contributing-source names
    # under a "contributing" key; future work can extend this dict with
    # per-source raw responses keyed by source name.
    book.sources = {"contributing": list(merged.sources or [])}
    book.field_origins = dict(merged.field_origins or {})
    book.last_fetched_at = timezone.now()
    book.is_stale = False
    book.manual_review_needed = (book.metadata_quality_score < 50)

    book.save()

    # --- Authors: wipe + recreate to preserve merger-supplied order ---
    BookAuthor.objects.filter(book=book).delete()
    new_rows = []
    seen_author_ids: set[int] = set()
    for order, raw_name in enumerate(merged.authors or []):
        author = _get_or_create_author(raw_name)
        if author is None or author.id in seen_author_ids:
            continue
        seen_author_ids.add(author.id)
        new_rows.append(BookAuthor(book=book, author=author, order=order, role="author"))
    if new_rows:
        BookAuthor.objects.bulk_create(new_rows, batch_size=100)

    logger.info(
        "Enriched Book #%s (isbn_13=%s): score=%d, %d authors, sources=%s",
        book.id, book.isbn_13, book.metadata_quality_score,
        len(new_rows), book.sources.get("contributing", []),
    )
    return book


def enrich_book(book: Book, force_refresh: bool = False) -> Book:
    """Resolve metadata for `book` and persist it. Convenience wrapper.

    Uses `book.isbn_13` (preferred) or `book.isbn_10` to drive the cascade.
    Raises ValueError if neither is set.

    `force_refresh=True` bypasses both the filesystem cache and the
    ISBNNotFoundCache suppression check (PRD §12.5 invalidation rule:
    "Filesystem cache invalidated only on: explicit force_refresh=true...").
    Use this for admin "Re-fetch" actions or after fixing a source-side
    issue that previously caused an all-miss.
    """
    isbn = (book.isbn_13 or book.isbn_10 or "").strip()
    if not isbn:
        raise ValueError(f"Book #{book.id} has no isbn_13 or isbn_10 to resolve.")

    merged = get_book_metadata_sync(isbn, force_refresh=force_refresh)
    return persist_merged_book(book, merged)
