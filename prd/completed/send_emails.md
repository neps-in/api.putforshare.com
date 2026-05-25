# Notifications + Email Delivery (PutForShare)

Status as of 2026-05-24.

## SES verification

| Check | Result |
|---|---|
| Domain `putforshare.com` in `ap-south-1` | ✅ Verified |
| IAM `ses:SendRawEmail` for `arn:aws:iam::080338028715:user/nepscl` | ✅ Works |
| Account sending enabled, EnforcementStatus | ✅ HEALTHY |
| Sandbox status | ⚠️ Still in sandbox (`ProductionAccessEnabled: False`, 200/day, 1/sec) |

Sending to non-verified recipients (real users at gmail/yahoo/etc.) will be rejected with `MessageRejected: Email address is not verified` until production access is requested via the AWS console.

## From / Reply-To wiring

| Setting | Value |
|---|---|
| `DEFAULT_FROM_EMAIL` | `notifications@putforshare.com` |
| `EMAIL_REPLY_TO` | `hi@putforshare.com` |
| `EMAIL_BACKEND` | `anymail.backends.amazon_ses.EmailBackend` |
| Region | `ap-south-1` |

Both are set in `backend/.env.production` and have defaults in `backend/config/settings.py`. The provider attaches Reply-To via `EmailMultiAlternatives(from_email=..., reply_to=[...])` in `apps/notifications/providers/email.py`.

## Audit fixes shipped (16 items)

The notifications app was audited; 15 broken items + 1 perf item were fixed.

| # | Item | Fix |
|---|---|---|
| 1 | `models.py` duplicate `created_at` | Removed earlier declaration |
| 2 | `Notification.send_email_now()` missing imports | Added `send_mail`, `settings`, `timezone`; tightened nil-recipient guard |
| 3 | Dead `tasks.py` shadowed by `tasks/` package | Deleted file + stale `.pyc` |
| 4 | Tests using `user=` kwarg | Rewritten to use `recipient=` |
| 5 | Tests importing the dead module | Rewritten against `apps.notifications.tasks.email_delivery` with `EmailProvider`-level mocks |
| 6 | `admin.py` missing `apps.` prefix | Fixed import path on retry action |
| 7 | `NotificationViewSet` open for write | Now `ReadOnlyModelViewSet` + paginated `unread`, `mark_all_read`, `mark_read` actions |
| 8 | `services.send()` missing fields | Accepts `title`, `message`, `target_url`, `email_subject`, `email_body`, `actor`; sets `send_email=True` when email is in channels |
| 9 | Two parallel create APIs | `utils/create.py` is now a thin wrapper over `notification_service.send` |
| 10 | Empty `whatsapp.py`, missing `sms.py` | Deleted empty file; `_enqueue_delivery` now marks unsupported channels `GAVE_UP` with a clear reason instead of silently no-oping |
| 11 | `UserNotificationPreference` ignored | `_channel_allowed_by_preference` consulted in `services.send`, honoring both global toggles and `per_type` overrides |
| 12 | DB-backed `NotificationTemplate` empty | New `seed_notification_templates` management command + render pipeline now uses an `Engine` with `settings.EMAIL_TEMPLATE_DIRS` so `{% extends "email_base.html" %}` resolves |
| 13 | `prd/email-templates/*` not wired | Added `settings.EMAIL_TEMPLATE_DIRS = [BASE_DIR.parent / "prd" / "email-templates"]`; seeded 3 rows (`welcome`, `password_reset`, `email_verification`). Welcome `action_url` default updated to `https://dash.putforshare.com/onboarding` |
| 14 | Empty test files | `test_services.py` (4 tests), `test_providers.py` (3 tests), `test_tasks.py` (3 tests) — all real assertions |
| 15 | Orphan `template-preview.html` + duplicate name | Moved to `templates/admin/notifications/template_preview.html` (path the admin actually loads); removed stray `templates/notification_template.py` snippet and `tests.py` |
| 16 | Task fetched delivery/notification/user in 3 queries | Added `select_related("notification", "notification__recipient")` — confirmed collapsed to 1 JOINed SELECT |

## Test status

`pytest apps/notifications/tests/` → **14 passed**, `python manage.py check` clean.

## Templates seeded

| Type | Source file | Subject |
|---|---|---|
| `welcome` | `prd/email-templates/welcome.html` | Welcome to PutForShare |
| `password_reset` | `prd/email-templates/forgot_password.html` | Reset your PutForShare password |
| `email_verification` | `prd/email-templates/email_verification.html` | Verify your PutForShare email |

Re-run `python manage.py seed_notification_templates` after editing any HTML in `prd/email-templates/` to push the new content into `NotificationTemplate`.

## Address rename

`support@putforshare.com` → `hi@putforshare.com` everywhere it appeared:
- `backend/.env.production`, `backend/config/settings.py`
- All `prd/email-templates/*.html` and `*.txt`
- `nstore/src/components/Footer.jsx`
- PRD docs in `prd/dash/` and `prd/backend/`

> Heads-up: the sed sweep also touched compiled `nstore/.next/` bundles. Those are git-ignored build artifacts — run `npm run build` once before the next deploy to regenerate them so source maps line up.

## SendGrid retired

`pfslib.helper.send_sgemail()` had zero callers and has been deleted along with:
- `sendgrid` imports in `backend/pfslib/helper.py`
- `SENDGRID_API_KEY` / `SENDGRID_FROM_EMAIL` settings in `backend/config/settings.py`
- All `SENDGRID_*` env vars in `backend/.env.production` (active + commented variants)
- `sendgrid==6.11.0` from `backend/requirements.txt`

Run `pip uninstall sendgrid python-http-client` in the deployed venv to actually remove the package; nothing in the codebase imports it anymore.

## Remaining (out of scope for code)

- **SES sandbox lift** — `PutAccountDetails` request submitted 2026-05-24 (RequestId `b1d4f5e2-c00f-45fe-88b0-9bf4603c2f4c`), review status PENDING. AWS will email both contact addresses with the decision.

---

## Follow-up work (same session, 2026-05-24)

### Auth flow → notifications wiring

- **Wire `welcome` + `email_verification` into signup.** `SignupSerializer.create` in `apps/api/serializers.py` now fires both notifications via `_send_notification_safe` after `User.objects.create_user`. Verification URL = `{FRONTEND_BASE_URL}/verify-email?token={token}`, welcome CTA = `{FRONTEND_BASE_URL}/onboarding`. Both use `expires_in_hours=2` to match `User.get_email_verification_expiry`. End-to-end test: real `serializer.save()` → 2 Notification + 2 Delivery rows, Celery `.delay()` called twice.
  - [x] Done [ ] Verified

- **Wire `password_reset` into forgot-password.** `ForgotPasswordSerializer.save` now fires the notification instead of printing to stdout. Reset URL = `{FRONTEND_BASE_URL}/reset-password?token={token}`. Same `_send_notification_safe` wrapper so SES/broker failures don't break the request.
  - [x] Done [ ] Verified

- **Seed `merchant_feed_sync_failed` template.** Created `prd/email-templates/merchant_feed_sync_failed.{html,txt}` extending `email_base.html` with log ID + trigger + multi-line error block + "what to do" footer. Added entry to `seed_notification_templates.TEMPLATES`; DB row created (2708 bytes). Render test with sample log id=4271, trigger=PRODUCT_UPDATE, 503 error → all data and PutForShare branding present.
  - [x] Done [ ] Verified

- **Extend render context to expose Notification model fields.** `render_email_from_notification` now passes `notification`, `title`, `message`, `target_url`, `recipient` to templates in addition to the existing `notification.context` keys, so templates can render attrs the caller set on the Notification model (not just the context dict). Required for `merchant_feed_sync_failed` to render the message field.
  - [x] Done [ ] Verified

### Operations

- **Restart `gunicorn-api.putforshare.com.service`.** Picked up latest serializer changes. Active since 10:26:14 UTC, master PID 37325 + 3 workers, no errors.
  - [x] Done [ ] Verified

- **Restart Celery worker + beat.** Picked up new `services.py`, `tasks/email_delivery.py`, `providers/email.py`. Connected to Redis, mingled, ready in <2s.
  - [x] Done [ ] Verified

- **Rename Celery systemd units.** `celery-worker.service` → `celery-worker-putforshare.service`, `celery-beat.service` → `celery-beat-putforshare.service`. Matches the existing `gunicorn-*-putforshare.com.service` convention. `After=` cross-reference in beat updated to point at the new worker unit name. Old unit files + `multi-user.target.wants` symlinks removed.
  - [x] Done [ ] Verified

- **Silence Celery `broker_connection_retry` deprecation warning.** Added `CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True` to `backend/config/settings.py:256`. Post-restart log shows zero `CPendingDeprecationWarning` entries.
  - [x] Done [ ] Verified

### Dash frontend — production build hardening

- **Fix duplicate `react-router-dom` in the production bundle.** Live `devdash.putforshare.com` console threw `[Zl] is not a <Route> component`. Root cause: Vite was bundling two copies of `react-router-dom`, so react-admin's `<CustomRoutes>` `child.type === Route` strict-equality check failed (two distinct `Route` constants). Confirmed by `grep -c "A <Route> is only ever to be used as the child of <Routes>" dist/assets/index-*.js` returning **2**. Fix: added `resolve.dedupe: ["react", "react-dom", "react-router", "react-router-dom"]` to `dash/vite.config.mjs`. Post-rebuild count: **1**. Bundle shrunk by 34 kB (1385 → 1351 kB).
  - [x] Done [ ] Verified

- **Remove npm + yarn lockfile artifacts; pin pnpm.** Three different package managers had touched `dash/` (npm/yarn from May 16, pnpm from today's build), which let Vite resolve the same package via multiple paths. Deleted `dash/package-lock.json`, `dash/node_modules/.package-lock.json`, `dash/yarn.lock`. Added `"packageManager": "pnpm@11.1.2"` to `dash/package.json`. Kept `dash/package-mac.json` — it's a separate Mac-dev variant (esbuild-wasm + newer MUI), not a backup.
  - [x] Done [ ] Verified

- **Enable corepack so the packageManager pin is enforced.** Ran `corepack enable` once (system-wide). Verified: `yarn --version` in `dash/` is now refused with *"This project is configured to use pnpm because .../package.json has a 'packageManager' field"*. `pnpm --version` returns `11.1.2` exactly as pinned.
  - [x] Done [ ] Verified

- **Create `dash/.gitignore`.** Didn't exist before. Now ignores `dist/`, `node_modules/`, `.env.deploy`, `.env.local`, `.env.*.local`, `.vscode/`, `.idea/`, `.DS_Store`.
  - [x] Done [ ] Verified

- **Harden `dash/deploy.sh`.** Replaces hard-coded `npm run build` with: `set -euo pipefail`, `export COREPACK_ENABLE_DOWNLOAD_PROMPT=0`, sources `.env.deploy` (with file-exists check), `: "${VAR:?...}"` guards on every required secret, `corepack enable` + `pnpm install --frozen-lockfile` + `pnpm build`, `curl -fSs` so HTTP failures actually fail the deploy. Final `echo "Deploy complete."` so a successful run is visible.
  - [x] Done [ ] Verified

- **Move Bunny secrets out of `deploy.sh`.** Created `dash/.env.deploy` (mode 0600, gitignored) with `BUNNY_FTP_USER`, `BUNNY_FTP_PASS`, `BUNNY_ACCOUNT_API_KEY`, `BUNNY_PULLZONE_ID`. Committed `dash/.env.deploy.example` as a placeholder template.
  - [x] Done [ ] Verified

### Outstanding (not done — needs the user)

- **Rotate Bunny FTP password + Account API key.** Both were in plaintext in the old `deploy.sh` and almost certainly committed in git history. The file-system move to `.env.deploy` doesn't help with what's already in the history. Cycle both values in the Bunny dashboard and update `.env.deploy` accordingly.
  - [ ] Done [ ] Verified
