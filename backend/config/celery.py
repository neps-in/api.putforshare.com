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
}
