# Changelog

# 27-May-2026

## [02:11 AM IST] ISBN resolver — Phase 11 observability

PRD §11.1, §11.2, §11.4. §11.3 (Sentry) was already wired in `settings.py` during the decouple migration.

### 11.1 — structlog events (6 events)

Configured in `settings.py` — JSON in production, console in dev. `service.py` emits per-decision events with consistent `isbn.*` prefix:

`isbn.invalid_input` · `isbn.cache_hit` · `isbn.suppressed` · `isbn.no_sources_enabled` · `isbn.all_miss` · `isbn.cascade_complete`

All include `latency_ms` measured from `time.monotonic()` at the start of `get()`.

### 11.2 — `daily_isbn_metrics_task`

Single annotated query against `ISBNLookupLog` for the last 24h, emitting `isbn.daily_metrics` event with per-source `total / hits / misses / errors / rate_limited / success_rate / avg_latency_ms` + totals + `new_books_enriched` (from `Book.last_fetched_at`). Beat: daily 04:00 UTC.

### 11.3 — Sentry

Already wired in `settings.py` during the decouple migration — listed here for completeness.

### 11.4 — `GET /healthz/`

Public, no auth. Three checks: **db** (`SELECT 1`), **redis** (`ping()` with 2s socket timeout), **filesystem_cache** (write/read/delete probe). Returns:

```json
{"status": "ok" | "degraded",
 "checks": {"db": {...}, "redis": {...}, "filesystem_cache": {...}}}
```

HTTP 200 when all ok, 503 if any fails. **Bunny CDN intentionally not probed** — covers are deferred per project memory.

### Sample real-world metrics (this dev DB, last 24h)

```
total_lookups: 43, distinct_isbns: 6, new_books_enriched: 1
  google_books  total=12 hits=0  success=  0.0%  avg=1041.5 ms
  open_library  total=12 hits=0  success=  0.0%  avg=7356.4 ms
```

Both 0% reflects the still-pending `GOOGLE_BOOKS_API_KEY` TODO and the AWS-IP block on Open Library.

### Pending

- `daily_isbn_metrics_task` output isn't currently shipped to any external store (just structlog → systemd journal). When a log collector (Loki, CloudWatch, etc.) is wired, the events are already structured for direct ingestion.
- The healthcheck doesn't probe Bunny CDN — see project memory.

## [02:05 AM IST] ISBN resolver — ISBNLookupLog purge cron

Closes the last gap from the Phase 9 changelog entry: `ISBNLookupLog` was growing unboundedly (one row per source per cascade attempt) with no purge.

### What landed

- New constant `LOOKUP_LOG_PURGE_DAYS = 90` in `apps/inventory/services/isbnapi/tasks.py`.
- New task `cleanup_isbn_lookup_log_task()` — single `DELETE` of rows whose `created_on < now - 90 days`. Returns `{"deleted": N, "cutoff": "..."}`.
- New beat entry `isbn-cleanup-lookup-log-weekly` — `crontab(hour=3, minute=30, day_of_week=0)`. Sundays 03:30 UTC, offset 30 minutes from the existing not-found-cache cleanup so the two deletes don't pile up.

### Why 90 days

| Window | Trade-off |
|---|---|
| 30 days | Smallest table; loses quarterly trend visibility |
| **90 days** (chosen) | Enough for trend analysis and post-incident forensics; keeps the table bounded |
| 180 days | Mirror of `cleanup_not_found_cache_task`; but lookup logs are higher-volume |
| Never | Unbounded growth; not viable at scale |

### Verified

| Path | Outcome |
|---|---|
| Plant 2 rows at `created_on = now - 100d` + 2 rows at `created_on = now - 30d` | seed succeeds |
| `cleanup_isbn_lookup_log_task.apply()` | `{"deleted": 2, "cutoff": "..."}` — only the 100d-old pair purged |
| Surviving rows | 2 (the 30d-old pair) — as expected |
| `celery -A config inspect registered` | `cleanup_isbn_lookup_log_task` listed alongside the other 3 ISBN tasks |

### State of all four resolver crons

```
isbn-refresh-stale-books-daily         daily   02:00 UTC
isbn-cleanup-not-found-cache-weekly    weekly  Sun 03:00 UTC  (180-day retention)
isbn-cleanup-lookup-log-weekly         weekly  Sun 03:30 UTC  (90-day retention)
enrich_isbn_task                       on-demand only
```

## [02:00 AM IST] ISBN resolver — Phase 9 admin

PRD §9.1 + §9.2 + §9.3 (cover-related items skipped per the deferred-covers decision). All new admin surfaces in `apps/inventory/admin.py`.

### BookAdmin — resolver-aware columns + manual-review workflow

| Surface | Before | After |
|---|---|---|
| `list_display` | name, uuid, sku, publisher, is_active | **isbn_13**, name, **primary_author** (computed), **cover_type**, **metadata_quality_score**, **manual_review_needed**, **is_stale**, **last_fetched_at** |
| `list_filter` | is_active, publisher, category | + **manual_review_needed**, **is_stale**, **cover_type** |
| `search_fields` | name, sku, uuid, isbn_10, isbn_13 | + **subtitle**, **authors__name** |
| `readonly_fields` | (none) | **last_fetched_at**, **last_refreshed_at**, **sources**, **field_origins** (resolver-owned columns) |
| `ordering` | (default) | **`-last_fetched_at`** (freshly-enriched first) |
| `inlines` | BookAuthorInline | unchanged |

`get_queryset` now does `select_related("publisher").prefetch_related("book_authors__author")` so the `primary_author` column doesn't N+1.

Three new actions:

| Action | What it does |
|---|---|
| **Re-enrich selected books (force_refresh=True)** | For each selected book with an ISBN, calls `enrich_isbn_task.delay(isbn, force_refresh=True)`. Books without isbn_13 OR isbn_10 are skipped, count shown in the success message. |
| **Mark as manual review needed** | `queryset.update(manual_review_needed=True)`. |
| **Clear manual review flag** | `queryset.update(manual_review_needed=False)`. |

The PRD's **"Regenerate covers"** action is intentionally absent — covers are deferred to the existing product-image system, not the resolver.

### New admin pages

**ISBNLookupLog** — read-only audit view of every cascade fetch. `has_add_permission()` and `has_change_permission()` both return False; delete only for superusers (lets us bulk-purge old rows by hand until a periodic purge task is added). Columns: `created_on, isbn, source, status, http_status, latency_ms`. Filters: source, status, created_on. `date_hierarchy="created_on"` for fast time-slicing.

**ISBNNotFoundCache** — suppression rows for ISBNs no source has metadata for. Columns: `isbn_13, attempts, is_active_suppression (computed bool), last_attempt_at, retry_after`. Action **"Clear suppression"** deletes selected rows so the next lookup runs the cascade. `has_add_permission()` returns False — rows are written by the resolver only.

### AuthorAdmin — better dedup support + book-count column

- `list_display` adds **`normalized_name`** and **`book_count`** (number of BookAuthor links).
- `search_fields` adds **`normalized_name`** so admins can find dedup candidates.
- `readonly_fields` adds `normalized_name` (computed by the resolver / `_normalize_author_name`).
- `book_count` uses `Count("author_books")` annotation on the queryset, not a per-row count, so the changelist doesn't N+1.

### Verified

| Path | Outcome |
|---|---|
| `GET /admin/inventory/book/` (superuser) | `200` |
| `GET /admin/inventory/author/` (superuser) | `200` |
| `GET /admin/inventory/isbnlookuplog/` (superuser) | `200` |
| `GET /admin/inventory/isbnnotfoundcache/` (superuser) | `200` |
| `GET /admin/inventory/book/1509/change/` | `200`, `last_fetched_at` readonly visible |
| `BookAdmin.reenrich_books` action with 5 selected (3 with isbn_13, 2 without) | `.delay()` called 3 times with `(isbn,) force_refresh=True`; 2 skipped |
| `BookAdmin.mark_manual_review_needed` on 3 books | 3 flagged; clear action resets to 0 |
| `ISBNNotFoundCacheAdmin.clear_suppression` on 2 planted rows | 0 rows remaining |
| `ISBNLookupLogAdmin.has_add_permission` | `False` (audit-only) |
| `ISBNLookupLogAdmin.has_change_permission` | `False` |
| `AuthorAdmin` queryset annotation `_book_count` | present in compiled SQL; per-row column resolves without extra queries |

### Still pending

- A periodic purge for `ISBNLookupLog` (the audit table grows unboundedly; no `cleanup` task yet).
- Inline view of `ISBNLookupLog` rows from a Book's change-form (linkable via `isbn`, but not wired).

## [01:53 AM IST] ISBN resolver — Celery tasks + async enrichment endpoints

Phase 7 + Phase 8-remainder complete. Services restarted, `manage.py check` clean, all 3 tasks visible to the worker, all DRF tests pass.

### 3 Celery tasks (registered with the worker)

| Task | Schedule | Behavior |
|---|---|---|
| `enrich_isbn_task(isbn, force_refresh=False)` | on-demand | resolve → if matching `Book` exists, `persist_merged_book` |
| `refresh_stale_books_task()` | daily 02:00 UTC | enqueue enrich for every Book with `last_fetched_at < 1y` or NULL |
| `cleanup_not_found_cache_task()` | weekly Sun 03:00 UTC | purge `ISBNNotFoundCache` rows >180d old |

Retry config: `max_retries=3`, `acks_late=True`, exponential backoff with jitter (caps at 10 min). Discovery wired via a single import in `apps/inventory/tasks.py` since Celery's autodiscover only scans `<app>/tasks.py`, not nested service packages.

### 3 new DRF endpoints

| Method + URL | Auth | Behavior |
|---|---|---|
| `POST /api/v1/books/enrich/` | required | Validate ISBN → enqueue → `202` + `{task_id, isbn, status_url}` |
| `GET /api/v1/books/enrich/<task_id>/` | public | Celery `AsyncResult` state/result poll |
| `POST /api/v1/books/bulk/` | required | Up to 100 ISBNs per request (PRD §8.1 hard cap), per-task enqueue |

URL ordering: literal `enrich/` and `bulk/` declared before `<str:isbn>/` so Django doesn't greedily route them as ISBNs. Throttling reuses the `book_metadata` scope (100/hour) so attackers can't bypass per-IP limits by switching shapes.

### Verified

| Path | Outcome |
|---|---|
| `enrich_isbn_task.apply(...)` synchronously | Book #1509 enriched, `last_fetched_at` set, sources=`['upcitemdb']` |
| `cleanup_not_found_cache_task` with 1 old + 1 fresh planted row | old deleted, fresh kept |
| `refresh_stale_books_task` (mocked delay) | enqueued 504 of 508 books — matches the dev-DB stale-set |
| `POST enrich/` authed | `202` + valid task_id |
| `POST enrich/` no auth | `401` |
| `POST enrich/` bad ISBN | `400` |
| `GET enrich/<task_id>/` | `200` + Celery state |
| `POST bulk/` 3 valid + 1 invalid | `202`, `enqueued_count=3`, `invalid=['not-an-isbn']` |
| `POST bulk/` 101 ISBNs | `400` — caught by serializer `max_length=100` |
| `celery -A config inspect registered` | all 3 task names present |

### Still pending (intentionally deferred)

- `10000/hour` per-class throttle for authenticated users (PRD §8.3)
- The `is_stale` boolean flag — currently only `last_fetched_at` drives staleness logic

## [01:45 AM IST] ISBN resolver — DRF API at `/api/v1/books/`

Rewrote the bare async `View` classes at `apps/inventory/services/isbnapi/views.py` as proper DRF `APIView`s, added a serializer that enforces the `list_price_usd`-never-exposed rule, mounted the URLs at `/api/v1/books/` (the previous routes weren't actually mounted — `apps/inventory/urls.py` was empty, so the API wasn't reachable before today). PRD §8.1 / §8.2 / §8.3.

**Endpoints (now live):**

- `GET /api/v1/books/<isbn>/` — resolve metadata for ISBN-10 or ISBN-13. Accepts `?force_refresh=true` (or `1`/`yes`/`on`) to bypass both the FS cache and the `ISBNNotFoundCache` suppression row.
- `DELETE /api/v1/books/<isbn>/cache/` — invalidate the FS cache file. Idempotent; returns 204. Requires authentication (project default `IsAuthenticatedOrReadOnly`).

**Status code mapping** (`_status_for(result)` in views.py):

| Resolver outcome | HTTP status |
|---|---|
| Success (book payload, even partial — title or isbn13 present) | 200 |
| `Invalid ISBN: ...` / `ISBN is empty.` from Phase 1 normalize | 400 |
| `No metadata found for ISBN X (suppressed; ...)` (suppression hit) | 404 |
| `No metadata found for ISBN X (attempt #N; ...)` (all-miss this run) | 404 |
| `No metadata sources available ...` (no enabled adapters) | 503 |
| Other error path (defensive fallthrough) | 502 |

**`list_price_usd` exclusion (the regression-critical bit):**

- New `serializers.py` with `MergedBookResponseSerializer`. Fields are listed *explicitly* (not via `__all__` or auto-detection from the dataclass) so adding a new dataclass field requires a deliberate decision about public exposure.
- `list_price_usd` is **not** in the serializer's field list.
- `to_representation` also scrubs the `list_price_usd` key out of `field_origins` — otherwise the merger's per-field provenance dict would leak the internal field's existence (`{"list_price_usd": "upcitemdb"}`) even though the value itself wasn't being serialized.
- Smoke test asserts neither the top-level `list_price_usd` nor the `field_origins.list_price_usd` key appears in any response shape (200, 400, 404).

**Throttling** (`settings.py` → `REST_FRAMEWORK.DEFAULT_THROTTLE_RATES`):

- New scope `book_metadata` at `100/hour`, applied to both endpoints via `ScopedRateThrottle`. Single scope across GET and DELETE so a single attacker can't burn budget on either path.
- PRD §8.3 also calls for `10000/hour` for authenticated users — left as a follow-up; a per-class throttle override goes in views.py when traffic justifies it.

**OpenAPI / schema:**

- Both views carry `@extend_schema` so `drf-spectacular` generates correct docs. `BookMetadataView` documents the `force_refresh` query param and all four status codes; `BookCacheInvalidateView` documents the 204 no-content response.

**URL mounting** (`config/urls.py`):

- Added `path("api/v1/books/", include("apps.inventory.services.isbnapi.urls"))`.
- The previous `apps/inventory/urls.py` was empty, so the resolver API was effectively dead code prior to today — the views existed but no URL routed to them.

**Smoke test (DRF `APIClient` with `override_settings(ALLOWED_HOSTS=["*"])`):**

| Scenario | Status | Notes |
|---|---|---|
| GET cached ISBN | 200 | `cached=true`, no `list_price_usd` in body, no `list_price_usd` key in `field_origins`. |
| GET with `?force_refresh=true` | 200 | `cached=false` — cache + suppression both bypassed. |
| GET with malformed ISBN (`not-an-isbn`) | 400 | `error="ISBN is empty."` (Phase 1 cleans to empty string). |
| GET with planted suppression row | 404 | error contains "(suppressed; attempts=N, retry after T)". |
| GET suppressed + `?force_refresh=true` | 200 | Suppression bypassed, cascade ran, FS cache written. |
| DELETE unauthenticated | 401 | `IsAuthenticatedOrReadOnly` blocks unsafe methods. |

**Note on the `apps/inventory/urls.py` empty file:** left empty; the resolver lives one level deeper at `apps/inventory/services/isbnapi/urls.py` and is mounted directly from `config/urls.py` rather than chained through the inventory app's URLconf. This is intentional — the resolver is a self-contained service module, not a generic inventory CRUD surface.

**Still pending (Phase 7+):**

- DRF endpoints for `POST /api/v1/books/enrich/` (Celery enqueue) and `POST /api/v1/books/bulk/` — both require the resolver Celery tasks (PRD Phase 7) which haven't been built yet.
- Higher per-class throttle for authenticated users (`10000/hour`).

## [01:37 AM IST] ISBN resolver — `force_refresh` plumbed through the resolver

Wires the `force_refresh: bool = False` parameter end-to-end so admin "Re-fetch" actions (and the future API endpoint) can bypass both caching layers.

Signature changes:

- `BookMetadataService.get(raw_isbn, force_refresh=False)` — new parameter.
- `get_book_metadata_sync(isbn, force_refresh=False)` — passes through to `BookMetadataService.get`.
- `enrich_book(book, force_refresh=False)` — was already accepting the kwarg but ignoring it; now passes it down to `get_book_metadata_sync`.

Behavior when `force_refresh=True` (inside `BookMetadataService.get`):

- **Step 1 (FS cache check)** — skipped. Even if `{isbn_13}.json` is on disk, the cascade runs fresh.
- **Step 1.5 (ISBNNotFoundCache suppression check)** — skipped. Admins/operators need a way to retry a suppressed ISBN before the 1d/7d/30d/90d backoff expires (e.g., after a source-side issue is fixed).
- **Step 4 (all-miss branch)** — `invalidate_book(isbn)` now runs unconditionally in this branch (PRD §12.5 invalidation rule: a stale cache file must be dropped when the explicit re-fetch comes back empty). Safe no-op when no file exists, so `force_refresh=False` paths are unaffected.
- **Step 5b (clear suppression on success)** — unchanged: any cascade that returns at least one non-None source clears the suppression row, regardless of `force_refresh`.

`record_miss` on a force-refreshed miss still increments `attempts` (advances the backoff). It does not reset to 1 — a manual re-attempt that fails is treated as an additional failure data point.

End-to-end test (mock sources via a `ToggleSource(hit=True/False)`):

- `force_refresh=False` after a successful initial cascade → served from FS cache (`cached=True`).
- `force_refresh=True` → cache bypassed, fresh cascade runs; on miss the FS file is invalidated and `ISBNNotFoundCache` row created (attempts=1).
- Suppression row in place + `force_refresh=False` → suppressed in ~1.5 ms (no cascade). Same call with `force_refresh=True` → cascade runs (~13 ms), `attempts` bumps from 1 → 2.
- `force_refresh=True` with a hitting source → suppression row cleared, FS cache overwritten with the fresh result.

Still deferred:

- DRF API endpoint exposing `?force_refresh=true` query param.
- `cleanup_not_found_cache_task` periodic purge.

# 26-May-2026

## AWS SNS bounce / complaint plumbing for SES

Set up the AWS infrastructure that turns SES bounce and complaint events into Django state, plus the Django side that records them and stops re-sending to broken addresses.

AWS (account 080338028715, region `ap-south-1`):

- Created SNS topics `ses-bounces-prod` and `ses-complaints-prod`.
- Added two event destinations to the existing `pfs-configuration-set`:
  - `bounces` → matches `BOUNCE`, `REJECT`, `RENDERING_FAILURE`, publishes to `ses-bounces-prod`.
  - `complaints` → matches `COMPLAINT`, publishes to `ses-complaints-prod`.
- Subscribed `write2aruld@gmail.com` to both topics. **State: `PendingConfirmation`.** CloudWatch confirms AWS delivered the confirmation emails to Gmail's SMTP (`NumberOfNotificationsDelivered=3, Failed=0`), but Gmail filtering hides them — searches for `from:no-reply@sns.amazonaws.com` returned nothing. Path forward is either a Gmail filter audit or switching to the HTTPS webhook subscription described below (auto-confirms server-to-server, no inbox click).
- Discovered IAM user `nepscl` had no `iam:List*`, `sns:*`, or `sesv2:Put*` policies. User attached `AmazonSNSFullAccess` + `AmazonSESFullAccess` mid-task to unblock topic creation.

Backend (Django, all under `backend/apps/notifications/`):

- New models in `models.py`:
  - `SuppressedEmail(email, reason ∈ {hard_bounce, complaint, manual}, notes, …)` — unique on `email`, indexed on `reason`.
  - `SesEvent(event_type, message_id, recipient, subtype, diagnostic, raw=JSONField, delivery=FK→NotificationDelivery, received_at)` — raw audit log of every SES notification, linked back to the originating delivery via `provider_message_id`.
  - Enum classes `SuppressionReason` and `SesEventType`.
- New `signals.py` listening on `anymail.signals.tracking`: persists every SES event, marks the matching `NotificationDelivery` `gave_up` on permanent bounce / complaint / reject, and upserts into `SuppressedEmail` for permanent bounces (`subtype="Permanent"`) and all complaints.
- `apps.py` `ready()` now imports `signals` so the handler registers at startup.
- `tasks/email_delivery.py` short-circuits before calling SES if `SuppressedEmail` contains the target — marks the delivery `gave_up` with `Suppressed (...) : not sent`, no retries, no provider call.
- Admin pages for `SuppressedEmail` and `SesEvent` registered in `admin.py` (read-only on `SesEvent`).
- Migration `backend/apps/notifications/migrations/0002_suppressedemail_sesevent.py` adds both tables.

Wiring:

- `backend/config/urls.py` now mounts `path("anymail/", include("anymail.urls"))` — exposes Anymail's SES tracking endpoint at `/anymail/amazon_ses/tracking/<WEBHOOK_SECRET>/`, ready as the SNS HTTPS subscription target.
- `backend/config/settings.py` adds `AWS_SES_CONFIGURATION_SET` (default `"pfs-configuration-set"`) and configures Anymail with `AMAZON_SES_CONFIGURATION_SET_NAME` so every outbound SES `SendEmail` includes `ConfigurationSetName` — without this, the new event destinations would never fire. Also adds `ANYMAIL.WEBHOOK_SECRET` from `ANYMAIL_WEBHOOK_SECRET` (currently unset; harmless until HTTPS subscription goes live).

Verification:

- `manage.py check`: 0 issues.
- `pytest apps/notifications -x -q`: 14 passed.
- Migration applied manually by user; `gunicorn-api.putforshare.com`, `celery-worker-putforshare`, `celery-beat-putforshare` restarted and confirmed `active`.

Outstanding (resolved by the HTTPS cutover below; left here for the historical trail):

- Two SNS email subscriptions are still `PendingConfirmation`. Either resolve the Gmail delivery (filter rule / blocked list) and click both confirmation links, or pivot to the HTTPS webhook (set `ANYMAIL_WEBHOOK_SECRET`, subscribe `https://api.putforshare.com/anymail/amazon_ses/tracking/<secret>/` to both topics — SNS confirms automatically and events start flowing into `SesEvent`).
- Optional smoke test once subscriptions are confirmed: send to `bounce@simulator.amazonses.com` (works from SES sandbox when sending from the verified domain) and verify a `SesEvent` row appears and the address is added to `SuppressedEmail`.

## SES SNS — HTTPS webhook cutover + production reachability fix

Followed up on the morning's work after the SNS email confirmations never surfaced in Gmail (CloudWatch reported `Delivered=3, Failed=0`, but searches for `from:no-reply@sns.amazonaws.com` returned nothing — Gmail black box). Cut over to the HTTPS webhook path that anymail can auto-confirm server-to-server, and unblocked two surprises along the way.

Webhook secret + env loading:

- Generated a 32-byte `secrets.token_urlsafe(32)` value and wrote `backend/.env.production` (mode `0600`, owner `ubuntu`) with `ANYMAIL_WEBHOOK_SECRET`. Settings.py picks it up via `python-dotenv` when `DJANGO_ENV=production`.
- Added `.env.production` and the broader `.env.*` glob to `backend/.gitignore` — the existing `.env` / `*.env` rules did not match `.env.production`. Verified with `git check-ignore`.

Production reachability — `DisallowedHost` was already broken before SNS cutover:

- After restarting gunicorn, every request to `https://api.putforshare.com/*` returned `400 DisallowedHost`. Root cause: `ALLOWED_HOSTS = _env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")` at `backend/config/settings.py:68` plus no env override anywhere — gunicorn's systemd unit sets only `DJANGO_ENV=production`, and `backend/.env.production` didn't exist until today. Existed silently because no traffic was hitting these paths during recent development; the SNS HTTPS subscription would have failed for the same reason.
- Fixed by adding `DJANGO_ALLOWED_HOSTS=api.putforshare.com,dash.putforshare.com,devdash.putforshare.com,localhost,127.0.0.1` to `backend/.env.production`. Sanity-checked: `GET /api/docs/` returns `200`.

Anymail `WEBHOOK_SECRET` format gotcha (caused the first HTTPS subscription attempt to fail):

- Anymail compares the decoded Basic-auth value (the full `username:password` string) byte-for-byte against `WEBHOOK_SECRET` — it does **not** strip the username half. Set `ANYMAIL_WEBHOOK_SECRET=anymail:<random_token>` to match the `anymail:<token>@host/...` form used in the SNS subscription URL. Documented inline in `backend/.env.production`.
- Sequence after the fix: SNS POSTs without auth → anymail returns `401` + `WWW-Authenticate: Basic` → SNS retries with auth → anymail validates auth, runs `validate_request`, sees `SubscriptionConfirmation`, fetches `SubscribeURL` server-side, returns `200`. Verified in `nginx access.log` (IP `52.95.73.x`, UA `Amazon Simple Notification Service Agent`, status sequence `401, 200`).

AWS:

- Subscribed `https://anymail:****@api.putforshare.com/anymail/amazon_ses/tracking/` to both `ses-bounces-prod` and `ses-complaints-prod`. Both flipped from `PendingConfirmation` to real `SubscriptionArn` values (`...:49c58a62-...` and `...:f230340d-...`) once anymail confirmed.

End-to-end smoke test:

- From a Django shell, sent `EmailMultiAlternatives` from `notifications@putforshare.com` to `bounce@simulator.amazonses.com` (SES simulator works from sandbox when From is on the verified domain). Anymail returned `message_id=0109019e6383e361-...`, status `queued`.
- ~15 seconds later: `SesEvent` table had 1 row (`event_type=bounce`, `subtype=Permanent`, `recipient=bounce@simulator.amazonses.com`, linked `message_id` matches); `SuppressedEmail` had 1 row (`reason=hard_bounce`, `notes='Permanent: General'`). Pre-send check now stops further sends to this address.

Outstanding / known issues:

- The two `write2aruld@gmail.com` email subscriptions on `ses-bounces-prod` / `ses-complaints-prod` are still `PendingConfirmation` and now redundant (HTTPS path handles everything). They will auto-expire in 3 days; can also be unsubscribed explicitly.
- `DJANGO_DEBUG` is still defaulting to `True` in production (since no env var sets it). Every 4xx/5xx leaks a full Django debug page including settings, traceback, and environment. Pre-existing — not introduced by this work — but should be set to `False` before any real traffic. Outside the scope of this task; raising it here so it isn't lost.

## ISBN resolver — Foundation refactor + decouple migration + PRD reconciliation

A multi-part pass on the ISBN metadata pipeline at `backend/apps/inventory/services/isbnapi/`, paired with a project-wide config-library migration and a substantial PRD update at `prd/todo/isbn-meta-data-extraction/isbn-meta-data-extraction.md`.

Config (project-wide):

- Migrated `backend/config/settings.py` from `os.environ.get(...)` + `python-dotenv` to **`python-decouple`** as the canonical config library. 43 `config(...)` reads now drive the entire settings file with proper type casts (`bool`, `int`, `Csv()` with empty-filter). Removed `_env_bool`, `_env_list` helpers, the `python-dotenv` import, and the manual fallback parser. Two bootstrap exceptions kept: `os.getenv("DJANGO_ENV")` (read before decouple is configured) and a single block that populates `os.environ` from the `.env` file for subprocess (Celery worker) inheritance.
- Installed `python-decouple==3.8` and saved a feedback memory so future sessions know decouple is the only acceptable config lib here.
- `Django>=5.2,<5.3` pinned to match installed `5.2.11` (was `<5.2`, which conflicted with reality).
- Added `GOOGLE_BOOKS_API_KEY`, `ISBNDB_API_KEY`, `UPCITEMDB_API_KEY` env reads (all default empty) so adapters can pick them up without `getattr` fallbacks.

ISBN resolver foundation:

- Filesystem cache rewritten. **Permanent** (no TTL), sharded layout (`{isbn[:3]}/{isbn}.json`), canonical filename is ISBN-13, ISBN-10 alias is a **relative symlink** (`026/0262033844.json → ../978/9780262033848.json`). Old `index.json` mechanism removed. Atomic writes via hidden tmp + `os.replace`. Verified: ISBN-10 lookups follow the symlink and hit the same physical file as ISBN-13 lookups.
- Adapters were already async with `httpx.AsyncClient` (no sync→async migration needed — earlier audit flagged this incorrectly). Added a shared `User-Agent`/`DEFAULT_HEADERS` constant in `sources/base.py` and routed all four adapters through it (Open Library now blocks requests without a descriptive User-Agent).
- New **UPCitemdb** adapter at `sources/upcitemdb.py` registered as a fourth source. **Narrow scope** per PRD §3.4: contributes only `list_price_usd` (lowest non-zero offer) and cover URL candidates — explicitly leaves title/authors/brand `None`. Uses the no-auth trial endpoint (`/prod/trial/lookup`, 100/day) when `UPCITEMDB_API_KEY` is unset; switches to `/prod/v1/lookup` with `user_key` header when set.
- `schemas.py` gained `list_price_usd: Optional[float]` on both `NormalizedBook` and `MergedBookResponse`, with **INTERNAL-ONLY** docstrings noting it must be excluded from every public response. Customer-facing pricing remains `list_price_inr` (to be added in a follow-up slice).
- `merger.py`: `FIELD_PRIORITY["list_price_usd"] = ["isbndb", "upcitemdb", "google_books"]`; `upcitemdb` appended to `thumbnail` priority chain (last). UPCitemdb is intentionally absent from every other field so the merger never pulls title/authors from a generic-product DB. Added `is_valid_price` validator (positive numeric).
- `service.py`: after merge, the queried `isbn_13`/`isbn_10` are propagated onto the response so pricing-only hits still carry the ISBN (merger excludes upcitemdb from isbn13 priority by design).
- Removed stale incompatible cache file `book_cache/inventory_bookapi/9788131720479.json` (legacy schema, would have crashed the new reader).

Verified end-to-end: ISBN-13 lookup writes `978/9780262033848.json`, sibling symlink `026/0262033844.json → ../978/9780262033848.json` is created, and subsequent lookups by either form (or hyphenated input) hit the cache. `manage.py check` passes; gunicorn + celery-worker + celery-beat restarted cleanly.

External issues surfaced (not code — flagged for separate work):

- Google Books → `429` from the prod IP: unauthenticated 1K/day quota exhausted. Needs `GOOGLE_BOOKS_API_KEY` set in `.env.production`. Existing TODO at `prd/todo/isbn-meta-data-extraction/google-books-api-key.txt`.
- Open Library → `403` (nginx-level, not application): AWS IP range appears to be blocked at the edge. Even a proper descriptive User-Agent doesn't unblock it. Workaround would be an outbound proxy or accepting this source as unreliable from prod.
- ISBNdb stays disabled until `ISBNDB_API_KEY` is set (Tier 3 paid; expected).
- UPCitemdb works fine from this host on the trial endpoint.

PRD reconciliation (`prd/todo/isbn-meta-data-extraction/isbn-meta-data-extraction.md`):

- §2 Non-Goals — softened the polymorphism prohibition: `Book(Product)` is intentional and supported alongside `Soap(Product)`; only the ISBN cascade is books-only.
- §8 Data Model intro — clarified that models live in the existing `apps/inventory/` app (not a new `isbn_resolver` app); listed which models already exist vs which gaps remain; added an explicit "covers are out of scope" paragraph.
- §8.1 — annotated `binding` row: persisted as `Book.cover_type` in the existing model (no new column).
- §8.4 — `BookCover` model section replaced with a "DEFERRED" note. Covers will use the existing product-image system in a later phase.
- §5 — Phase 5 (cover pipeline: fetcher / processor / Bunny upload / sizes / placeholder) collapsed to a deferred note; only `MergedBookResponse.thumbnail` URL is in scope.
- §12 — Caching Strategy committed to filesystem-only (no Redis hot layer in v1); documented the filename + relative-symlink rule, the permanent-no-TTL rule, and the trigger conditions to add Redis later (multi-host, >50 req/s sustained, or measured filesystem bottleneck).
- Phase 0.1 — pointed at existing `apps/inventory/services/isbnapi/` package; "do not create a new `isbn_resolver` app."
- §6.2 (Phase 6 flow) — removed cover-pipeline step and `BookCover` from the persist transaction.
- §6.1 — pinned `Django>=5.2,<5.3`; removed `django-environ`; replaced with `python-decouple>=3.8` and explicit "do NOT add django-environ or python-dotenv" note.
- §6.2 (packages) — commented out `django-redis` as deferred per §12.6.

Memories saved for future sessions:

- `feedback_config_lib_decouple.md` — always use python-decouple; never django-environ, raw os.environ, or python-dotenv in new code.
- `project_binding_is_cover_type.md` — PRD's `binding` field is implemented as `Book.cover_type`; do not flag it as missing.
- `feedback_no_bookcover_model.md` — do not build a `BookCover` model or PRD Phase 5; covers will piggyback on the existing product-image system.

## ISBN resolver — Schema additions + Book DB persistence

Continuation of the ISBN resolver work. Adds the missing Book fields the resolver needs, introduces a proper through model for the Book↔Author relationship (with author ordering and role), and wires the resolver to write merged metadata onto Book rows.

### Schema (`apps/inventory/models.py`)

New Book fields:

- `subtitle` (CharField, blank) — populated by google_books / open_library.
- `list_price_inr` (DecimalField, nullable) — publisher's customer-facing list price. **Distinct** from seller pricing on `Product` (`min_retail_price`, `max_retail_price`, `sale_price`), which is transactional. Not yet populated by any source — placeholder for future Indian-market pricing data.
- `list_price_usd` (DecimalField, nullable) — **internal-only**, never expose in public API. Populated by UPCitemdb (lowest non-zero offer) and ISBNdb when available. Used for source-priority merging, FX conversion, and analytics.

New `BookAuthor` through model replacing the old auto-created `inventory_book_authors` M2M join:

- Fields: `book` (FK, CASCADE), `author` (FK, PROTECT), `order` (positive small int, 0=primary credit), `role` (choices: author/editor/translator/illustrator, default author), `created_on`.
- Unique constraint on `(book, author, role)` — one person can hold multiple roles on the same book (author + illustrator) but not duplicate the same role.
- Index on `(book, order)` for fast ordered fetches.
- Book.authors field becomes `ManyToManyField(through="BookAuthor")`.

New `ISBNNotFoundCache` model:

- Suppresses repeated lookups for ISBNs that returned nothing from every source. Backoff schedule (to be wired in by the resolver): 1d → 7d → 30d → 90d → never.
- Fields: `isbn_13` (CharField, unique), `attempts`, `last_attempt_at`, `retry_after` (indexed), `created_on`.

### Migration `0022_isbn_resolver_schema.py` — hand-edited

Django refuses to `AlterField` an M2M to add `through=`:

```
ValueError: Cannot alter field ... they are not compatible types
(you cannot alter to or from M2M fields, or add or remove through= on M2M fields)
```

Workaround pattern used:

1. `CreateModel(BookAuthor)` — creates the new `inventory_bookauthor` table.
2. `RunPython(copy_book_authors_forward)` — copies the 779 existing `(book_id, author_id)` rows from the auto-created `inventory_book_authors` table into `inventory_bookauthor` with `role="author"`, `order=0..N` per book sequenced by the original join row's `id`.
3. `SeparateDatabaseAndState` — state-only `AlterField` swaps `Book.authors` to `through=BookAuthor` (so the ORM knows about the new through model), database operation runs raw SQL `DROP TABLE inventory_book_authors` to drop the now-redundant auto-table.
4. `AddIndex`/`AddConstraint` on BookAuthor.

Reverse direction restores `BookAuthor` data deletion; the auto-M2M table would need a separate restore if anyone reverses. Reverse path is one-way in practice — flagged in the migration comments.

Migration ran cleanly against the 508 existing books / 20 authors / 779 M2M rows. Post-migration counts verified: BookAuthor=779, ISBNNotFoundCache exists empty, old `inventory_book_authors` table dropped.

### Resolver → DB persistence (`apps/inventory/services/isbnapi/persistence.py`, new file)

Public API:

- `persist_merged_book(book, merged) -> Book` — applies a `MergedBookResponse` onto an existing Book row. Wrapped in `transaction.atomic()`.
- `enrich_book(book) -> Book` — high-level wrapper: runs the resolver service for `book.isbn_13` (or `_10`), then persists.

Field-mapping policy (boundary between resolver and seller-owned data):

- **Seller-owned, only fill if blank**: `Book.name` (Product.name), `Book.description` (Product.description). The resolver never overwrites these — sellers might have hand-curated them.
- **Pure metadata, overwrite from cascade**: `Book.subtitle`, `Book.isbn_10`/`_13` (only if currently empty), `Book.page_count` (if > 0), `Book.book_language`, `Book.published_date`, `Book.published_year` (parsed from `published_date`), `Book.list_price_usd`.
- **Never touched**: `Product.sku`, `Product.seller`, `Product.category`, `Product.min_retail_price`, `Product.max_retail_price`, `Product.sale_price`, `Book.quality*`, `Book.book_edition`. These are seller transactional/condition data the resolver has nothing to say about.

Author handling:

- Author rows are deduplicated via `Author.normalized_name`, lowercased, accent-stripped, **punctuation-stripped**, whitespace-collapsed. So `"Thomas H. Cormen"`, `"thomas h cormen"`, `"THOMAS H. CORMEN"`, and `"José Saramago"` vs `"Jose Saramago"` all collapse to single Author rows.
- Resolver writes wipe-and-recreate the BookAuthor rows for each book to preserve the merger-supplied author order. `role="author"` for all resolver-created links (editor/translator support is for callers that distinguish roles, e.g. manual admin entry).
- One-time data backfill: any existing `Author.normalized_name` values that disagree with the new normalize function get refreshed. On the existing 20 authors, only 1 row needed updating.

Publisher handling:

- Resolved via case-insensitive name match → `Publisher.objects.filter(name__iexact=name).first()`, falling back to `Publisher.objects.create(name=name)`. No accent/punctuation normalization on publishers yet — names from the sources are already canonical enough.

Metadata accounting:

- `Book.metadata_quality_score` = `merged.confidence` (0–100 from the merger).
- `Book.sources` = `{"contributing": [source_names...]}` (JSONField, dict-shaped to leave room for future raw-per-source storage like `{"google_books": {...raw}, ...}`).
- `Book.field_origins` mirrors the merger's per-field provenance.
- `Book.last_fetched_at` set to now.
- `Book.is_stale` reset to False.
- `Book.manual_review_needed` flipped True if score < 50 (matches PRD §10 threshold).

### Schema additions to the dataclasses (`schemas.py`)

- Added `subtitle: Optional[str]` to `NormalizedBook` and `MergedBookResponse` + `to_dict()`.
- `google_books.py` and `open_library.py` now extract `info.get("subtitle")`.
- `merger.py` adds `"subtitle"` to `FIELD_PRIORITY` (`["google_books", "open_library", "isbndb"]`) and `SCALAR_VALIDATORS` (reuses `is_valid_title` — same non-empty/>=2-char check).
- ISBNdb skipped for subtitle: their schema only has `title_long` which conflates title+subtitle. Not worth parsing for v1.

### Admin (`apps/inventory/admin.py`)

- `BookAdmin.filter_horizontal = ("authors",)` removed — Django rejects it on `through=` M2Ms (`admin.E013`).
- Replaced with a `BookAuthorInline(TabularInline)` showing the `(author, role, order)` triple, ordered by `order`. `autocomplete_fields = ("author",)` keeps the author picker fast.

### Verification

Synthetic test (hand-built MergedBookResponse onto an existing Book row):

- Seller-set `Book.name` left intact when merged.title is supplied.
- `subtitle`, `publisher` (FK created + linked), `page_count`, `published_year` (parsed from `published_date`), `list_price_usd`, `metadata_quality_score`, `sources`, `field_origins`, `last_fetched_at` all populated.
- 5 author-name variants (3 Cormen variants + 2 Saramago variants) → exactly 2 BookAuthor rows after dedup, ordered correctly.

Live test (enrich_book on a Book with `isbn_13="9780262033848"`, hitting the filesystem cache from the foundation refactor):

- Resolver returned the cached merged response (UPCitemdb pricing only, confidence=0).
- Persistence wrote `list_price_usd=15.55` (Decimal), `metadata_quality_score=0`, `sources={"contributing": ["upcitemdb"]}`, `last_fetched_at=now`, `manual_review_needed=True` (score<50).

Regression check: 508 Books / 22 Authors / 779 BookAuthor rows after all tests cleaned up. Migration data preservation confirmed.

## ISBN resolver — ISBNNotFoundCache wired into the cascade

The `ISBNNotFoundCache` model added in the schema slice is now active in the resolver. Stops the cascade from repeatedly hammering Google/OpenLibrary/UPCitemdb for ISBNs that returned nothing from every source.

New module `apps/inventory/services/isbnapi/not_found_cache.py`:

- `is_suppressed(isbn_13) -> bool` — quick check (exists query on retry_after > now).
- `get_suppression(isbn_13) -> ISBNNotFoundCache | None` — same check but returns the row so the resolver can include `attempts` and `retry_after` in the error message.
- `record_miss(isbn_13) -> ISBNNotFoundCache` — `select_for_update().get_or_create()` inside `@transaction.atomic`; first miss → attempts=1, subsequent misses bump attempts and recompute `retry_after`. Backoff schedule: 1d → 7d → 30d → 90d → year 9999 ("never"). select_for_update keeps two concurrent racers from both incrementing against a stale value.
- `clear(isbn_13) -> int` — removes any suppression row. Called when the cascade succeeds, so previously-suppressed ISBNs that now resolve re-enter normal flow.

`BookMetadataService.get()` (`service.py`) updated:

1. **Step 1** — filesystem cache check (unchanged).
2. **Step 1.5 NEW** — suppression check. If a suppression row exists with `retry_after > now`, return a `MergedBookResponse` carrying the queried isbn13/isbn10 and an error like `"No metadata found for ISBN X (suppressed; attempts=3, retry after 2026-08-24T...)"`. `retryable=False` — caller shouldn't immediately retry; the future cascade will be auto-allowed once `retry_after` passes.
3. **Steps 2–3** — parallel cascade (unchanged).
4. **Step 4** — all-miss branch now calls `record_miss()`; the returned `MergedBookResponse` includes attempt number and next retry timestamp in its error message. `retryable=True` because the resolver itself is still "willing" to try again once the backoff expires.
5. **Step 5b NEW** — after a successful merge (at least one source returned data), `clear()` removes any pre-existing suppression row.

Sync ORM helpers wrapped with `sync_to_async` (same pattern `sources/base.py` uses for `_persist_lookup_log`). The resolver remains fully async.

End-to-end test (mock sources to avoid external-API dependency):

- `AlwaysMissesSource` returning `normalized=None` → first call records row (attempts=1, retry_after ≈ 1d out); second call short-circuits in ~1.5 ms with "suppressed" error.
- Manually expire the row, third call → cascade re-runs → row bumped to attempts=2, retry_after ≈ 7d out.
- Swap to `AlwaysHitsSource` returning a `NormalizedBook` → cascade succeeds → previously-planted suppression row deleted by step 5b.

Backoff verification: attempts 1/2/3/4/5 yield retry_after values ~1/7/30/90 days / year 9999.

Not yet wired (deferred):

- Periodic cleanup task to purge very old `ISBNNotFoundCache` rows (PRD §7 `cleanup_not_found_cache_task`) — current rows persist indefinitely once they hit "never".
- `force_refresh` parameter on `service.get()` to bypass both the FS cache AND the suppression row — required for admin "Re-fetch" actions later.

# 25-May-2026

## Remove `email_verification_token` / `email_verification_expiry` from User model

Demolished the legacy single-token mechanism that backed both the (broken) email-verification flow and the forgot-password flow, in preparation for a new unified auth-token model.

Backend:

- Dropped `email_verification_token` and `email_verification_expiry` fields, plus the `get_email_verification_expiry()` helper, from `backend/apps/users/models.py`. Cleaned up now-unused `timezone` and `generate_uuid7` imports.
- Removed both fields from the `Verification` fieldset and `readonly_fields` in `backend/apps/users/admin.py`.
- Deleted `ForgotPasswordSerializer` and `ResetPasswordConfirmSerializer` from `backend/apps/api/serializers.py`, removed the dead `email_verification` notification call in `SignupSerializer.create` (the welcome email still sends), and dropped now-unused `quote_plus` / `get_email_verification_expiry` imports.
- Removed `ForgotPasswordAPIView` and `ResetPasswordConfirmAPIView` from `backend/apps/api/views.py` and their `auth/forgot-password/` + `auth/reset-password/confirm/` routes from `backend/apps/api/urls.py`.
- Patched historical migration `backend/apps/users/migrations/0001_initial.py` to use a self-contained `_legacy_email_verification_expiry()` default instead of importing from the model (which no longer defines that callable), so the migration graph still loads.
- New migration `backend/apps/users/migrations/0011_remove_user_email_verification_expiry_and_more.py` drops both columns.

Why this matters (issues that drove the removal):

- The signup `/#/verify-email?token=...` email had no backend endpoint and no `email_verified` flag to flip (that column was removed in migration 0003), so the verification link was silently dead.
- A single `email_verification_token` column was shared by both verify-email and password reset, so either flow could clobber the other's token.
- Every freshly created user had a valid, non-null token + 2h expiry by default — meaning `ResetPasswordConfirmSerializer` would have accepted that token immediately, without anyone ever calling forgot-password.
- The reset/verification links used hash routing (`/#/reset-password?...`), which silently breaks any frontend using history routing because the query string ends up inside the URL fragment.
- No throttling on `/auth/forgot-password/`; each call rotated the token and sent another SES email.

Verification:

- `./manage.py makemigrations users` produced `0011_remove_user_email_verification_expiry_and_more.py`; `./manage.py check` reports 0 issues; `./manage.py migrate --plan` shows only the field drops; `./manage.py show_urls` confirms no `forgot/reset/verify-email` routes remain.

Not removed (reused by the upcoming unified auth-token model):

- `notification_service` registrations for `"password_reset"` and `"email_verification"` types in `backend/apps/notifications/services.py` and `seed_notification_templates.py`.
- Templates `prd/email-templates/forgot_password.html` and `prd/email-templates/email_verification.html`.

Follow-up:

- Design and implement the new unified auth-token model (covering both password reset and email verification), wire up a real `/auth/verify-email/` endpoint, and reintroduce `/auth/forgot-password/` + `/auth/reset-password/confirm/` against the new model with throttling and history-router-friendly URLs.

## Unified `VerificationToken` model + service (replaces the deleted forgot-password flow)

Implemented the unified auth-token model per `prd/token-building.md`. One table, three purposes, one service.

Model — `backend/apps/users/models.py`:

- New `VerificationToken` (BigAutoField PK, `user` FK → AUTH_USER_MODEL, `purpose` choices [`email_verify`, `password_reset`, `email_change`], `token_hash` unique 64-char SHA-256, `email` snapshot, `created_at`, `expires_at`, `used_at`).
- Index on `(user, purpose)`; ordered by `-created_at`.
- `is_valid()`, `consume()`, and `create_for(user, purpose, ...)` classmethod that deletes any active token for the same `(user, purpose)`, generates a `secrets.token_urlsafe(32)` raw token, stores only its SHA-256, and returns `(instance, raw_token)`.
- `DEFAULT_EXPIRY_MINUTES`: email_verify 1440 (24h), password_reset 30, email_change 120.

Service — new file `backend/apps/users/services.py`:

- `VerificationService.send_email_verification(user)` — issues an `email_verify` token, sends via `notification_service` with type `"email_verification"`, link is `{FRONTEND_BASE_URL}/verify-email?token=<raw>` (history-router-friendly, no `#`).
- `VerificationService.send_password_reset(email)` — silently returns when no user matches (no enumeration), otherwise issues a `password_reset` token and sends type `"password_reset"`. Link is `{FRONTEND_BASE_URL}/reset-password?token=<raw>`.
- `VerificationService._resolve_token(raw, expected_purpose)` — SHA-256s the raw token, fetches by `(token_hash, purpose)` so a reset link cannot satisfy a verify call. Raises `InvalidTokenError("Token not found" | "Token expired or already used")`.
- `VerificationService.verify_email(raw)` — applies snapshotted email, sets `is_active=True`, marks token consumed.
- `VerificationService.reset_password(raw, new_password)` — sets password, marks token consumed, deletes all `rest_framework.authtoken.models.Token` rows for the user to invalidate live sessions.

Serializers — `backend/apps/api/serializers.py`:

- `PasswordResetRequestSerializer(email)`, `PasswordResetConfirmSerializer(token, password)`, `EmailVerificationConfirmSerializer(token)`.
- `SignupSerializer.create` now calls `VerificationService.send_email_verification(user)` after creating the user so a real verification email goes out.

Views — `backend/apps/api/views.py`:

- `RequestPasswordResetAPIView` (POST, AllowAny) → always 200 `"If that email exists, a reset link was sent."`.
- `ConfirmPasswordResetAPIView` (POST, AllowAny) → 400 with `{"error": ...}` on `InvalidTokenError`, 200 `"Password updated."` on success.
- `VerifyEmailAPIView` (AllowAny) supports both `GET /auth/verify-email/<token>/` (direct-link style from email) and `POST /auth/verify-email/` with `{"token": "..."}` (SPA-driven). Same `_verify` helper, same error/success contract.

URLs — `backend/apps/api/urls.py`:

- `auth/password-reset/request/` → `RequestPasswordResetAPIView` (name `auth-password-reset-request`).
- `auth/password-reset/confirm/` → `ConfirmPasswordResetAPIView` (name `auth-password-reset-confirm`).
- `auth/verify-email/` → `VerifyEmailAPIView` POST (name `auth-verify-email`).
- `auth/verify-email/<str:token>/` → `VerifyEmailAPIView` GET (name `auth-verify-email-get`).

Admin — `backend/apps/users/admin.py`:

- Registered `VerificationToken` with read-only list (`id`, `user`, `purpose`, `email`, `created_at`, `expires_at`, `used_at`), filter by purpose, search by `user__email` / `email`, ordered newest first. `has_add_permission` returns False — tokens may only be issued by the service.

Migration — `backend/apps/users/migrations/0012_verificationtoken.py`:

- Creates the table with the `(user, purpose)` index. Run with `./manage.py migrate users`.

Verification:

- `./manage.py makemigrations users` produced `0012_verificationtoken.py`; `./manage.py check` reports 0 issues; `./manage.py migrate --plan` shows only the create; `django.urls.reverse` resolves all four new route names; `VerificationToken.Purpose.choices` and `VerificationService` import cleanly in a shell smoke test.

Notes vs. PRD:

- Used `settings.AUTH_USER_MODEL` rather than `'auth.User'` (project uses a custom User).
- Email links point at the SPA, not the backend, so the user sees a real page instead of a raw JSON response from clicking an email. The backend still exposes the PRD's GET-by-path verify endpoint for direct use.

## Email verification made mandatory at signup

Wired the three pieces required to flip email verification from "optional" to "required to log in."

Manager — `backend/apps/users/managers.py`:

- `UserManager.create_user` now sets `extra_fields.setdefault("is_active", False)`. New accounts are dormant until verification.

Signup view — `backend/apps/api/views.py` (`SignupAPIView`):

- Stopped issuing a DRF auth token on signup. Response is now 201 `{"detail": "Account created. Check your email to verify your account before logging in.", "user": {...}}`. Clients can no longer obtain a usable token before the user clicks the verification link.

Login serializer — `backend/apps/api/serializers.py` (`LoginSerializer.validate`):

- Replaced `django.contrib.auth.authenticate(...)` (which silently returns `None` for inactive users via `ModelBackend.user_can_authenticate`, conflating "wrong password" with "unverified") with an explicit `User.objects.filter(email=...).first()` + `user.check_password(...)`.
- When the user exists, password matches, and `is_active=False`, the serializer checks whether a pending `EMAIL_VERIFY` `VerificationToken` exists (or `last_login is None`) and returns `"Email not verified. Check your inbox."` instead of the generic `"User account is inactive"`. Admin-disabled accounts still get the original message.
- Removed the now-unused `from django.contrib.auth import authenticate` import.

Resend endpoint — `backend/apps/api/views.py` + `urls.py`:

- New `ResendEmailVerificationAPIView` (POST, AllowAny) at `/auth/verify-email/resend/` (name `auth-verify-email-resend`). Accepts `{"email": "..."}`, calls `VerificationService.resend_email_verification(email)`, returns 200 `"If a pending verification exists for that email, a new link was sent."` regardless of whether the email exists (no enumeration).
- Throttled with `ScopedRateThrottle` scope `verify_email_resend` at `3/hour` per client. Rate added under `REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]` in `config/settings.py`; throttle is opt-in per view, so other endpoints are unaffected.
- URL ordering: `verify-email/resend/` is registered **before** `verify-email/<str:token>/` so the resend path takes precedence over the token-in-path match.

Service — `backend/apps/users/services.py`:

- New `VerificationService.resend_email_verification(email)` mirrors `send_password_reset`'s pattern: silently returns when no matching inactive user is found, otherwise reissues an `EMAIL_VERIFY` token via the existing `send_email_verification` path. `VerificationToken.create_for` already deletes any prior unused token for the same `(user, purpose)`, so resend cleanly rotates.

Verification:

- `./manage.py check` reports 0 issues; all seven auth route names (`auth-signup`, `auth-login`, `auth-verify-email`, `auth-verify-email-resend`, `auth-verify-email-get`, `auth-password-reset-request`, `auth-password-reset-confirm`) reverse correctly; `ScopedRateThrottle` with scope `verify_email_resend` parses to `3 per 3600s`.

Behavior change to surface to clients:

- Signup no longer returns `{"token": ...}` — frontend must direct users to "check your inbox" instead of auto-logging them in.
- Login of an unverified account returns the `"Email not verified. Check your inbox."` error string; the SPA should detect this and offer a "Resend verification email" CTA that POSTs to `/auth/verify-email/resend/`.

## Throttle on `/auth/password-reset/request/`

- Added `ScopedRateThrottle` (scope `password_reset_request`) to `RequestPasswordResetAPIView` to stop spam-rotation of reset tokens and SES email amplification.
- Rate `5/hour` per client added under `REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]` in `config/settings.py` alongside the existing `verify_email_resend: 3/hour`.
- Throttle is opt-in per view; no other endpoints affected.

## Storefront (`nstore`) wired to new auth endpoints

Updated the Next.js storefront to match the new backend contract end-to-end.

Auth client — `nstore/src/lib/authClient.js`:

- `forgotPassword` now POSTs `auth/password-reset/request/` (was `auth/forgot-password/`).
- `resetPassword` now POSTs `auth/password-reset/confirm/` with `{token, password}` (dropped `email` and renamed `new_password` → `password`).
- Added `verifyEmail({ token })` → POST `auth/verify-email/`.
- Added `resendVerification({ email })` → POST `auth/verify-email/resend/`.

Storefront helpers — `nstore/src/lib/storeAuth.js`:

- `forgotPassword({ email })`, `resetPassword({ token, password })` re-shaped to match the new client signatures (fixed a pre-existing mismatch where `resetPassword` accepted `newPassword` but the caller passed `password`).
- Exported new `verifyEmail({ token })` and `resendVerification({ email })`.

Signup page — `nstore/src/components/SignupPageClient.jsx`:

- No longer auto-redirects to `/login` on success (the backend no longer issues an auth token at signup).
- After successful signup, renders a "Check your inbox" screen with the user's email, instructions, a "Resend verification email" button (calls `/auth/verify-email/resend/`), and a "Back to login" link.

Login page — `nstore/src/components/LoginPageClient.jsx`:

- Detects the new backend error string `"Email not verified. Check your inbox."` and renders an inline "Resend verification email" CTA in an orange callout block. Hidden for any other error (e.g. wrong password, archived account).

Reset-password page — `nstore/src/components/ResetPasswordPageClient.jsx`:

- Removed `uid` URL param (no longer needed by the new endpoint).
- Sends `{token, password}` only.
- Added an explicit "Reset link is missing or invalid" guard when the URL has no `?token=`.

New verify-email page — `nstore/src/app/verify-email/page.jsx` + `nstore/src/components/VerifyEmailPageClient.jsx`:

- New route at `/verify-email`. Reads `?token=` from the URL, POSTs to `/auth/verify-email/` automatically on mount (single-shot via `useRef` guard so React StrictMode double-invoke doesn't double-call), and renders loading / success / error states.
- Success screen shows a "Go to login" button; error screen surfaces the backend error and offers "Back to login" + "Sign up again".
- Routes registered via `app/verify-email/page.jsx` matching the existing `reset-password/page.jsx` convention (no Suspense wrapper, consistent with the rest of the app).

Email link contract (confirmed):

- Backend emails point at `{FRONTEND_BASE_URL}/verify-email?token=<raw>` and `{FRONTEND_BASE_URL}/reset-password?token=<raw>`.
- Both frontend pages read `?token=` from `useSearchParams()` and POST the token (no hash routing, no email in URL).

## Dashboard (`dash`) wired to new auth endpoints (history routing)

Updated the React-admin + Vite dashboard to match the new backend contract end-to-end. (NOTE: the assumption made here that react-admin v5 defaulted to `BrowserRouter` was wrong — `ra-core`'s `RouterWrapper` creates a `HashRouter` when no outer router is present. This was corrected in a later session entry "Dashboard switched to BrowserRouter" below.)

Endpoint URL/payload migrations in `dash/src/index.jsx`:

- `ForgotPasswordPage`: POST `/auth/password-reset/request/` (was `/auth/forgot-password/`).
- `ResetPasswordPage`: POST `/auth/password-reset/confirm/` with `{token, password}` (dropped `email` from both the URL parsing and the request body; renamed `new_password` → `password`). Missing-link guard now checks only `!token`.

Signup flow — `SignupPage`:

- Removed `saveSession(payload?.token, payload?.user)` + `navigate("/")` (backend no longer issues a token on signup).
- Added `submitted` + `resendState` state. On success renders a "Check your inbox" `AuthShell` screen showing the user's email, a "Resend verification email" button (calls `/auth/verify-email/resend/`), and a "Back to Login" button.
- Removed the unused `useNavigate()` from this component.

Login flow — `LoginPage`:

- Detects the new backend error string `"Email not verified. Check your inbox."` (constant `UNVERIFIED_LOGIN_ERROR`) and renders an inline MUI `Alert` info block with a "Resend" action that POSTs `/auth/verify-email/resend/`. Hidden for any other login error.
- Resend success/error surfaces as a follow-up `Alert`.

New verify-email page — `VerifyEmailPage`:

- New component in `dash/src/index.jsx`. Reads `?token=` from `useSearchParams()`, POSTs `/auth/verify-email/` on mount (single-shot via `useRef` guard to survive React StrictMode double-invoke), and renders loading / success / error states inside `AuthShell`.
- Success view shows a "Go to Login" CTA; error view shows "Back to Login" and "Sign up again".
- Route registered as `<Route path="/verify-email" element={<VerifyEmailPage />} />` inside the existing `<CustomRoutes noLayout>` block alongside `/signup`, `/forgot-password`, `/reset-password`.

Public-routes whitelist — `dash/src/providers/authProvider.js`:

- Added `/verify-email` to `checkAuth`'s `publicPaths` list so unauthenticated users can reach the verification page from their email.

Verification:

- No `/auth/forgot-password/` or `/auth/reset-password/confirm/` references remain in `dash/src`. The five auth-endpoint call sites resolve to: `/auth/verify-email/resend/` (login + signup), `/auth/password-reset/request/` (forgot), `/auth/password-reset/confirm/` (reset), `/auth/verify-email/` (verify-email page).
- `grep` confirms zero `HashRouter` or `/#/` usages anywhere in `dash/src`.

## Redis cache for shared DRF throttle counters

DRF was throttling per-gunicorn-worker because Django had no `CACHES` setting → defaulted to `LocMemCache` (in-process, not shared). With 2 workers the declared `5/hour` rate effectively allowed ~10/hour. Production throttle test confirmed: 429 didn't fire until request 8.

Fix — `backend/config/settings.py`:

```python
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": os.environ.get("DJANGO_CACHE_REDIS_URL", "redis://localhost:6379/1"),
        "KEY_PREFIX": "pfs",
    }
}
```

- Uses Django 4+'s built-in `RedisCache` backend (no extra package needed; `redis==5.0.8` already in requirements).
- Redis DB 1 chosen so cache data is isolated from Celery's broker/results which live in DB 0.
- `KEY_PREFIX="pfs"` namespaces keys so future cache work in adjacent projects on the same Redis can coexist.
- Overridable via `DJANGO_CACHE_REDIS_URL` env var.

Verification:

- `./manage.py check` reports 0 issues; Django shell round-trip (`cache.set/get/delete`) works.
- After gunicorn restart + `redis-cli -n 1 FLUSHDB`, hammering `POST /auth/password-reset/request/` with 7 distinct emails yielded exactly 5×200 then 429 on request 6 — limit now enforced consistently across workers.
- Confirmed throttle keys land in Redis: `pfs:1:throttle_password_reset_request_<client-ip>` visible via `redis-cli SCAN`.

## Session summary

**What shipped (code)**
- Removed `email_verification_token` / `email_verification_expiry` from User model + every reference (model, admin, serializers, views, URLs, migration patch).
- Added unified `VerificationToken` model (one table, three purposes — `email_verify`, `password_reset`, `email_change`) + `VerificationService` (SHA-256 hashed, single-use, purpose-scoped, session-invalidation on reset).
- New endpoints: `auth/password-reset/request/`, `auth/password-reset/confirm/`, `auth/verify-email/` (POST + GET-by-path), `auth/verify-email/resend/`.
- Made email verification mandatory: signup now creates `is_active=False`, no auto-login; `LoginSerializer` distinguishes unverified from admin-disabled and surfaces `"Email not verified. Check your inbox."`.
- Storefront (`nstore`) wired to all new endpoints; new `/verify-email` page; resend CTA on login + post-signup "check inbox" screen.
- Dashboard (`dash`) wired to all new endpoints (history routing, no `/#/`); new `/verify-email` page; resend CTA on login + post-signup screen; `/verify-email` whitelisted in `authProvider.checkAuth`.
- `ScopedRateThrottle` enforced: `password_reset_request` 5/hour, `verify_email_resend` 3/hour.
- Redis-backed `CACHES["default"]` on DB 1 with `KEY_PREFIX="pfs"` so throttle counters are shared across gunicorn workers and survive restarts.

**What was deployed**
- Dashboard (`dash`) built and pushed to BunnyCDN via `dash/deploy.sh`; cache purged.
- Backend code in place at `/var/www/api.putforshare.com/backend`; gunicorn (`gunicorn-api.putforshare.com.service`) restarted to pick up model + cache changes.
- Migration `users/0012_verificationtoken.py` applied manually by user; `users/0011_remove_user_email_verification_expiry_and_more.py` previously applied.

**What was verified on production**
- Signup → verify-email full flow against `https://api.putforshare.com/api/v1/` — 8 assertions green (signup 201 with `is_active=false`, token issuance, verify 200, `is_active=True`, token consumption, login with new auth token, replay 400, hard-delete cleanup).
- Forgot-password full flow — 13 assertions green (request 200 always, `password_reset` token created at 30-min expiry, confirm 200, token consumed, DRF auth tokens deleted, prior session token returns 401, old password rejected, new password works, replay 400, unknown-email returns same 200, throttle fires 429, cleanup).
- Throttle retest after Redis cache shipped: exactly 5×200 then 429 on req 6; after `systemctl restart gunicorn-api.putforshare.com` the bucket in Redis persisted and the next 3 requests immediately returned 429. Confirms shared-cache enforcement across workers and process restarts.

**Sentry note**
- An `OperationalError: table users_user has no column named email_verification_token at /api/v1/auth/signup/` event surfaced in Sentry during the session. Triaged read-only and traced to the pre-restart 500 from the first production signup attempt (DB migration was applied before gunicorn was restarted to load the new model code). Current master PID 51931 started 2026-05-25 10:17:44 UTC with `NRestarts=0`; journal since contains zero OperationalError events. New feedback memory `feedback_restart_gunicorn_on_backend_change.md` records the rule. No code action needed if the Sentry event timestamp is before 10:17:44 UTC.

**Known follow-ups**
- SES production access still in sandbox (per `project_email_ses_migration` memory, sandbox lift requested 2026-05-24). Until lifted, emails to non-verified recipients won't deliver — the API endpoints all succeed because `_send_notification_safe` swallows mailer errors, but end users won't receive the verification/reset links.
- No automated tests for any of the new auth endpoints. Manual production smoke tests were the only verification.
- Not a git repository — durable history of these changes lives in `changelog.md` only.

# 21-May-2026

## Address `locality` field across stack

Added a new `locality` field to the Address model and propagated it through the API, admin dashboard, and storefront.

Backend:

- New `locality = models.CharField(max_length=200, blank=True, default="")` on `Address` in backend/apps/users/models.py:107.
- Generated and applied migration `backend/apps/users/migrations/0010_address_locality.py`.
- Exposed `locality` in both `AddressSerializer` and `AdminAddressSerializer` in backend/apps/api/serializers.py.

Dashboard (`dash`, React-admin):

- Added a `<TextInput source="locality" label="Locality" />` to the address form (`AddressFormFields`) in dash/src/index.jsx.
- Rendered locality (when present) in `AddressCard` and `AddressShowContent` summary blocks.
- Included `locality` in the joined Location string in `AdminAddressShowContent`.

Storefront (`nstore`, Next.js):

- Added `locality` to `emptyForm`, the edit-load hydration, and the controlled `<input>` between Area/Sector and Landmark in nstore/src/components/AddressesPageClient.jsx.
- Included `locality` in the address card summary line.
- Included `locality` in the checkout address `<select>` option text and in the selected-address summary block in nstore/src/components/CheckoutPageClient.jsx.

Verification:

- `./manage.py makemigrations users` produced `0010_address_locality.py`; `migrate users` applied cleanly.
- `./manage.py check` reports 0 issues.

## Seller sidebar reorder

- Moved "My Inventories" to the bottom of the seller sidebar in dash/src/index.jsx (`SellerSidebarMenu`). New seller order: Earning Calculator → My Dashboard → My Address Book → My Packages → My Pickup Requests → My Inventories.

## Copy Link on profile edit

- Added a "Copy Link" button between "Generate" and "Share on WhatsApp" on `/my/profile/edit` in dash/src/index.jsx.
- Clicking copies `https://putforshare.com/store/s/{username}` to the clipboard (uses `navigator.clipboard.writeText`, with a `textarea` + `document.execCommand("copy")` fallback for non-secure contexts).
- The button label flips to "Copied" for 2 seconds after a successful copy; disabled when the username is empty; warn/error toasts surface missing-username and clipboard failures.

## Refresh identity from /auth/me/ on each session load

Fixes stale `plan` / `pfs_role` in the seller dashboard after admin-side changes (e.g., updating `User.plan` via Django shell). Previously `authProvider.getIdentity()` and `getPermissions()` returned the `localStorage`-cached user as-is and only hit `/auth/me/` when no cached user existed, so a shell-set `plan=SELF_SELL` did not propagate to the UI — `/my/inventories` kept showing the "viewing only" alert and hiding the Add Inventory button until logout/login.

- `getIdentity()` and `getPermissions()` in dash/src/providers/authProvider.js now call `/auth/me/` first, refresh `localStorage`, and fall back to the cached identity only when the request throws (network/401).
- react-admin's `useGetIdentity` / `usePermissions` dedupe via react-query within a session, so this fires once per page load, not per render.
- Server-side gating in `MyInventoryViewSet._assert_self_sell_inventory_mutation_allowed` (backend/apps/api/views.py:828) was already correct — it reads `user.plan` live from the DB on every mutating verb, so no backend change was needed.

# 9-May-2026

• Implemented the two UI items from prd/dash/backlog/backlog-9-may-2026.md.

- Added the help/support icon to the top navbar so it is always visible in the header across screen sizes, not just after
  login: dash/src/index.jsx:7810
- Added Earning Calculator as the first sidebar item and wired it to a real route at /my/earning-calculator: dash/src/
  index.jsx:7993 and dash/src/index.jsx:8555
- Built the calculator page as a proper dashboard screen with a cleaner layout, summary card, comparison cards, and a guide
  panel: dash/src/earningcalc/earnings.jsx:142 and dash/src/earningcalc/earningsGuide.jsx:1

## AWS S3 Browser

Created S3 browser to a flat, paginated bucket listing.

- The backend now lists objects from the bucket directly, without folder-style grouping, in backend/apps/s3browser/views.py
- Zero-byte objects are no longer filtered out, so every bucket item is returned regardless of file size in backend/apps/
  s3browser/views.py
- The frontend S3 browser now shows a simple paginated object list instead of folder navigation in dash/src/s3browser/
  browser.jsx
- Cursor-based pagination is wired in the React data provider in dash/src/providers/dataProvider.js
- Tests were updated to assert that zero-byte objects are included in backend/apps/s3browser/tests.py

## Quality, Quality Note field made only for Books model

What changed:

- quality and quality_note are removed from Product and now live on Book in backend/apps/inventory/models.py:246.
- The API still exposes the same quality field names for inventory create/edit/list, but it now reads/writes the Book row
  instead of Product in backend/apps/api/serializers.py:730.
- Merchant feed condition lookup now reads book quality from the book relation in backend/apps/inventory/services/
  merchant_feed.py:30.
- Added a migration to move existing data from Product to Book in backend/apps/inventory/
  migrations/0016_move_quality_fields_to_book.py:1.
- Updated tests to assert book-owned quality data and non-book cleanup in backend/apps/api/tests.py:456.

Verification:

- backend/.conda/bin/python backend/manage.py check passed.
- backend/.conda/bin/python -m pytest -q backend/apps/api/tests.py -k "quality or CatalogAPITests or MyInventoryAPITests"
  passed: 23 passed, 8 deselected.

I did not change dash code because the frontend still consumes the same quality / quality_note API fields, so the inventory
list/add/edit components keep working against the new book-backed storage.

## 2026-05-03

- Implemented the inventory-owned ISBN metadata endpoint under `apps.inventory`.
- Moved lookup and cache logic into `apps.inventory.services.bookapi`.
- Kept `apps.api.inventory_metadata` as a compatibility wrapper around the new inventory service.
- Wired the `dash` admin frontend to call a dedicated ISBN metadata helper.
- Added cache coverage in inventory tests and updated endpoint patch targets in API tests.

### Verification

- `./py313 -m py_compile` passed for the edited Python files.
- `npm run build` in `dash` completed successfully.
