from __future__ import annotations

from typing import Any

from rest_framework.views import exception_handler


def _extract_first_message(value: Any) -> str:
    if isinstance(value, dict):
        for nested in value.values():
            message = _extract_first_message(nested)
            if message:
                return message
        return ""

    if isinstance(value, list):
        for nested in value:
            message = _extract_first_message(nested)
            if message:
                return message
        return ""

    if value is None:
        return ""

    return str(value)


def standardized_exception_handler(exc: Exception, context: dict[str, Any]):
    response = exception_handler(exc, context)
    if response is None:
        return None

    original_payload = response.data
    message = _extract_first_message(original_payload)
    if not message:
        message = "Request failed."

    response.data = {
        "detail": message,
        "errors": original_payload,
        "status_code": response.status_code,
    }
    return response
