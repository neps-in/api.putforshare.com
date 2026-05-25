# notifications/providers/base.py

from __future__ import annotations
from dataclasses import dataclass
from typing import Any, Mapping, Optional

from django.contrib.auth import get_user_model

User = get_user_model()


class ProviderError(Exception):
    """
    Base exception for provider-level errors.
    Use this for wrapping low-level library/API errors if you want custom handling.
    """
    pass


class BaseProvider:
    """
    Base class for all notification providers (email, SMS, WhatsApp, etc.).

    Concrete providers should implement `send`.
    """

    channel: str

    def send(
        self,
        *,
        target: str,
        subject: str,
        body: str,
        context: Mapping[str, Any],
        user: Optional[User],
        channel: str,
        notification_type: str,
    ) -> Optional[str]:
        """
        Perform the actual send.

        :param target:            Email address / phone number / WhatsApp ID.
        :param subject:           Subject (email only; can be empty otherwise).
        :param body:              Rendered message body (HTML or text).
        :param context:           Notification context dict.
        :param user:              Associated user (may be None).
        :param channel:           Channel name (e.g. 'email').
        :param notification_type: Logical notification type (e.g. 'welcome').
        :return:                  Provider message ID or None.
        """
        raise NotImplementedError("Provider must implement send()")
