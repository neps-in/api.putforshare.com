import os

from celery import Celery
from celery.schedules import crontab

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("config")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

interval_hours = int(os.environ.get("MERCHANT_FEED_INTERVAL_HOURS", "12"))
if interval_hours not in {12, 24}:
    interval_hours = 12

trigger_source = "SCHEDULED_12H" if interval_hours == 12 else "SCHEDULED_24H"
schedule_expr = "*/12" if interval_hours == 12 else "0"

app.conf.beat_schedule = {
    "merchant-feed-debounce-drain-every-minute": {
        "task": "apps.inventory.tasks.drain_merchant_feed_debounce_queue_task",
        "schedule": crontab(minute="*"),
    },
    "merchant-feed-sync-periodic": {
        "task": "apps.inventory.tasks.run_merchant_feed_sync_task",
        "schedule": crontab(minute=15, hour=schedule_expr),
        "kwargs": {
            "trigger_source": trigger_source,
            "run_mode": "FULL",
        },
    },
    # ISBN resolver — PRD §7.2:
    # Daily 02:00 UTC sweep of Books past their 1-year stale window.
    "isbn-refresh-stale-books-daily": {
        "task": "apps.inventory.services.isbnapi.tasks.refresh_stale_books_task",
        "schedule": crontab(hour=2, minute=0),
    },
    # Weekly Sunday 03:00 UTC purge of >6-month-old suppression rows.
    "isbn-cleanup-not-found-cache-weekly": {
        "task": "apps.inventory.services.isbnapi.tasks.cleanup_not_found_cache_task",
        "schedule": crontab(hour=3, minute=0, day_of_week=0),
    },
    # Weekly Sunday 03:30 UTC purge of >90-day-old ISBNLookupLog audit rows.
    # Offset 30 min from the not-found cleanup so the two deletes don't pile
    # up against each other.
    "isbn-cleanup-lookup-log-weekly": {
        "task": "apps.inventory.services.isbnapi.tasks.cleanup_isbn_lookup_log_task",
        "schedule": crontab(hour=3, minute=30, day_of_week=0),
    },
    # Daily 04:00 UTC metrics rollup — emits a single isbn.daily_metrics
    # structlog event aggregating the prior 24h of cascade activity.
    "isbn-daily-metrics-rollup": {
        "task": "apps.inventory.services.isbnapi.tasks.daily_isbn_metrics_task",
        "schedule": crontab(hour=4, minute=0),
    },
}
