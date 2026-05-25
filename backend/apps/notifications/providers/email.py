# notifications/providers/email.py

from __future__ import annotations

import logging
from typing import Any, Mapping, Optional

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.utils.html import strip_tags

from anymail.exceptions import AnymailAPIError, AnymailRecipientsRefused

from .base import BaseProvider, ProviderError

logger = logging.getLogger(__name__)


class EmailProvider(BaseProvider):
    """
    Email provider that routes through Django's configured EMAIL_BACKEND,
    which in this project is anymail's AWS SES backend.

    - Uses DEFAULT_FROM_EMAIL from settings (sourced from .env).
    - Raises ProviderError on AnymailAPIError so Celery can retry.
    - Returns SES's message id from msg.anymail_status for tracking.
    """

    channel = "email"

    def send(
        self,
        *,
        target: str,
        subject: str,
        body: str,
        context: Mapping[str, Any],
        user: Optional[Any],
        channel: str,
        notification_type: str,
    ) -> Optional[str]:
        from_email = getattr(settings, "DEFAULT_FROM_EMAIL", None)
        if not from_email:
            raise ProviderError("DEFAULT_FROM_EMAIL is not configured.")

        if not target:
            raise ProviderError("Empty recipient address.")

        html_body = body or " "
        text_body = strip_tags(html_body) or " "

        reply_to_addr = getattr(settings, "EMAIL_REPLY_TO", None)
        reply_to = [reply_to_addr] if reply_to_addr else None

        msg = EmailMultiAlternatives(
            subject=subject or "(no subject)",
            body=text_body,
            from_email=from_email,
            to=[target],
            reply_to=reply_to,
        )
        msg.attach_alternative(html_body, "text/html")

        try:
            sent = msg.send(fail_silently=False)
        except AnymailRecipientsRefused as exc:
            raise ProviderError(f"SES rejected recipient {target}: {exc}") from exc
        except AnymailAPIError as exc:
            raise ProviderError(f"SES API error: {exc}") from exc
        except Exception as exc:
            raise ProviderError(f"SES send failed: {exc}") from exc

        if not sent:
            raise ProviderError("SES backend reported zero messages sent.")

        message_id = None
        status = getattr(msg, "anymail_status", None)
        if status is not None:
            message_id = getattr(status, "message_id", None)
            # message_id may be a dict {recipient: id}; normalize to a string.
            if isinstance(message_id, dict):
                message_id = message_id.get(target) or next(iter(message_id.values()), None)

        logger.info(
            "SES accepted message for %s (id=%s, type=%s)",
            target,
            message_id,
            notification_type,
        )
        return message_id or None
