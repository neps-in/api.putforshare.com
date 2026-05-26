"""Project-wide utility views.

Currently houses the `/healthz/` liveness/readiness endpoint (PRD §11.4)
which load balancers and uptime monitors poll. The check probes DB, Redis
(Celery broker), and the filesystem cache directory.

Bunny CDN reachability — also in PRD §11.4 — is intentionally NOT probed
here because covers / Bunny upload have been deferred (see project memory
`feedback_no_bookcover_model.md`).
"""

import logging
import time
import uuid

from django.conf import settings
from django.db import connection
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET

logger = logging.getLogger(__name__)


def _check_db() -> dict:
    t0 = time.monotonic()
    try:
        connection.ensure_connection()
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        return {"ok": True, "latency_ms": int((time.monotonic() - t0) * 1000)}
    except Exception as exc:
        return {"ok": False, "error": str(exc), "latency_ms": int((time.monotonic() - t0) * 1000)}


def _check_redis() -> dict:
    """Pings the Celery broker URL. Redis is critical infra here — Celery
    can't enqueue without it, so this counts toward overall health.
    """
    t0 = time.monotonic()
    try:
        import redis as redis_lib
        client = redis_lib.from_url(settings.CELERY_BROKER_URL, socket_timeout=2)
        client.ping()
        client.close()
        return {"ok": True, "latency_ms": int((time.monotonic() - t0) * 1000)}
    except Exception as exc:
        return {"ok": False, "error": str(exc), "latency_ms": int((time.monotonic() - t0) * 1000)}


def _check_filesystem_cache() -> dict:
    """Write/read/delete a probe file in the book-cache directory.

    The ISBN resolver's filesystem cache is critical to its operation —
    if this directory becomes unwritable the resolver silently degrades to
    "always fetch from external APIs", which exhausts API quotas quickly.
    """
    from apps.inventory.services.isbnapi.cache import _cache_dir
    t0 = time.monotonic()
    probe = _cache_dir() / f".healthz_probe_{uuid.uuid4().hex}"
    try:
        probe.parent.mkdir(parents=True, exist_ok=True)
        probe.write_text("ok")
        if probe.read_text() != "ok":
            raise OSError("read-back mismatch")
        return {"ok": True, "latency_ms": int((time.monotonic() - t0) * 1000)}
    except Exception as exc:
        return {"ok": False, "error": str(exc), "latency_ms": int((time.monotonic() - t0) * 1000)}
    finally:
        try:
            probe.unlink(missing_ok=True)
        except Exception:
            pass


@csrf_exempt
@require_GET
def healthz(request):
    """GET /healthz/ — DB + Redis + FS-cache liveness probe.

    Returns 200 with `{"status": "ok", "checks": {...}}` when every subsystem
    is reachable; 503 with `{"status": "degraded", "checks": {...}}` if any
    fails. Public endpoint — no auth — so load balancers can poll without
    credentials. Per-subsystem latency_ms is included for diagnostics.
    """
    checks = {
        "db": _check_db(),
        "redis": _check_redis(),
        "filesystem_cache": _check_filesystem_cache(),
    }
    overall_ok = all(c["ok"] for c in checks.values())
    return JsonResponse(
        {"status": "ok" if overall_ok else "degraded", "checks": checks},
        status=200 if overall_ok else 503,
    )
