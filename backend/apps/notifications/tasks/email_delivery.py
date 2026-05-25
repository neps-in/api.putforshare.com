# notifications/tasks/email_delivery.py
from celery import shared_task
from django.conf import settings
from django.db import transaction
from django.template import Context, Engine

from apps.notifications.models import (
    Channel,
    DeliveryStatus,
    Notification,
    NotificationDelivery,
    NotificationTemplate,
)
from apps.notifications.providers.email import EmailProvider, ProviderError

email_provider = EmailProvider()


def _email_engine() -> Engine:
    """Engine whose loader can resolve `{% extends 'email_base.html' %}`
    against prd/email-templates/."""
    dirs = [str(p) for p in getattr(settings, "EMAIL_TEMPLATE_DIRS", [])]
    return Engine(dirs=dirs)


def render_email_from_notification(notification: Notification) -> tuple[str, str]:
    """Return (subject, body). Looks up NotificationTemplate first; falls
    back to Notification.email_subject/email_body when no row exists.

    Render context = notification.context (unpacked at top level) + the
    Notification instance itself + its title/message/target_url, so templates
    can render any of those fields.
    """
    engine = _email_engine()
    ctx_data = {
        **(notification.context or {}),
        "notification": notification,
        "title": notification.title,
        "message": notification.message,
        "target_url": notification.target_url,
        "recipient": notification.recipient,
    }
    ctx = Context(ctx_data)

    try:
        tmpl = NotificationTemplate.objects.get(
            type=notification.type,
            channel=Channel.EMAIL,
            is_active=True,
        )
        subject_source = tmpl.subject or notification.title
        subject = engine.from_string(subject_source).render(ctx)
        body = engine.from_string(tmpl.body).render(ctx)
        return subject, body

    except NotificationTemplate.DoesNotExist:
        subject_source = notification.get_email_subject()
        body_source = notification.get_email_body()
        subject = engine.from_string(subject_source).render(ctx)
        body = engine.from_string(body_source).render(ctx)
        return subject, body

    

@shared_task(
    bind=True,
    autoretry_for=(ProviderError,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 5},
)
def send_notification_delivery_email_task(self, delivery_id: int) -> None:
    """
    Send ONE email NotificationDelivery via EmailProvider.
    """
    with transaction.atomic():
        delivery = (
            NotificationDelivery.objects
            .select_for_update()
            .select_related("notification", "notification__recipient")
            .get(pk=delivery_id)
        )

        if delivery.status in {DeliveryStatus.SENT, DeliveryStatus.GAVE_UP}:
            return

        notification = delivery.notification
        user = notification.recipient

        delivery.attempt_count += 1
        delivery.status = DeliveryStatus.RETRYING
        delivery.save(update_fields=["attempt_count", "status"])

    # outside atomic: do provider work
    if not delivery.target:
        delivery.status = DeliveryStatus.GAVE_UP
        delivery.last_error = "No target set for delivery."
        delivery.save(update_fields=["status", "last_error"])
        return

    subject, body = render_email_from_notification(notification)

    try:
        msg_id = email_provider.send(
            target=delivery.target,
            subject=subject,
            body=body,
            context=notification.context or {},
            user=user,
            channel=Channel.EMAIL,
            notification_type=notification.type,
        )
    except ProviderError as exc:
        delivery.status = DeliveryStatus.FAILED
        delivery.last_error = str(exc)
        delivery.save(update_fields=["status", "last_error"])
        raise  # let Celery retry

    delivery.status = DeliveryStatus.SENT
    delivery.provider_message_id = msg_id or ""
    delivery.last_error = ""
    delivery.save(update_fields=["status", "provider_message_id", "last_error"])

    if notification.send_email and not notification.email_sent_at:
        from django.utils import timezone
        notification.email_sent_at = timezone.now()
        notification.save(update_fields=["email_sent_at"])
