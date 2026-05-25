# notifications/providers/__init__.py
from __future__ import annotations

from typing import Dict

from .base import BaseProvider, ProviderError
from .email import EmailProvider

_email_provider = EmailProvider()

PROVIDERS: Dict[str, BaseProvider] = {
    "email": _email_provider,
}


def get_provider_for_channel(channel: str) -> BaseProvider:
    """Return a provider for the given channel, or raise ValueError."""
    try:
        return PROVIDERS[channel]
    except KeyError:
        raise ValueError(f"No provider configured for channel: {channel}")


__all__ = ["BaseProvider", "ProviderError", "EmailProvider", "get_provider_for_channel"]
