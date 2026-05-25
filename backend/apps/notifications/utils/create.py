# notifications/utils/create.py
"""Thin convenience wrappers around NotificationService for callers
that only need a one-shot email notification.
"""
from __future__ import annotations

from typing import Optional

from django.contrib.auth import get_user_model

from apps.notifications.models import Channel, Notification
from apps.notifications.services import notification_service

User = get_user_model()


def create_email_notification(
    *,
    recipient: Optional[User],
    type: str,
    title: str,
    message: str = "",
    target_url: str = "",
    context: Optional[dict] = None,
    actor: Optional[User] = None,
) -> Notification:
    """Email a user using their own User.email as the target."""
    notification, _ = notification_service.send(
        user=recipient,
        actor=actor,
        type=type,
        title=title,
        message=message,
        target_url=target_url,
        context=context or {},
        channels=[Channel.EMAIL],
    )
    return notification


# Alias kept for backwards-compat with existing callers.
create_email_notification_to_user = create_email_notification


def create_email_notification_to_address(
    *,
    email: str,
    type: str,
    title: str,
    message: str = "",
    target_url: str = "",
    context: Optional[dict] = None,
    actor: Optional[User] = None,
    recipient: Optional[User] = None,
) -> Notification:
    """Email a raw address, optionally tied to a User for in-app linkage."""
    notification, _ = notification_service.send(
        user=recipient,
        actor=actor,
        type=type,
        title=title,
        message=message,
        target_url=target_url,
        context=context or {},
        channels=[Channel.EMAIL],
        override_targets={Channel.EMAIL: email},
    )
    return notification
