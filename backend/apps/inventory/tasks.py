from celery import shared_task
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
import redis

from apps.inventory.models import MerchantFeedDebounceEntry, MerchantFeedSyncLog
from apps.inventory.services.merchant_feed import write_google_merchant_feed_file

User = get_user_model()


def _notify_admins_for_feed_failure(log: MerchantFeedSyncLog) -> None:
    from apps.notifications.utils.create import (
        create_email_notification_to_address,
        create_email_notification_to_user,
    )

    message = (
        "Google Merchant feed sync failed.\n"
        f"Log ID: {log.id}\n"
        f"Trigger: {log.trigger_source}\n"
        f"Error: {log.error_message or 'Unknown error'}"
    )
    admin_email = str(getattr(settings, "ADMIN_EMAIL", "") or "").strip()

    if admin_email:
        create_email_notification_to_address(
            email=admin_email,
            type="merchant_feed_sync_failed",
            title="Google Merchant Feed Sync Failed",
            message=message,
            context={
                "merchant_feed_log_id": log.id,
                "trigger_source": log.trigger_source,
            },
        )
        return

    admins = User.objects.filter(is_active=True, is_archived=False, pfs_role="ADMIN").only("id", "email")
    for admin in admins:
        if not admin.email:
            continue
        create_email_notification_to_user(
            recipient=admin,
            type="merchant_feed_sync_failed",
            title="Google Merchant Feed Sync Failed",
            message=message,
            context={
                "merchant_feed_log_id": log.id,
                "trigger_source": log.trigger_source,
            },
        )


def _get_redis_client():
    redis_url = str(getattr(settings, "MERCHANT_PUSH_REDIS_URL", "") or "").strip()
    if not redis_url:
        redis_url = str(getattr(settings, "CELERY_BROKER_URL", "redis://localhost:6379/0"))
    return redis.Redis.from_url(redis_url, decode_responses=True)


def _acquire_push_slot() -> bool:
    limit = int(getattr(settings, "MERCHANT_PUSH_MAX_RUNS_PER_MINUTE", 4))
    limit = max(1, limit)
    current_minute = timezone.now().strftime("%Y%m%d%H%M")
    key = f"merchant_push_rate:{current_minute}"
    try:
        client = _get_redis_client()
        current = client.incr(key)
        if current == 1:
            client.expire(key, 70)
        return current <= limit
    except Exception:
        return True


@shared_task(
    bind=True,
    autoretry_for=(ConnectionError, TimeoutError, OSError),
    retry_backoff=True,
    retry_jitter=True,
    retry_backoff_max=600,
    max_retries=5,
)
def run_merchant_feed_sync_task(
    self,
    *,
    log_id: int | None = None,
    trigger_source: str = MerchantFeedSyncLog.TriggerSource.MANUAL,
    run_mode: str = MerchantFeedSyncLog.RunMode.FULL,
    product_id: int | None = None,
    product_ids: list[int] | None = None,
) -> int:
    if log_id is None:
        log = MerchantFeedSyncLog.objects.create(
            trigger_source=trigger_source,
            run_mode=run_mode,
            product_id=product_id,
            status=MerchantFeedSyncLog.Status.PENDING,
            payload={"product_ids": product_ids or []},
        )
    else:
        log = MerchantFeedSyncLog.objects.get(pk=log_id)

    if not _acquire_push_slot():
        MerchantFeedSyncLog.objects.filter(pk=log.pk).update(
            status=MerchantFeedSyncLog.Status.PENDING,
            started_on=None,
            completed_on=None,
            error_message="Rate limited for current minute. Will retry on next drain.",
            updated_on=timezone.now(),
        )
        return log.pk

    with transaction.atomic():
        locked = MerchantFeedSyncLog.objects.select_for_update().get(pk=log.pk)
        locked.status = MerchantFeedSyncLog.Status.RUNNING
        locked.started_on = timezone.now()
        locked.celery_task_id = getattr(self.request, "id", "") or ""
        locked.save(update_fields=["status", "started_on", "celery_task_id", "updated_on"])

    try:
        summary = write_google_merchant_feed_file()
        MerchantFeedSyncLog.objects.filter(pk=log.pk).update(
            status=MerchantFeedSyncLog.Status.SUCCESS,
            completed_on=timezone.now(),
            total_items=summary["total_items"],
            success_items=summary["success_items"],
            failed_items=summary["failed_items"],
            feed_relative_path=summary["feed_relative_path"],
            feed_public_url=summary["feed_public_url"],
            feed_checksum=summary["feed_checksum"],
            error_message="",
            updated_on=timezone.now(),
        )
        return log.pk
    except Exception as exc:
        MerchantFeedSyncLog.objects.filter(pk=log.pk).update(
            status=MerchantFeedSyncLog.Status.FAILED,
            completed_on=timezone.now(),
            error_message=str(exc),
            updated_on=timezone.now(),
        )
        failed = MerchantFeedSyncLog.objects.get(pk=log.pk)
        _notify_admins_for_feed_failure(failed)
        raise


@shared_task(bind=True, max_retries=0)
def drain_merchant_feed_debounce_queue_task(self) -> int:
    batch_size = int(getattr(settings, "MERCHANT_PUSH_BATCH_SIZE", 50))
    batch_size = max(1, batch_size)
    now = timezone.now()

    entries = list(
        MerchantFeedDebounceEntry.objects.filter(next_sync_on__lte=now)
        .select_related("product")
        .order_by("next_sync_on", "id")[:batch_size]
    )
    if not entries:
        return 0

    if not _acquire_push_slot():
        return 0

    has_global = any(entry.dedupe_key == "global:catalog" for entry in entries)
    product_ids = sorted({entry.product_id for entry in entries if entry.product_id})
    log = MerchantFeedSyncLog.objects.create(
        trigger_source=MerchantFeedSyncLog.TriggerSource.PRODUCT_UPDATE,
        run_mode=MerchantFeedSyncLog.RunMode.DELTA,
        status=MerchantFeedSyncLog.Status.PENDING,
        product_id=(product_ids[0] if len(product_ids) == 1 else None),
        payload={
            "from_debounce_queue": True,
            "debounce_entry_ids": [entry.id for entry in entries],
            "product_ids": product_ids,
            "global_refresh": has_global,
        },
    )
    MerchantFeedDebounceEntry.objects.filter(id__in=[entry.id for entry in entries]).delete()
    run_merchant_feed_sync_task.delay(
        log_id=log.id,
        trigger_source=MerchantFeedSyncLog.TriggerSource.PRODUCT_UPDATE,
        run_mode=MerchantFeedSyncLog.RunMode.DELTA,
        product_id=(product_ids[0] if len(product_ids) == 1 else None),
        product_ids=product_ids,
    )
    return len(entries)
