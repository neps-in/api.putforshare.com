"""SES bounce/complaint handling via anymail's tracking signal.

Anymail's amazon_ses webhook normalizes SNS notifications into
``anymail.signals.AnymailTrackingEvent`` instances. We:

  1. Persist every event as a :class:`SesEvent` (audit log).
  2. Suppress the recipient address on permanent bounce or complaint.
  3. Link the event back to the originating :class:`NotificationDelivery`
     when the SES message-id matches ``provider_message_id``.
"""
from __future__ import annotations

import logging
from typing import Any

from django.db import transaction
from django.dispatch import receiver

from anymail.signals import tracking, AnymailTrackingEvent

from .models import (
    DeliveryStatus,
    NotificationDelivery,
    SesEvent,
    SesEventType,
    SuppressedEmail,
    SuppressionReason,
)

logger = logging.getLogger(__name__)

# Anymail event-type → our enum. Anything else falls into OTHER.
_EVENT_TYPE_MAP = {
    "bounced": SesEventType.BOUNCE,
    "rejected": SesEventType.REJECT,
    "complained": SesEventType.COMPLAINT,
    "delivered": SesEventType.DELIVERY,
    "sent": SesEventType.SEND,
}


@receiver(tracking)
def handle_anymail_tracking(sender, event: AnymailTrackingEvent, esp_name: str, **kwargs: Any) -> None:
    if esp_name != "Amazon SES":
        return

    event_type = _EVENT_TYPE_MAP.get(event.event_type, SesEventType.OTHER)
    recipient = (event.recipient or "").lower().strip()
    message_id = event.message_id or ""

    # SES bounce subtype lives in esp_event["bounce"]["bounceType"] (Permanent/Transient/Undetermined);
    # complaint subtype lives in esp_event["complaint"]["complaintFeedbackType"].
    esp_event = event.esp_event or {}
    subtype = ""
    diagnostic = event.description or ""
    if event_type == SesEventType.BOUNCE:
        bounce = esp_event.get("bounce") or {}
        subtype = bounce.get("bounceType") or ""
        if not diagnostic:
            recips = bounce.get("bouncedRecipients") or []
            if recips:
                diagnostic = recips[0].get("diagnosticCode", "") or ""
    elif event_type == SesEventType.COMPLAINT:
        complaint = esp_event.get("complaint") or {}
        subtype = complaint.get("complaintFeedbackType") or ""

    with transaction.atomic():
        delivery = None
        if message_id:
            delivery = (
                NotificationDelivery.objects
                .filter(provider_message_id=message_id)
                .order_by("-created_at")
                .first()
            )

        SesEvent.objects.create(
            event_type=event_type,
            message_id=message_id,
            recipient=recipient,
            subtype=subtype[:64],
            diagnostic=diagnostic[:10000],
            raw=esp_event,
            delivery=delivery,
        )

        # Mark the delivery as gave_up on permanent failures so retries stop.
        if delivery and event_type in (SesEventType.BOUNCE, SesEventType.COMPLAINT, SesEventType.REJECT):
            permanent = (
                event_type == SesEventType.COMPLAINT
                or event_type == SesEventType.REJECT
                or (event_type == SesEventType.BOUNCE and subtype == "Permanent")
            )
            if permanent and delivery.status != DeliveryStatus.GAVE_UP:
                delivery.status = DeliveryStatus.GAVE_UP
                delivery.last_error = f"SES {event_type}/{subtype or 'n/a'}: {diagnostic[:500]}"
                delivery.save(update_fields=["status", "last_error", "updated_at"])

        # Add to suppression list on permanent bounce or any complaint.
        if recipient and (
            event_type == SesEventType.COMPLAINT
            or (event_type == SesEventType.BOUNCE and subtype == "Permanent")
        ):
            reason = (
                SuppressionReason.COMPLAINT
                if event_type == SesEventType.COMPLAINT
                else SuppressionReason.HARD_BOUNCE
            )
            SuppressedEmail.objects.update_or_create(
                email=recipient,
                defaults={"reason": reason, "notes": diagnostic[:1000]},
            )
            logger.warning(
                "Suppressed %s (%s): %s", recipient, reason, diagnostic[:200]
            )
