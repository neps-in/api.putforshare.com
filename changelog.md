# Changelog

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
