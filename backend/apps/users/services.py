import hashlib
import logging
from urllib.parse import quote_plus

from django.conf import settings
from rest_framework.authtoken.models import Token

from apps.notifications.services import notification_service
from .models import User, VerificationToken

logger = logging.getLogger(__name__)


class InvalidTokenError(Exception):
    pass


def _first_name(user: User) -> str:
    full = (getattr(user, "full_name", "") or "").strip()
    if full:
        return full.split()[0]
    return (user.username or "").strip()


def _send_notification_safe(**kwargs) -> None:
    try:
        notification_service.send(**kwargs)
    except Exception:
        logger.exception("notification_service.send failed for kwargs=%s", kwargs)


class VerificationService:
    @staticmethod
    def send_email_verification(user: User) -> None:
        _, raw = VerificationToken.create_for(
            user, VerificationToken.Purpose.EMAIL_VERIFY
        )
        frontend = settings.FRONTEND_BASE_URL.rstrip("/")
        action_url = f"{frontend}/verify-email?token={quote_plus(raw)}"
        _send_notification_safe(
            user=user,
            type="email_verification",
            title="Verify your PutForShare email",
            context={
                "first_name": _first_name(user),
                "user_email": user.email,
                "action_url": action_url,
                "expires_in_hours": VerificationToken.DEFAULT_EXPIRY_MINUTES[
                    VerificationToken.Purpose.EMAIL_VERIFY
                ] // 60,
            },
        )

    @staticmethod
    def resend_email_verification(email: str) -> None:
        user = User.objects.filter(email=email, is_archived=False, is_active=False).first()
        if not user:
            return
        VerificationService.send_email_verification(user)

    @staticmethod
    def send_password_reset(email: str) -> None:
        user = User.objects.filter(email=email, is_archived=False).first()
        if not user:
            return
        _, raw = VerificationToken.create_for(
            user, VerificationToken.Purpose.PASSWORD_RESET
        )
        frontend = settings.FRONTEND_BASE_URL.rstrip("/")
        action_url = f"{frontend}/reset-password?token={quote_plus(raw)}"
        _send_notification_safe(
            user=user,
            type="password_reset",
            title="Reset your PutForShare password",
            context={
                "first_name": _first_name(user),
                "user_email": user.email,
                "action_url": action_url,
                "expires_in_hours": max(
                    VerificationToken.DEFAULT_EXPIRY_MINUTES[
                        VerificationToken.Purpose.PASSWORD_RESET
                    ] // 60,
                    1,
                ),
            },
        )

    @staticmethod
    def _resolve_token(raw_token: str, expected_purpose: str) -> VerificationToken:
        if not raw_token:
            raise InvalidTokenError("Token not found")
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        try:
            token_obj = VerificationToken.objects.select_related("user").get(
                token_hash=token_hash,
                purpose=expected_purpose,
            )
        except VerificationToken.DoesNotExist as exc:
            raise InvalidTokenError("Token not found") from exc

        if not token_obj.is_valid():
            raise InvalidTokenError("Token expired or already used")
        return token_obj

    @staticmethod
    def verify_email(raw_token: str) -> User:
        token_obj = VerificationService._resolve_token(
            raw_token, VerificationToken.Purpose.EMAIL_VERIFY
        )
        user = token_obj.user
        if token_obj.email and user.email != token_obj.email:
            user.email = token_obj.email
        if not user.is_active:
            user.is_active = True
        user.save(update_fields=["email", "is_active"])
        token_obj.consume()
        return user

    @staticmethod
    def reset_password(raw_token: str, new_password: str) -> User:
        token_obj = VerificationService._resolve_token(
            raw_token, VerificationToken.Purpose.PASSWORD_RESET
        )
        user = token_obj.user
        user.set_password(new_password)
        user.save(update_fields=["password"])
        token_obj.consume()
        Token.objects.filter(user=user).delete()
        return user


verification_service = VerificationService()
