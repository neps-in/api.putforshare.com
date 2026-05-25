# notifications/rendering.py

from __future__ import annotations

from typing import Any, Mapping, Tuple

from django.template import Context, Template
from django.utils.text import slugify

from .models import NotificationDelivery, NotificationTemplate, Channel


def get_template_for_delivery(
    delivery: NotificationDelivery,
) -> NotificationTemplate | None:
    """
    Fetch an active NotificationTemplate for this delivery's type+channel.

    Returns None if no template is defined, in which case a simple fallback
    body will be generated.
    """
    notification = delivery.notification
    return (
        NotificationTemplate.objects
        .filter(
            type=notification.type,
            channel=delivery.channel,
            is_active=True,
        )
        .order_by("-updated_at")
        .first()
    )


def build_render_context(delivery: NotificationDelivery) -> Mapping[str, Any]:
    """
    Construct the context dictionary used for template rendering.

    Exposes:
    - notification: Notification instance
    - user:         User instance (or None)
    - context:      Notification.context dict
    """
    notification = delivery.notification
    return {
        "notification": notification,
        "user": notification.recipient,
        "context": notification.context,
        # Additionally, unpack context at top level for convenience:
        **(notification.context or {}),
    }


def render_for_delivery(delivery: NotificationDelivery) -> Tuple[str, str]:
    """
    Render subject + body for a NotificationDelivery.

    For email:
        subject = rendered template subject or a fallback
        body    = HTML/text body

    For SMS/WhatsApp:
        subject = "" (or ignored by provider)
        body    = text body only

    Returns:
        (subject, body)
    """
    tmpl = get_template_for_delivery(delivery)
    ctx_data = build_render_context(delivery)
    ctx = Context(ctx_data)

    # If template exists, render it with Django Template engine
    if tmpl is not None:
        subject = ""
        if tmpl.subject:
            subject = Template(tmpl.subject).render(ctx).strip()
        body = Template(tmpl.body).render(ctx)
        return subject, body

    # Fallback: no template configured
    notification = delivery.notification
    # Generate a human-readable fallback subject from type (for email)
    readable_type = notification.type.replace("_", " ").title()
    fallback_subject = readable_type
    fallback_body = f"{readable_type}\n\n{notification.context}"

    if delivery.channel == Channel.EMAIL:
        return fallback_subject, fallback_body

    # Non-email channels typically ignore subject
    return "", fallback_body
