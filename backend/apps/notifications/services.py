# notifications/services.py
from __future__ import annotations

from typing import Mapping, Optional, Sequence, Tuple

from django.contrib.auth import get_user_model
from django.db import transaction

from .models import (
    Channel,
    DeliveryStatus,
    Notification,
    NotificationDelivery,
    UserNotificationPreference,
)
from .tasks.email_delivery import send_notification_delivery_email_task

User = get_user_model()


def _enqueue_delivery(delivery: NotificationDelivery) -> None:
    """Dispatch a delivery to the right Celery task by channel.

    SMS / WhatsApp are not yet implemented — mark such deliveries GAVE_UP
    immediately so they don't sit in PENDING forever.
    """
    if delivery.channel == Channel.EMAIL:
        send_notification_delivery_email_task.delay(delivery.id)
        return

    delivery.status = DeliveryStatus.GAVE_UP
    delivery.last_error = f"No provider configured for channel '{delivery.channel}'."
    delivery.save(update_fields=["status", "last_error", "updated_at"])


def _channel_allowed_by_preference(
    user: Optional[User],
    channel: str,
    notification_type: str,
) -> bool:
    """Return False if the user has explicitly opted out of this channel."""
    if user is None or not getattr(user, "is_authenticated", True):
        # System notifications / anonymous targets are always allowed
        return True

    pref = (
        UserNotificationPreference.objects
        .filter(user=user)
        .only(
            "email_enabled",
            "sms_enabled",
            "whatsapp_enabled",
            "per_type",
        )
        .first()
    )
    if pref is None:
        return True

    # Per-type override wins if set: {"order_shipped": ["email"], "marketing": []}
    per_type = pref.per_type or {}
    if notification_type in per_type:
        return channel in per_type[notification_type]

    if channel == Channel.EMAIL:
        return pref.email_enabled
    if channel == Channel.SMS:
        return pref.sms_enabled
    if channel == Channel.WHATSAPP:
        return pref.whatsapp_enabled
    return True


class NotificationService:
    """
    Central entry point for sending notifications.

        from apps.notifications.services import notification_service

        notification_service.send(
            user=user,
            type="welcome",
            title="Welcome to PutForShare",
            context={"first_name": user.first_name},
            channels=["email"],
        )
    """

    def send(
        self,
        *,
        user: Optional[User],
        type: str,
        title: str = "",
        message: str = "",
        target_url: str = "",
        context: Optional[Mapping] = None,
        channels: Optional[Sequence[str]] = None,
        override_targets: Optional[Mapping[str, str]] = None,
        extra_meta: Optional[Mapping] = None,
        actor: Optional[User] = None,
        email_subject: str = "",
        email_body: str = "",
    ) -> Tuple[Notification, list[NotificationDelivery]]:
        context = dict(context or {})
        override_targets = dict(override_targets or {})

        if extra_meta:
            meta = dict(context.get("meta") or {})
            meta.update(extra_meta)
            context["meta"] = meta

        if channels is None:
            channels = self.default_channels_for_type(type)
        channels = list(channels or [])

        wants_email = Channel.EMAIL in channels

        with transaction.atomic():
            notification = Notification.objects.create(
                recipient=user,
                actor=actor,
                type=type,
                title=title,
                message=message,
                target_url=target_url,
                send_email=wants_email,
                email_subject=email_subject,
                email_body=email_body,
                context=context,
            )

            deliveries: list[NotificationDelivery] = []
            for channel in channels:
                if not _channel_allowed_by_preference(user, channel, type):
                    continue

                target = self.determine_target(
                    user=user, channel=channel, override_targets=override_targets,
                )
                if not target:
                    continue

                delivery = NotificationDelivery.objects.create(
                    notification=notification,
                    channel=channel,
                    target=target,
                )
                deliveries.append(delivery)

        for delivery in deliveries:
            _enqueue_delivery(delivery)

        return notification, deliveries

    def default_channels_for_type(self, type: str) -> list[str]:
        mapping = {
            "welcome": ["email"],
            "password_reset": ["email"],
            "email_verification": ["email"],
            "order_shipped": ["email", "sms"],
            "order_delivered": ["email", "sms"],
        }
        return mapping.get(type, ["email"])

    def determine_target(
        self,
        *,
        user: Optional[User],
        channel: str,
        override_targets: Mapping[str, str],
    ) -> Optional[str]:
        if channel in override_targets:
            return override_targets[channel]

        if not user:
            return None

        if channel == Channel.EMAIL:
            return getattr(user, "email", None) or None

        if channel == Channel.SMS:
            phone = None
            if hasattr(user, "profile") and hasattr(user.profile, "phone_number"):
                phone = user.profile.phone_number
            elif hasattr(user, "phone"):
                phone = user.phone
            elif hasattr(user, "mobile"):
                phone = user.mobile
            return phone or None

        if channel == Channel.WHATSAPP:
            wa = None
            if hasattr(user, "profile") and hasattr(user.profile, "whatsapp_number"):
                wa = user.profile.whatsapp_number
            elif hasattr(user, "whatsapp"):
                wa = user.whatsapp
            else:
                wa = self.determine_target(
                    user=user, channel=Channel.SMS, override_targets={},
                )
            return wa or None

        return None


notification_service = NotificationService()


def send_notification(
    *,
    user: Optional[User],
    type: str,
    title: str = "",
    message: str = "",
    target_url: str = "",
    context: Optional[Mapping] = None,
    channels: Optional[Sequence[str]] = None,
    override_targets: Optional[Mapping[str, str]] = None,
    extra_meta: Optional[Mapping] = None,
    actor: Optional[User] = None,
    email_subject: str = "",
    email_body: str = "",
) -> Tuple[Notification, list[NotificationDelivery]]:
    """Functional wrapper around NotificationService.send."""
    return notification_service.send(
        user=user,
        type=type,
        title=title,
        message=message,
        target_url=target_url,
        context=context,
        channels=channels,
        override_targets=override_targets,
        extra_meta=extra_meta,
        actor=actor,
        email_subject=email_subject,
        email_body=email_body,
    )
