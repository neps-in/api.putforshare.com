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
Django>=5.0,<5.2
djangorestframework>=3.15
django-environ>=0.11
psycopg2-binary>=2.9
```

### 6.2 Async tasks & caching

```
celery>=5.4
redis>=5.0
django-redis>=5.4
django-celery-beat>=2.6        # periodic refresh jobs
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
                       │  Persist Book + Covers   │
                       │  Cache in Redis (30d)    │
                       └────────────┬─────────────┘
                                    ▼
                              Return payload
```

---

## 8. Data Model

Implement these as Django models. SQL types are PostgreSQL.

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
| `binding`                | CharField(50), blank                     | "paperback", "hardcover", "ebook", "unknown"                                  |
| `edition`                | CharField(100), blank                    |                                                                               |
| `categories`             | JSONField, default=list                  | list of strings                                                               |
| `list_price_inr`         | DecimalField(10,2), nullable             |                                                                               |
| `list_price_usd`         | DecimalField(10,2), nullable             |                                                                               |
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

### 8.4 `BookCover`

| Field         | Type           | Notes                                               |
| ------------- | -------------- | --------------------------------------------------- |
| `book`        | FK Book        |                                                     |
| `size`        | CharField(20)  | "thumbnail", "small", "medium", "large", "original" |
| `format`      | CharField(10)  | "webp", "jpeg"                                      |
| `width`       | IntegerField   |                                                     |
| `height`      | IntegerField   |                                                     |
| `bytes`       | IntegerField   |                                                     |
| `cdn_url`     | URLField(500)  | Bunny CDN URL                                       |
| `storage_key` | CharField(500) | path in Bunny Storage                               |
| `source`      | CharField(50)  | "google", "openlibrary", "manual"                   |
| `created_at`  | auto           |                                                     |

Unique constraint on `(book, size, format)`.

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

- [ ] **0.1** Create new Django app: `python manage.py startapp isbn_resolver`
- [ ] **0.2** Add to `INSTALLED_APPS`: `'isbn_resolver'`, `'rest_framework'`, `'django_celery_beat'`
- [ ] **0.3** Configure environment via `django-environ`. Required env vars:
  - `DATABASE_URL`
  - `REDIS_URL`
  - `GOOGLE_BOOKS_API_KEY` (optional, raises quota)
  - `ISBNDB_API_KEY` (optional, Tier 3)
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
- [ ] **3.4** Per adapter, write tests using `respx` to mock responses. Include real fixtures captured from each API (one popular book, one Indian book, one missing book).

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
    "list_price_usd":  ["isbndb", "google"],
    "cover":           ["openlibrary", "google", "isbndb"],
}
```

- [ ] **4.4** Merger: for each field, walk priority list, take first non-null value, record origin in `field_origins`.
- [ ] **4.5** Tests: cascade with all sources hit, cascade with Tier 1 sufficient, cascade with all sources missing, source-disagreement scenarios.

### Phase 5 — Cover image pipeline

- [ ] **5.1** Create `isbn_resolver/covers/fetcher.py`
  - `async fetch_best_cover(cover_candidates: list[dict]) -> tuple[bytes, str]`
  - Try candidates in order (largest first). Validate it's a real image (min 100×150, not the "no cover" placeholder Google returns).
  - Return raw bytes + MIME type.
- [ ] **5.2** Detect Google's "no image" placeholder by hashing known placeholder bytes; reject.
- [ ] **5.3** Create `isbn_resolver/covers/processor.py`
  - `process_cover(raw: bytes, isbn_13: str) -> list[CoverVariant]`
  - Strip EXIF on load.
  - Generate sizes: thumbnail (150×225), small (300×450), medium (600×900), large (1200×1800).
  - Maintain aspect ratio; pad with neutral background if source aspect is off.
  - For each size, emit WebP (q=80) and JPEG (q=85, progressive).
  - Skip "large" if source is smaller than 1200px wide (don't upscale).
- [ ] **5.4** Create `isbn_resolver/covers/storage.py`
  - Upload to Bunny Storage at key `covers/{isbn_13[:3]}/{isbn_13}/{size}.{format}`. The `[:3]` prefix shards across folders for large catalogues.
  - Return public CDN URL: `https://{BUNNY_CDN_HOSTNAME}/{storage_key}`
- [ ] **5.5** Placeholder cover generator: if no cover found from any source, render a Pillow-generated placeholder showing title + author in neutral colors. Store as `source="generated"`.
- [ ] **5.6** Tests: process real JPEG, process malformed image (should not crash), process tiny image (no upscale), Bunny upload mocked.

### Phase 6 — Resolver service + persistence

- [ ] **6.1** Create `isbn_resolver/service.py` with `resolve_isbn(raw_isbn: str, force_refresh: bool = False) -> Book`
- [ ] **6.2** Flow:
  1. Normalize ISBN (Phase 1).
  2. If `not force_refresh`: check DB for existing `Book` by `isbn_13` or `isbn_10`. If found and not `is_stale`, return.
  3. Check `ISBNNotFoundCache`. If `retry_after > now()`, raise `BookNotFound`.
  4. Check Redis short-cache (`isbn_resolver:miss:{isbn}`, 24h TTL).
  5. Run cascade (Phase 4) — call via `asyncio.run` inside Celery task, or expose sync wrapper.
  6. If no data: increment `ISBNNotFoundCache.attempts`, set `retry_after` via backoff schedule, raise `BookNotFound`.
  7. Run cover pipeline (Phase 5).
  8. Persist `Book`, `Author`s, `BookAuthor`s, `BookCover`s in a transaction.
  9. Set Redis cache for the full payload (30 day TTL).
  10. Return `Book` instance.
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
- [ ] **8.2** Serializers: `BookSerializer` (with nested authors, covers as dict of `{size: {webp: url, jpeg: url}}`).
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

| Layer                                  | TTL                                              | Purpose                               |
| -------------------------------------- | ------------------------------------------------ | ------------------------------------- |
| Redis hot cache (book payload by ISBN) | 30 days                                          | Sub-50ms reads                        |
| Redis miss cache                       | 24 hours                                         | Avoid retry storms on known-bad ISBNs |
| `ISBNNotFoundCache` (DB)               | Exponential backoff: 1d → 7d → 30d → 90d → never | Long-term suppression                 |
| `Book.is_stale` flag                   | 12 months                                        | Periodic refresh                      |
| Bunny CDN edge                         | 30 days                                          | Image delivery                        |

Invalidate Redis book cache on: manual admin edit, force_refresh, re-enrichment task completion.

---

## 13. Rate Limiting & Quota Management

| Source                  | Limit               | Implementation                              |
| ----------------------- | ------------------- | ------------------------------------------- |
| Google Books (no key)   | 1K/day              | Don't deploy without key                    |
| Google Books (with key) | 100K/day            | Token bucket; alert at 80% daily quota      |
| Open Library            | ~100 req/min polite | `ratelimit` decorator: 100/60s              |
| ISBNdb                  | per-plan            | Check headers, respect 429 with Retry-After |

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
