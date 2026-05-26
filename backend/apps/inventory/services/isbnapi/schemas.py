"""
Normalized schema for book metadata.
All sources are normalized into this common shape before merging.
"""

from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime


@dataclass
class NormalizedBook:
    title: Optional[str] = None
    subtitle: Optional[str] = None
    authors: list[str] = field(default_factory=list)
    isbn10: Optional[str] = None
    isbn13: Optional[str] = None
    publisher: Optional[str] = None
    published_date: Optional[str] = None
    description: Optional[str] = None
    page_count: Optional[int] = None
    categories: list[str] = field(default_factory=list)
    language: Optional[str] = None
    thumbnail: Optional[str] = None
    preview_link: Optional[str] = None
    # INTERNAL ONLY — never expose in public API responses. Used for source
    # merging, FX conversion, and analytics. UPCitemdb is the primary free
    # contributor; ISBNdb (paid) is the most authoritative when available.
    list_price_usd: Optional[float] = None
    source: Optional[str] = None  # which API this came from


@dataclass
class MergedBookResponse:
    title: Optional[str] = None
    subtitle: Optional[str] = None
    authors: list[str] = field(default_factory=list)
    isbn10: Optional[str] = None
    isbn13: Optional[str] = None
    publisher: Optional[str] = None
    published_date: Optional[str] = None
    description: Optional[str] = None
    page_count: Optional[int] = None
    categories: list[str] = field(default_factory=list)
    language: Optional[str] = None
    thumbnail: Optional[str] = None
    preview_link: Optional[str] = None
    # INTERNAL ONLY — see NormalizedBook above. Must be excluded from any
    # DRF serializer / GraphQL field / frontend payload.
    list_price_usd: Optional[float] = None
    confidence: int = 0
    sources: list[str] = field(default_factory=list)
    field_origins: dict[str, str] = field(default_factory=dict)
    missing_fields: list[str] = field(default_factory=list)
    error: Optional[str] = None
    retryable: bool = False
    fetched_at: Optional[str] = None
    cached: bool = False

    def to_dict(self) -> dict:
        return {
            "title": self.title,
            "subtitle": self.subtitle,
            "authors": self.authors,
            "isbn10": self.isbn10,
            "isbn13": self.isbn13,
            "publisher": self.publisher,
            "published_date": self.published_date,
            "description": self.description,
            "page_count": self.page_count,
            "categories": self.categories,
            "language": self.language,
            "thumbnail": self.thumbnail,
            "preview_link": self.preview_link,
            "list_price_usd": self.list_price_usd,
            "confidence": self.confidence,
            "sources": self.sources,
            "field_origins": self.field_origins,
            "missing_fields": self.missing_fields,
            "error": self.error,
            "retryable": self.retryable,
            "fetched_at": self.fetched_at,
            "cached": self.cached,
        }
