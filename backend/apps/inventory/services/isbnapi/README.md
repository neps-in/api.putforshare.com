# book_metadata — Django Book Metadata Aggregator

Fetches, merges, and normalizes book metadata from **Google Books**, **Open Library**, and **ISBNDB** into a single response.

---

## Setup

### 1. Install dependencies

```bash
pip install httpx django
```

### 2. Add to INSTALLED_APPS

```python
# settings.py
INSTALLED_APPS = [
    ...
    "book_metadata",
]
```

### 3. Configure cache (Redis recommended)

```python
# settings.py
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": "redis://127.0.0.1:6379/1",
    }
}

# ISBNDB API key (get one at https://isbndb.com)
ISBNDB_API_KEY = "your_key_here"
```

### 4. Wire up URLs

```python
# project/urls.py
from django.urls import path, include

urlpatterns = [
    path("api/books/", include("book_metadata.urls")),
]
```

### 5. ASGI server required for async views

```bash
pip install uvicorn
uvicorn myproject.asgi:application
```

---

## API

### Fetch book metadata

```
GET /api/books/{isbn}/
```

Optional query param: `?refresh=true` — bypass cache for this request.

**Response (200)**

```json
{
  "title": "Dune",
  "authors": ["Frank Herbert"],
  "isbn10": null,
  "isbn13": "9780340960196",
  "publisher": "Hodder & Stoughton",
  "published_date": "1965-01-01",
  "description": "Set on the desert planet Arrakis...",
  "page_count": 412,
  "categories": ["Science Fiction"],
  "language": "en",
  "thumbnail": "https://images.isbndb.com/cover.jpg",
  "preview_link": "https://books.google.com/preview",
  "confidence": 85,
  "sources": ["google_books", "isbndb"],
  "missing_fields": ["isbn10"],
  "error": null,
  "retryable": false,
  "fetched_at": "2025-08-20T10:30:00+00:00"
}
```

**Response (404)** — no metadata found anywhere  
**Response (502)** — all APIs failed, retryable

### Invalidate cache

```
DELETE /api/books/{isbn}/cache/
```

---

## Programmatic usage

```python
import asyncio
from book_metadata.service import BookMetadataService

# Async
async def main():
    service = BookMetadataService()
    result = await service.get("9780340960196")
    print(result.title, result.confidence)

asyncio.run(main())

# Sync helper (outside event loop only)
from book_metadata.service import get_book_metadata_sync
result = get_book_metadata_sync("9780340960196")
```

---

## File structure

```
book_metadata/
├── __init__.py       # App entry point
├── apps.py           # Django AppConfig
├── schemas.py        # NormalizedBook + MergedBookResponse dataclasses
├── fetchers.py       # Per-source async fetchers + parallel runner
├── validators.py     # Field-level quality validators
├── merger.py         # Priority-based field merger + confidence scoring
├── cache.py          # Django cache read/write/invalidate
├── service.py        # Top-level orchestrator (BookMetadataService)
├── views.py          # Django views (GET metadata, DELETE cache)
├── urls.py           # URL patterns
└── tests.py          # Unit + integration tests
```

---

## Running tests

```bash
python manage.py test book_metadata
```
