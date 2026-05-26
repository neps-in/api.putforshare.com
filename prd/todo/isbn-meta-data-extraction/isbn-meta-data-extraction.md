# PRD: ISBN Metadata Resolver Service

**Audience:** AI coding agents and human developers implementing this system
**Author:** GrandAppStudio (Napoleon Arouldas)
**Status:** Draft v1.0
**Stack:** Django + Python, Celery + Redis, Bunny Storage/CDN, AWS Lightsail VPS

---

## 1. Purpose

Build a Django service that, given an ISBN-10 or ISBN-13, returns enriched book metadata (title, authors, description, edition, cover type, publisher, year, page count, pricing) along with normalized, self-hosted cover images in multiple sizes and formats. The system must achieve **95–97% coverage at near-zero cost**, with a documented upgrade path to ~99% via paid sources and crowdsourced fallback.

This PRD is the single source of truth for implementation. Every section is a build task. Follow them in order.

---

## 2. Non-Goals

- Not a public-facing book search engine. Lookup is by ISBN only.
- Not real-time price tracking. Pricing is snapshot-at-fetch.
- Not a reviews/ratings aggregator.
- Not OCR/barcode scanning (caller is responsible for providing a clean ISBN string).
- **Books-only enrichment scope.** This service enriches exclusively the `Book` model. `Book` extends the shared `Product` base (polymorphism on `Product` is intentional and load-bearing — `Soap(Product)` and other types coexist), but the ISBN cascade, source adapters, cover pipeline, and book-specific fields (`isbn_10`, `isbn_13`, `metadata_quality_score`, `field_origins`, `sources`, etc.) apply to books only. Non-book product types (soap, household goods, anything without an ISBN) have their own enrichment flows and must not invoke `resolve_isbn`. ISBN validation in Phase 1 is the first hard guard: any input that fails `stdnum.isbn.is_valid` is rejected before the cascade runs, so non-book SKUs cannot enter this pipeline.

---

## 3. Success Criteria

| Metric                                                    | Target        |
| --------------------------------------------------------- | ------------- |
| Coverage (any valid ISBN returns ≥title + author + cover) | ≥95%          |
| P50 latency, cache hit                                    | <50 ms        |
| P50 latency, cache miss (full cascade)                    | <4 s          |
| P95 latency, cache miss                                   | <10 s         |
| Cost per 1,000 lookups (steady state)                     | <₹10 (~$0.12) |
| Image storage per book (all sizes, both formats)          | <250 KB       |

---

## 4. External Services & APIs

### 4.1 Free, no-auth (Tier 1)

| Service                | Endpoint                                                                       | Limits                                | Used for                                                                           |
| ---------------------- | ------------------------------------------------------------------------------ | ------------------------------------- | ---------------------------------------------------------------------------------- |
| Google Books API       | `https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn}`                    | 1K/day no key, 100K/day with free key | title, authors, description, publisher, year, pages, categories, covers (S/M/L/XL) |
| Open Library Books API | `https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}&format=json&jscmd=data` | ~100 req/min polite cap               | metadata, editions, physical format                                                |
| Open Library Covers    | `https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg`                           | Same polite cap                       | cover images (S/M/L)                                                               |
| UPCitemdb (trial)      | `https://api.upcitemdb.com/prod/trial/lookup?upc={isbn_13}`                    | 100/day no key (trial), paid for more | **offers/pricing** (USD list price), cover image fallback. Title/authors unreliable (generic product DB) — do NOT consume |

### 4.2 Free with registration (Tier 2)

| Service              | Notes                                                             |
| -------------------- | ----------------------------------------------------------------- |
| Google Books API Key | Free, raises quota to 100K/day. Register at Google Cloud Console. |
| WorldCat Search API  | Free with OCLC key, slow approval. Optional.                      |

### 4.3 Paid (Tier 3, optional)

| Service | Pricing               | Used for                                                                        |
| ------- | --------------------- | ------------------------------------------------------------------------------- |
| ISBNdb  | ~$15/mo (10K queries) | binding type (paperback/hardcover), dimensions, MSRP — fields free sources miss |

### 4.4 India-specific fallback (Tier 4)

Manual / crowdsourced. Donor or seller submits a phone photo + form. No external API.

---

## 5. External Libraries Required

### 5.1 System-level (apt / OS packages)

```bash
apt-get install -y \
    libjpeg-dev \
    zlib1g-dev \
    libwebp-dev \
    libtiff-dev \
    libfreetype6-dev \
    libpq-dev \
    redis-server
```

- `libjpeg-dev`, `libwebp-dev`, `libtiff-dev`, `zlib1g-dev` — Pillow image format support
- `libfreetype6-dev` — Pillow font rendering (for placeholder covers)
- `libpq-dev` — psycopg2 build dependency
- `redis-server` — Celery broker + result backend + ISBN cache layer

### 5.2 External CLI tools (optional but recommended)

- **ImageMagick** (`apt install imagemagick`) — fallback image processor if Pillow chokes on a malformed JPEG
- **exiftool** (`apt install libimage-exiftool-perl`) — strip metadata from downloaded covers

---

## 6. Python / Django Packages Required

Pin versions at install time; the list below is for `requirements.txt`.

### 6.1 Core framework

```
Django>=5.2,<5.3            # LTS line; matches installed 5.2.11. Allow patch updates, block 5.3+ until intentional
djangorestframework>=3.15
python-decouple>=3.8        # CANONICAL config lib for this project — use for ALL env-var reads. Do NOT add django-environ or python-dotenv.
psycopg2-binary>=2.9        # only if migrating from sqlite to Postgres (currently db.sqlite3 in use)
```

### 6.2 Async tasks & caching

```
celery>=5.4
redis>=5.0                      # Python client — required by Celery as broker
# django-redis>=5.4             # DEFERRED — filesystem cache only in v1; add when §12.6 triggers fire
django-celery-beat>=2.6         # periodic refresh jobs
django-celery-results>=2.5      # task result persistence (optional)
```

### 6.3 HTTP & resilience

```
httpx>=0.27                     # async HTTP, preferred over requests
requests>=2.32                  # sync fallback
tenacity>=8.5                   # retry decorators with exponential backoff
ratelimit>=2.2                  # per-source rate limiting
```

### 6.4 ISBN handling

```
python-stdnum>=1.20             # ISBN validation, 10↔13 conversion, checksum
```

### 6.5 Image processing

```
Pillow>=10.4                    # primary image lib (JPEG, PNG, WebP)
pillow-heif>=0.18               # HEIC support if donors upload iPhone photos
```

### 6.6 Storage (Bunny)

```
boto3>=1.34                     # Bunny Storage exposes S3-compatible API; or use raw httpx
```

### 6.7 Observability & ops

```
sentry-sdk>=2.10                # error tracking
structlog>=24.1                 # structured logging
django-extensions>=3.2          # shell_plus, runserver_plus
```

### 6.8 Dev / test

```
pytest>=8.3
pytest-django>=4.8
pytest-asyncio>=0.23
responses>=0.25                 # mock requests
respx>=0.21                     # mock httpx
factory-boy>=3.3
freezegun>=1.5
```

---

## 7. Architecture Overview

```
                       ┌──────────────────────┐
   ISBN ─────────────▶ │  resolve_isbn(isbn)  │
                       └──────────┬───────────┘
                                  │
                  ┌───────────────┴────────────────┐
                  ▼                                ▼
        ┌─────────────────┐              ┌──────────────────┐
        │ ISBN Normalize  │              │  DB Cache Check  │ ── hit ──▶ return
        │ (stdnum)        │              │  (Book by 10/13) │
        └────────┬────────┘              └────────┬─────────┘
                 │                                │ miss
                 ▼                                ▼
                       ┌──────────────────────────┐
                       │  Source Cascade (Celery) │
                       │  ┌────────┐ ┌─────────┐  │
                       │  │ Google │ │ OpenLib │  │  parallel
                       │  └────┬───┘ └────┬────┘  │
                       │       └────┬─────┘       │
                       │            ▼             │
                       │   Field-priority merge   │
                       │            │             │
                       │   Completeness check     │
                       │            │             │
                       │   Tier 2/3 if incomplete │
                       └────────────┬─────────────┘
                                    ▼
                       ┌──────────────────────────┐
                       │  Cover pipeline          │
                       │  download → resize →     │
                       │  WebP+JPEG → Bunny CDN   │
                       └────────────┬─────────────┘
                                    ▼
                       ┌──────────────────────────┐
                       │  Write raw responses     │
                       │  to filesystem (perm.)   │
                       │  + symlink isbn10↔isbn13 │
                       │  Persist Book + Covers   │
                       └────────────┬─────────────┘
                                    ▼
                              Return payload
```

---

## 8. Data Model

Implement these as Django models. SQL types are PostgreSQL.

**Scope:** The models in this section live inside the existing `apps/inventory/` app alongside other product types. `Book` extends the shared `Product` base (`class Book(Product):`) — that polymorphism is intentional, since books share generic product attributes (sku, prices, dimensions, seller, etc.) with other catalogue items. The **book-specific** tables (`Author`, `BookAuthor`, `ISBNLookupLog`, `ISBNNotFoundCache`) and the ISBN enrichment service apply to books only; non-book product types (soap, household goods, etc.) do not share these tables or invoke this enrichment pipeline.

**Existing implementation:** Several models below are already present in `apps/inventory/models.py` (`Product`, `Book`, `Author`, `Publisher`, `Soap`, `ISBNLookupLog`). Treat this section as the **target schema** — implementation work is reconciling gaps (missing `BookAuthor` through table, missing `ISBNNotFoundCache`, missing `subtitle`/price fields on `Book`), not greenfield model creation. Note: PRD's `binding` field is already implemented as `Book.cover_type`.

**Covers are out of scope.** No `BookCover` model. Book cover images will piggyback on the existing product-image system (`apps.photos` / `Product` image flow) in a later phase; the resolver only carries a thumbnail URL on `MergedBookResponse`.

### 8.1 `Book`

| Field                    | Type                                     | Notes                                                                         |
| ------------------------ | ---------------------------------------- | ----------------------------------------------------------------------------- |
| `id`                     | BigAutoField PK                          |                                                                               |
| `isbn_10`                | CharField(10), unique, nullable, indexed |                                                                               |
| `isbn_13`                | CharField(13), unique, indexed           | always populated when derivable                                               |
| `title`                  | CharField(500)                           |                                                                               |
| `subtitle`               | CharField(500), blank                    |                                                                               |
| `description`            | TextField, blank                         |                                                                               |
| `publisher`              | CharField(255), blank                    |                                                                               |
| `published_date`         | CharField(20), blank                     | raw string; APIs return "2019", "2019-03", "2019-03-15"                       |
| `published_year`         | IntegerField, nullable, indexed          | parsed from above                                                             |
| `page_count`             | IntegerField, nullable                   |                                                                               |
| `language`               | CharField(10), blank                     | ISO 639-1                                                                     |
| `binding`                | _persisted as `Book.cover_type` (existing model)_ | "paperback", "hardcover", "ebook", "unknown". Resolver writes the binding value to `Book.cover_type` — no new column needed. |
| `edition`                | CharField(100), blank                    |                                                                               |
| `categories`             | JSONField, default=list                  | list of strings                                                               |
| `list_price_inr`         | DecimalField(10,2), nullable             | **Customer-facing.** The only price surfaced in public API responses.         |
| `list_price_usd`         | DecimalField(10,2), nullable             | **Internal only.** Never expose in public API. Used for source merging, INR conversion, and analytics. |
| `metadata_quality_score` | IntegerField, default=0                  | 0–100; see §10                                                                |
| `sources`                | JSONField, default=dict                  | `{"google": {...raw}, "openlibrary": {...raw}}` for audit                     |
| `field_origins`          | JSONField, default=dict                  | `{"title": "google", "binding": "isbndb"}` — which source provided each value |
| `last_fetched_at`        | DateTimeField                            |                                                                               |
| `last_refreshed_at`      | DateTimeField, nullable                  |                                                                               |
| `is_stale`               | BooleanField, default=False              | flagged after 12 months                                                       |
| `manual_review_needed`   | BooleanField, default=False              |                                                                               |
| `created_at`             | auto                                     |                                                                               |
| `updated_at`             | auto                                     |                                                                               |

Indexes: `isbn_10`, `isbn_13`, `published_year`, `metadata_quality_score`, `(is_stale, last_fetched_at)`.

### 8.2 `Author`

| Field             | Type                    |
| ----------------- | ----------------------- | -------------------------------------- |
| `id`              | PK                      |
| `name`            | CharField(255), indexed |
| `normalized_name` | CharField(255), indexed | lowercase, accent-stripped, for dedupe |

### 8.3 `BookAuthor` (M2M through)

| Field    | Type          |
| -------- | ------------- | ----------------------------------------------- |
| `book`   | FK Book       |
| `author` | FK Author     |
| `order`  | IntegerField  | preserve author order                           |
| `role`   | CharField(50) | "author", "editor", "translator", "illustrator" |

Unique constraint on `(book, author, role)`.

### 8.4 ~~`BookCover`~~ — DEFERRED

**Removed from scope.** Book cover images will use the existing product-image system (`apps.photos` / `Product` image flow) in a later phase. The resolver only surfaces a thumbnail URL via `MergedBookResponse.thumbnail` (string); persistent multi-size cover storage is out of scope for this PRD. See PRD §5 for the matching scope reduction on the cover pipeline.

### 8.5 `ISBNLookupLog`

For analytics, debugging, and quota tracking.

| Field         | Type                   |
| ------------- | ---------------------- | -------------------------------------- |
| `isbn`        | CharField(13), indexed |
| `source`      | CharField(50)          |
| `status`      | CharField(20)          | "hit", "miss", "error", "rate_limited" |
| `latency_ms`  | IntegerField           |
| `http_status` | IntegerField, nullable |
| `error`       | TextField, blank       |
| `created_at`  | auto, indexed          |

### 8.6 `ISBNNotFoundCache`

Track ISBNs that returned nothing, so we don't retry constantly.

| Field             | Type                  |
| ----------------- | --------------------- | -------------------------------- |
| `isbn_13`         | CharField(13), unique |
| `attempts`        | IntegerField          |                                  |
| `last_attempt_at` | DateTimeField         |
| `retry_after`     | DateTimeField         | exponential: 1d → 7d → 30d → 90d |

---

## 9. Step-by-Step Implementation Tasks

Execute in this order. Each step is independently testable.

### Phase 0 — Project setup

- [ ] **0.1** **Use the existing `apps/inventory/` app and its `services/isbnapi/` package** — already scaffolded with `sources/{base,google_books,open_library,isbndb}.py`, `isbn.py`, `merger.py`, `schemas.py`, `service.py`, `cache.py`, `views.py`, `urls.py`, `validators.py`, `tests.py`. **Do not create a new `isbn_resolver` app.** Book-related models (`Book`, `Author`, `Publisher`, `ISBNLookupLog`) already live in `apps/inventory/models.py` alongside `Product` and `Soap`.
- [ ] **0.2** Confirm `INSTALLED_APPS` contains: `'apps.inventory'`, `'rest_framework'`, `'django_celery_beat'`. (Already present.)
- [ ] **0.3** Configure environment via `python-decouple` — `from decouple import config; FOO = config("FOO", default=..., cast=...)`. Decouple auto-loads `.env` files; do **not** use `django-environ`, raw `os.environ.get()`, or `python-dotenv.load_dotenv()` in new code. Required env vars:
  - `DATABASE_URL`
  - `REDIS_URL`
  - `GOOGLE_BOOKS_API_KEY` (optional, raises quota)
  - `ISBNDB_API_KEY` (optional, Tier 3)
  - `UPCITEMDB_API_KEY` (optional, raises trial quota beyond 100/day)
  - `BUNNY_STORAGE_ZONE`
  - `BUNNY_STORAGE_ACCESS_KEY`
  - `BUNNY_CDN_HOSTNAME`
  - `SENTRY_DSN`
- [ ] **0.4** Configure Celery (`celery.py` at project root) with Redis broker and result backend. Define queues: `default`, `enrichment`, `images`.
- [ ] **0.5** Configure structlog for JSON logs in production, pretty logs in dev.
- [ ] **0.6** Add Sentry init in `settings.py`.

### Phase 1 — ISBN normalization

- [ ] **1.1** Create `isbn_resolver/utils/isbn.py` with:
  - `clean(raw: str) -> str` — strip whitespace, hyphens, "ISBN:" prefix, uppercase any 'X' check digit
  - `validate(isbn: str) -> bool` — uses `stdnum.isbn.is_valid`
  - `to_isbn13(isbn: str) -> str` — uses `stdnum.isbn.to_isbn13`
  - `to_isbn10(isbn: str) -> str | None` — `stdnum.isbn.to_isbn10`; None if ISBN-13 starts with 979
  - `normalize(raw: str) -> dict` — returns `{"isbn_10": ..., "isbn_13": ...}`, raises `InvalidISBN` if bad checksum
- [ ] **1.2** Unit tests covering: valid 10, valid 13, invalid checksum, hyphenated input, lowercase 'x', empty string, 979-prefix (no ISBN-10 form).

### Phase 2 — Source adapter framework

- [ ] **2.1** Define `isbn_resolver/sources/base.py`:

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass, field

@dataclass
class SourceResult:
    found: bool
    raw: dict = field(default_factory=dict)
    normalized: dict = field(default_factory=dict)  # canonical schema
    cover_urls: list[dict] = field(default_factory=list)  # [{"url": ..., "size_hint": "large"}]
    source: str = ""
    latency_ms: int = 0
    error: str | None = None

class BookSource(ABC):
    name: str = ""
    priority: int = 100  # lower = higher priority
    enabled: bool = True

    @abstractmethod
    async def fetch(self, isbn_13: str) -> SourceResult: ...
```

- [ ] **2.2** Define canonical normalized schema (`isbn_resolver/sources/schema.py`) — same field names as `Book` model. Every adapter must map to this.
- [ ] **2.3** Add `tenacity` retry decorator with exponential backoff (2s, 4s, 8s) on transient HTTP errors (5xx, timeouts). Do NOT retry on 404.
- [ ] **2.4** Add per-source rate limiter using `ratelimit` (Open Library: 100/min; Google: 100/100s default).
- [ ] **2.5** Wrap every fetch in a `try/except` that logs to `ISBNLookupLog`.

### Phase 3 — Source adapters

- [ ] **3.0** **Migrate existing adapters from sync `requests` to async `httpx.AsyncClient`.** The current adapters at `apps/inventory/services/isbnapi/sources/{google_books,open_library,isbndb}.py` use blocking `requests` — this prevents true parallelism in the Phase 4 cascade (`asyncio.gather` over sync calls only fans out via a threadpool, blocks the event loop, and serializes under load). Replace with a shared `httpx.AsyncClient` instance (one per process, reused across calls — see `httpx` docs for connection pooling). Update `BookSource.fetch` signature to `async def`, port retry logic to `httpx`-compatible exceptions (`httpx.HTTPError`, `httpx.TimeoutException`), and remove `requests` from `requirements.txt` for this module. The async DRF view at `views.py:BookMetadataView` already expects this.
- [ ] **3.1** `GoogleBooksSource` (`sources/google_books.py`)
  - Fetch `https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn_13}&key={key}`
  - Map fields: `volumeInfo.title`, `subtitle`, `authors[]`, `publisher`, `publishedDate`, `description`, `pageCount`, `categories[]`, `language`, `imageLinks.{smallThumbnail, thumbnail, small, medium, large, extraLarge}`
  - Handle missing volumeInfo gracefully
- [ ] **3.2** `OpenLibrarySource` (`sources/open_library.py`)
  - Fetch `https://openlibrary.org/api/books?bibkeys=ISBN:{isbn_13}&format=json&jscmd=data`
  - Map fields: `title`, `subtitle`, `authors[].name`, `publishers[].name`, `publish_date`, `number_of_pages`, `physical_format` → `binding`, `subjects[].name` → `categories`, `cover.{small,medium,large}`
- [ ] **3.3** `ISBNdbSource` (`sources/isbndb.py`) — only if `ISBNDB_API_KEY` is set
  - Fetch `https://api2.isbndb.com/book/{isbn}` with `Authorization: {key}` header
  - Map fields, including `binding`, `dimensions`, `msrp`
- [ ] **3.4** `UPCitemdbSource` (`sources/upcitemdb.py`)
  - Fetch `https://api.upcitemdb.com/prod/trial/lookup?upc={isbn_13}` (no auth) — or `https://api.upcitemdb.com/prod/v1/lookup` with `user_key` header if `UPCITEMDB_API_KEY` is set.
  - **Narrow scope** — only map `items[0].offers[].price` → `list_price_usd` (take the lowest non-zero offer) and `items[0].images[]` → cover candidates.
  - **Do NOT consume** `title`, `brand`, or any author-like field. UPCitemdb is a generic product DB; book metadata is unreliable and authors are typically embedded in the title string. Title/author must come from Google or Open Library.
  - Handle empty `items[]` (ISBN not in catalogue) and `code: "INVALID_UPC"` gracefully — return `SourceResult(found=False)`.
  - On `429` or `code: "EXCEED_LIMIT"`, mark source `temporarily_disabled` in Redis for 5 min (per §13).
- [ ] **3.5** Per adapter, write tests using `respx` to mock responses. Include real fixtures captured from each API (one popular book, one Indian book, one missing book).

### Phase 4 — Cascade orchestrator

- [ ] **4.1** Create `isbn_resolver/orchestrator.py` with `async def cascade(isbn_13: str) -> dict`
- [ ] **4.2** Logic:
  1. Run Tier 1 sources (Google + Open Library) **in parallel** with `asyncio.gather`.
  2. Merge results using field-priority map (see 4.3).
  3. Compute completeness score (see §10). If ≥80, stop. Else escalate.
  4. If Tier 3 configured, call ISBNdb. Re-merge.
  5. Return merged dict.
- [ ] **4.3** Field priority map in `settings.py`:

```python
FIELD_SOURCE_PRIORITY = {
    "title":           ["google", "isbndb", "openlibrary"],
    "subtitle":        ["google", "isbndb", "openlibrary"],
    "description":     ["google", "openlibrary", "isbndb"],
    "authors":         ["google", "openlibrary", "isbndb"],
    "publisher":       ["openlibrary", "google", "isbndb"],
    "published_date":  ["google", "openlibrary", "isbndb"],
    "page_count":      ["google", "openlibrary", "isbndb"],
    "categories":      ["google", "openlibrary"],
    "language":        ["google", "openlibrary"],
    "binding":         ["isbndb", "openlibrary"],
    "list_price_usd":  ["isbndb", "upcitemdb", "google"],   # internal use only — see §8.1
    "cover":           ["openlibrary", "google", "upcitemdb", "isbndb"],
}
```

- [ ] **4.4** Merger: for each field, walk priority list, take first non-null value, record origin in `field_origins`.
- [ ] **4.5** Tests: cascade with all sources hit, cascade with Tier 1 sufficient, cascade with all sources missing, source-disagreement scenarios.

### Phase 5 — ~~Cover image pipeline~~ DEFERRED

**Out of scope for this PRD.** Book cover images will be ingested via the existing product-image system (`apps.photos` / `Product` image flow) in a later phase. The resolver only carries a thumbnail URL on `MergedBookResponse.thumbnail` — downstream product-image ingestion (when wired up) consumes that URL.

- [ ] **5.1** Resolver must populate `MergedBookResponse.thumbnail` with the best validated URL from the cascade (covered by `merger._pick_thumbnail`, already implemented).
- [ ] **5.2** When the resolver persists to `Book`, write the thumbnail URL to whatever field the product-image pipeline expects (TBD when the photo integration is designed).

§8.4 (`BookCover` model), §11 (image-strategy decisions), and all `covers/` subpackage tasks are removed from this PRD's scope.

### Phase 6 — Resolver service + persistence

- [ ] **6.1** Create `isbn_resolver/service.py` with `resolve_isbn(raw_isbn: str, force_refresh: bool = False) -> Book`
- [ ] **6.2** Flow (matches §12.2 / §12.3):
  1. Normalize ISBN (Phase 1). Compute both `isbn_13` and `isbn_10` (if derivable — None for 979-prefix).
  2. **DB check** — if `not force_refresh`, look up existing `Book` by `isbn_13` or `isbn_10`. If found and not `is_stale`, return.
  3. **ISBNNotFoundCache check** — if `retry_after > now()`, raise `BookNotFound`.
  4. **Filesystem cache check** — open `backend/book_cache/inventory_bookapi/{isbn_13[:3]}/{isbn_13}.json` (or via `{isbn_10}.json` symlink if caller provided ISBN-10). If present, load cached merged payload, jump to step 7 (persist). **No external API call.**
  5. **Run cascade** (Phase 4) — via `asyncio.run` inside Celery task, or `async_to_sync` wrapper for sync callers.
  6. **Write merged payload to filesystem** — atomic write via `.{isbn_13}.json.tmp` + `os.replace` → `{isbn_13[:3]}/{isbn_13}.json`. If `isbn_10` derivable, create relative symlink `{isbn_10[:3]}/{isbn_10}.json → ../{isbn_13[:3]}/{isbn_13}.json`. If both files already exist (re-fetch), overwrite atomically.
  7. If no data from cascade: increment `ISBNNotFoundCache.attempts`, set `retry_after` via backoff schedule (1d → 7d → 30d → 90d), raise `BookNotFound`.
  8. Persist `Book`, `Author`s, `BookAuthor`s in a transaction. Write `merged.thumbnail` URL to whatever field the product-image pipeline expects (covers are deferred — see Phase 5).
  9. Return `Book` instance.
- [ ] **6.3** Author deduplication: normalize name (lowercase, strip accents via `unicodedata.normalize('NFKD', ...).encode('ascii', 'ignore')`), match on `normalized_name`. Create if missing.

### Phase 7 — Async tasks (Celery)

- [ ] **7.1** Create `isbn_resolver/tasks.py`:
  - `@shared_task def enrich_isbn_task(isbn: str, force_refresh: bool = False)`
  - `@shared_task def refresh_stale_books_task()` — finds books with `last_fetched_at < now - 1y`, enqueues re-enrichment in batches of 50
  - `@shared_task def cleanup_not_found_cache_task()` — purges entries older than 6 months
- [ ] **7.2** Configure Celery Beat schedules in `settings.py`:
  - `refresh_stale_books_task`: daily at 2 AM
  - `cleanup_not_found_cache_task`: weekly Sunday 3 AM
- [ ] **7.3** Set task `max_retries=3`, `default_retry_delay=60`, `acks_late=True`.

### Phase 8 — REST API

- [ ] **8.1** DRF endpoints (`isbn_resolver/api.py`):
  - `GET /api/v1/books/{isbn}/` — sync lookup, returns book or 404 (`?force_refresh=true` bypasses cache)
  - `POST /api/v1/books/enrich/` — body `{"isbn": "..."}` — enqueues async, returns task ID
  - `GET /api/v1/books/enrich/{task_id}/` — task status
  - `POST /api/v1/books/bulk/` — body `{"isbns": ["...", "..."]}` — bulk enqueue (max 100 per request)
- [ ] **8.2** Serializers: `BookSerializer` (with nested authors, covers as dict of `{size: {webp: url, jpeg: url}}`). **Must exclude `list_price_usd` from public output** — only `list_price_inr` is customer-facing. USD is stored for internal use only (source-priority merging, FX conversion, analytics) and must never appear in any DRF response, GraphQL field, or frontend payload. Add a regression test asserting `list_price_usd` is absent from the serialized representation.
- [ ] **8.3** Throttle: `100/hour` for unauthenticated, `10000/hour` for authenticated. Use DRF's throttle classes.
- [ ] **8.4** OpenAPI schema via `drf-spectacular` (add to packages if you want this).

### Phase 9 — Admin

- [ ] **9.1** Register `Book`, `Author`, `BookCover`, `ISBNLookupLog`, `ISBNNotFoundCache` in Django admin.
- [ ] **9.2** `BookAdmin` list display: `isbn_13`, `title`, primary author, `binding`, `metadata_quality_score`, `last_fetched_at`, cover thumbnail.
- [ ] **9.3** Admin actions:
  - "Re-enrich selected books" (triggers `enrich_isbn_task` with `force_refresh=True`)
  - "Mark as manual review needed"
  - "Regenerate covers" (re-run Phase 5 with stored original)

### Phase 10 — Manual fallback workflow

- [ ] **10.1** When `metadata_quality_score < 50` after cascade, set `manual_review_needed=True`.
- [ ] **10.2** Admin filter "Needs review" surfaces these.
- [ ] **10.3** Admin form allows manual upload of cover image + correction of fields. Manual cover uploads bypass cascade, go directly to Phase 5 processing.
- [ ] **10.4** (Optional) Public-facing form for sellers/donors to submit corrections, tied to your PutForShare flow.

### Phase 11 — Observability

- [ ] **11.1** Structlog event for every lookup: `isbn`, `source`, `cache_hit`, `latency_ms`, `quality_score`.
- [ ] **11.2** Daily metrics rollup task: emits to logs:
  - Lookups today (total, hit, miss)
  - Per-source success rate
  - Per-source avg latency
  - New books enriched
  - Covers downloaded (count, total bytes)
- [ ] **11.3** Sentry: all unhandled exceptions in tasks and API.
- [ ] **11.4** Health check endpoint `GET /healthz/` validates: DB, Redis, Bunny reachability.

### Phase 12 — Tests & CI

- [ ] **12.1** pytest config (`pytest.ini`), with `DJANGO_SETTINGS_MODULE=config.settings.test`.
- [ ] **12.2** Factories (`factory-boy`) for `Book`, `Author`, `BookCover`.
- [ ] **12.3** Fixture set: 20 captured real API responses across `tests/fixtures/`.
- [ ] **12.4** Integration test: end-to-end resolve with all external HTTP mocked via `respx`.
- [ ] **12.5** GitHub Actions workflow:
  - Lint (ruff)
  - Type check (mypy, optional)
  - Test (pytest, with PostgreSQL + Redis services)
  - Coverage threshold ≥80%
- [ ] **12.6** Coverage acceptance test: against a known fixture set of 100 ISBNs, assert cascade returns acceptable metadata for ≥95.

### Phase 13 — Deployment

- [ ] **13.1** Dockerfile (multi-stage: builder installs deps, runtime is slim).
- [ ] **13.2** `docker-compose.yml` for local dev: web, celery worker, celery beat, redis, postgres.
- [ ] **13.3** Hetzner VPS deploy:
  - Nginx → Gunicorn (web)
  - Systemd units for `celery worker`, `celery beat`
  - Symlink-swap zero-downtime deploy script (you have this pattern already)
- [ ] **13.4** Bunny CDN pull zone configured to point at Bunny Storage zone. Cache TTL: 30 days for images.
- [ ] **13.5** Cloudflare in front of API (DDoS, rate limiting at edge).

---

## 10. Quality Scoring

`metadata_quality_score` is computed at persist time. Each present field contributes points:

| Field                    | Points  |
| ------------------------ | ------- |
| title                    | 15      |
| ≥1 author                | 15      |
| description (≥100 chars) | 15      |
| cover (any size)         | 15      |
| publisher                | 8       |
| published_year           | 8       |
| page_count               | 8       |
| binding                  | 8       |
| categories (≥1)          | 4       |
| language                 | 2       |
| list price               | 2       |
| **Total possible**       | **100** |

Thresholds:

- ≥80 — sufficient, stop cascade
- 50–79 — usable, but try Tier 3 if available
- <50 — flag `manual_review_needed=True`

---

## 11. Image Strategy Decisions

These decisions are final. Do not deviate.

| Decision                       | Choice                                                            | Reason                                                     |
| ------------------------------ | ----------------------------------------------------------------- | ---------------------------------------------------------- |
| Download 1 image or all sizes? | **Download largest available, resize ourselves**                  | Consistent UX, control over quality, no hot-link fragility |
| Output formats                 | **WebP (primary) + JPEG (fallback)**                              | WebP ~30% smaller at same quality; JPEG for legacy clients |
| Skip AVIF?                     | **Yes for v1**                                                    | Encoding slow; gains marginal for low-detail book covers   |
| Sizes generated                | thumbnail 150×225, small 300×450, medium 600×900, large 1200×1800 | Covers ~all UI needs from grid to zoom                     |
| Upscale beyond source?         | **No**                                                            | Skip "large" size if source <1200px wide                   |
| Strip EXIF?                    | **Yes**                                                           | Smaller files, privacy                                     |
| Store original?                | **Yes**                                                           | Regenerate sizes/formats later without re-fetching         |
| Hot-link from APIs?            | **Never in production**                                           | URLs expire; rate limits apply; offline-fragile            |
| Quality settings               | WebP q=80, JPEG q=85 progressive                                  | Sweet spot for cover-style imagery                         |
| Storage path scheme            | `covers/{isbn_13[:3]}/{isbn_13}/{size}.{format}`                  | Shards across folders, predictable                         |

---

## 12. Caching Strategy

**v1 uses a single permanent filesystem cache** of raw per-source API responses, with PostgreSQL as the source of truth for merged book data. **No Redis hot cache.** The filesystem cache is the API-call avoider; the DB is the fast read path. Redis is intentionally deferred until measurements justify it (see "When to add Redis later" below).

| Layer                                                               | TTL                                              | Purpose                                                                                                                                                  |
| ------------------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Filesystem JSON cache** (`backend/book_cache/inventory_bookapi/`) | **Permanent — no TTL**                           | Stores **raw per-source API responses** keyed by ISBN. Prevents re-calling Google/OpenLibrary/ISBNdb/UPCitemdb on re-processing, deploys, merger upgrades, schema changes. The durable archive. |
| PostgreSQL `Book` row                                               | Authoritative, no expiry                         | Source of truth for merged data. Indexed on `isbn_13`, `isbn_10` — ~5–10 ms reads.                                                                       |
| `ISBNNotFoundCache` (DB)                                            | Exponential backoff: 1d → 7d → 30d → 90d → never | Suppress retries on ISBNs that returned nothing. Replaces the previously spec'd "Redis miss cache" — DB lookup is fast enough and survives restarts.     |
| `Book.is_stale` flag                                                | 12 months                                        | Periodic refresh trigger (Celery beat task).                                                                                                             |
| Bunny CDN edge                                                      | 30 days                                          | Cover image delivery.                                                                                                                                    |

### 12.1 Filename convention

- **Canonical filename:** `{isbn_13}.json` — ISBN-13 is always populated when derivable from ISBN-10, so it's the stable canonical form.
- **Symlink for ISBN-10:** if an ISBN-10 form exists (i.e., ISBN-13 starts with `978`), create a **relative symlink** `{isbn_10}.json → {isbn_13}.json` in the same directory. Lookups by either form resolve to the same physical file — no duplicate storage, no drift.
- **No symlink for 979-prefix:** ISBN-13s starting with `979` have no ISBN-10 equivalent — only the `.json` file exists.
- **Sharded path:** `backend/book_cache/inventory_bookapi/{isbn_13[:3]}/{isbn_13}.json` (3-char prefix shards directories for large catalogues; matches the cover-storage scheme in §11). Symlink lives alongside the canonical file in the same shard directory.
- **Symlink creation must be atomic:** write `{isbn_13}.json.tmp` first, `os.replace()` into place, then `os.symlink()` the ISBN-10 alias. If the symlink target already exists (re-fetch), `os.replace()` the symlink too.

### 12.2 Read order on lookup (`resolve_isbn`)

1. **DB `Book` row** by `isbn_13` OR `isbn_10` → hit returns in ~5–10 ms.
2. **Filesystem JSON cache** — open `{isbn_13[:3]}/{isbn_13}.json` (or follow the ISBN-10 symlink if input is ISBN-10). If present, load raw per-source responses, re-run the merger (Phase 4.4), persist `Book` to DB, return. **No external API call.** ~10–50 ms.
3. **External API cascade** (Phase 4) — only if both DB and filesystem miss. On success, write raw responses to filesystem and create symlink.

### 12.3 Write order on enrichment

1. **Filesystem JSON** — write `{isbn_13}.json` with raw per-source responses (atomic write via tmp + rename). Create relative symlink `{isbn_10}.json → {isbn_13}.json` if ISBN-10 derivable.
2. **DB** — `Book` + `Author` + `BookAuthor` + `BookCover` in one transaction.

### 12.4 Permanence rule

Raw response files have **no TTL**. The existing `_is_expired()` check in `apps/inventory/services/isbnapi/cache.py` must be **removed for raw-response reads** — files are permanent. Re-fetch only on explicit `force_refresh=true` query param or admin "Re-fetch raw" action.

### 12.5 Invalidation

- **Filesystem cache** invalidated only on: explicit `force_refresh=true` (overwrites the `.json` file; symlink stays valid since target name is unchanged) or admin "Re-fetch raw" action. **Never expires on its own.**
- **DB** never invalidated by caching; `is_stale` only flags for background refresh, never deletes.

### 12.6 When to add Redis later

Add a thin Redis hot layer in front of the filesystem cache only when one of these triggers fires:

- **Multi-host:** scale beyond one backend host (filesystem cache fragments per host).
- **High concurrency:** sustained >50 req/s (filesystem-write contention or stat-call latency becomes meaningful).
- **Measured bottleneck:** P50 latency profiling shows filesystem reads dominating, not DB or merging.

Not before. Premature Redis adds operational surface (RDB/AOF, eviction policy, invalidation race conditions) without user-visible gain at current scale.

---

## 13. Rate Limiting & Quota Management

| Source                  | Limit               | Implementation                              |
| ----------------------- | ------------------- | ------------------------------------------- |
| Google Books (no key)   | 1K/day              | Don't deploy without key                    |
| Google Books (with key) | 100K/day            | Token bucket; alert at 80% daily quota      |
| Open Library            | ~100 req/min polite | `ratelimit` decorator: 100/60s              |
| ISBNdb                  | per-plan            | Check headers, respect 429 with Retry-After |
| UPCitemdb (trial)       | 100/day             | Skip source after daily quota hit; honor 429 |
| UPCitemdb (paid)        | per-plan            | Token bucket per plan; honor 429             |

If any source hits rate limit, mark it `temporarily_disabled` for 5 minutes in Redis; cascade skips it gracefully.

---

## 14. Security & Compliance

- API keys in env vars only, never committed.
- Rate-limit public API endpoints (DRF throttling).
- Validate ISBN before any external call (prevents injection via crafted ISBN).
- Strip all metadata from stored images.
- Google Books TOS: technically prohibits long-term storage of their data. Mitigation: prefer Open Library (CC0) when both have equivalent data; document `field_origins` so we can scrub Google-sourced data if ever required.
- GDPR/DPDP: this system stores no personal data, only public book metadata.

---

## 15. Out of Scope (v1)

- Multilingual metadata enrichment beyond what APIs return natively
- Audiobook / ebook format variants
- Live pricing feeds (Flipkart/Amazon scrapers)
- Reviews, ratings, recommendations
- Public search UI (lookup by ISBN only)
- ML-based cover deduplication across editions

---

## 16. Open Questions (resolve before Phase 6)

1. **Manual-review workflow UX**: standalone Django admin only, or also a public-facing donor form embedded in PutForShare?
2. **Pricing source for India**: skip entirely, use ISBNdb MSRP (USD-only), or build a Flipkart scraper as a separate Tier 4 service?
3. **Multi-tenant**: is ISBN data shared across all PutForShare sellers, or namespaced per seller? (Recommendation: shared. Book metadata is not seller-specific.)
4. **Refresh cadence**: is 12 months for stale flag correct, or should high-value (frequently-viewed) books refresh more often?

---

## 17. Definition of Done

- [ ] All 13 phases completed and merged.
- [ ] Coverage acceptance test passes on 100-ISBN fixture set (≥95 successful).
- [ ] P50 cache-hit latency <50 ms on staging.
- [ ] P50 cache-miss latency <4 s on staging.
- [ ] Documentation: README with setup, env vars, API examples.
- [ ] Runbook: how to handle quota exhaustion, how to re-enrich a book, how to add a new source.
- [ ] Deployed to staging on Hetzner, sanity-tested with 1,000 real ISBNs from PutForShare donor data.

---

_End of PRD._
