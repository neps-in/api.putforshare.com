## Unified VerificationToken Model

### Core Idea

Use a single model with a `purpose` field to distinguish between flows — same token mechanics, different behavior on consumption.

---

## The Unified Model

```python
from django.db import models
from django.utils import timezone
import secrets, hashlib
from datetime import timedelta

class VerificationToken(models.Model):

    class Purpose(models.TextChoices):
        EMAIL_VERIFY  = 'email_verify',  'Email Verification'
        PASSWORD_RESET = 'password_reset', 'Password Reset'
        EMAIL_CHANGE  = 'email_change',  'Email Change'   # bonus — easy to add

    # Core fields
    user        = models.ForeignKey('auth.User', on_delete=models.CASCADE,
                                     related_name='verification_tokens')
    purpose     = models.CharField(max_length=20, choices=Purpose.choices)
    token_hash  = models.CharField(max_length=64, unique=True, db_index=True)

    # Email snapshot — useful for verify + email change flows
    email       = models.EmailField(null=True, blank=True)

    # Lifecycle
    created_at  = models.DateTimeField(auto_now_add=True)
    expires_at  = models.DateTimeField()
    used_at     = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['user', 'purpose']),
        ]

    # ── Validity ──────────────────────────────────────────────
    def is_valid(self):
        return self.used_at is None and self.expires_at > timezone.now()

    # ── Mark consumed ─────────────────────────────────────────
    def consume(self):
        self.used_at = timezone.now()
        self.save(update_fields=['used_at'])

    # ── Class-level factory ───────────────────────────────────
    @classmethod
    def create_for(cls, user, purpose, email=None, expiry_minutes=None):
        # Default expiry per purpose
        default_expiry = {
            cls.Purpose.EMAIL_VERIFY:   24 * 60,   # 24 hours
            cls.Purpose.PASSWORD_RESET: 30,         # 30 minutes
            cls.Purpose.EMAIL_CHANGE:   2  * 60,   # 2 hours
        }
        expiry = expiry_minutes or default_expiry[purpose]

        # Invalidate any existing active token for same user+purpose
        cls.objects.filter(
            user=user,
            purpose=purpose,
            used_at=None
        ).delete()

        raw_token  = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

        instance = cls.objects.create(
            user=user,
            purpose=purpose,
            token_hash=token_hash,
            email=email or user.email,
            expires_at=timezone.now() + timedelta(minutes=expiry)
        )

        return instance, raw_token   # raw_token goes into the email only
```

---

## Service Layer

One clean service class handles both flows:

```python
import hmac, hashlib
from django.contrib.auth import get_user_model

User = get_user_model()

class VerificationService:

    # ── Issue tokens ──────────────────────────────────────────

    @staticmethod
    def send_email_verification(user):
        token_obj, raw = VerificationToken.create_for(
            user, VerificationToken.Purpose.EMAIL_VERIFY
        )
        send_verification_email(user.email, raw)     # your mailer

    @staticmethod
    def send_password_reset(email):
        # Always return — never reveal if email exists
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return

        token_obj, raw = VerificationToken.create_for(
            user, VerificationToken.Purpose.PASSWORD_RESET
        )
        send_password_reset_email(user.email, raw)   # your mailer

    # ── Consume tokens ────────────────────────────────────────

    @staticmethod
    def _resolve_token(raw_token, expected_purpose):
        """Shared lookup + validation used by both flows."""
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

        try:
            token_obj = VerificationToken.objects.select_related('user').get(
                token_hash=token_hash,
                purpose=expected_purpose        # purpose mismatch = not found
            )
        except VerificationToken.DoesNotExist:
            raise InvalidTokenError("Token not found")

        if not token_obj.is_valid():
            raise InvalidTokenError("Token expired or already used")

        return token_obj

    @staticmethod
    def verify_email(raw_token):
        token_obj = VerificationService._resolve_token(
            raw_token, VerificationToken.Purpose.EMAIL_VERIFY
        )

        user = token_obj.user
        user.email     = token_obj.email     # apply snapshotted email
        user.is_active = True
        user.save(update_fields=['email', 'is_active'])

        token_obj.consume()
        return user

    @staticmethod
    def reset_password(raw_token, new_password):
        token_obj = VerificationService._resolve_token(
            raw_token, VerificationToken.Purpose.PASSWORD_RESET
        )

        user = token_obj.user
        user.set_password(new_password)
        user.save(update_fields=['password'])

        token_obj.consume()

        # Invalidate all sessions after password change
        invalidate_sessions(user)   # see note below
        return user
```

---

## API Views (Django REST Framework)

```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

class RequestPasswordResetView(APIView):
    def post(self, request):
        email = request.data.get('email', '').strip()
        VerificationService.send_password_reset(email)
        # Always 200 — no enumeration
        return Response({"detail": "If that email exists, a reset link was sent."})


class ConfirmPasswordResetView(APIView):
    def post(self, request):
        token    = request.data.get('token')
        password = request.data.get('password')
        try:
            VerificationService.reset_password(token, password)
            return Response({"detail": "Password updated."})
        except InvalidTokenError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class VerifyEmailView(APIView):
    def get(self, request, token):
        try:
            VerificationService.verify_email(token)
            return Response({"detail": "Email verified."})
        except InvalidTokenError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
```

---

## URL Routes

```python
urlpatterns = [
    # Email verification
    path('auth/verify-email/<str:token>/',    VerifyEmailView.as_view()),

    # Password reset
    path('auth/password-reset/request/',      RequestPasswordResetView.as_view()),
    path('auth/password-reset/confirm/',      ConfirmPasswordResetView.as_view()),
]
```

---

## Migration

```python
class Migration(migrations.Migration):
    operations = [
        migrations.CreateModel(
            name='VerificationToken',
            fields=[
                ('id',         models.BigAutoField(primary_key=True)),
                ('user',       models.ForeignKey('auth.User', on_delete=CASCADE,
                                related_name='verification_tokens')),
                ('purpose',    models.CharField(max_length=20, choices=[...])),
                ('token_hash', models.CharField(max_length=64, unique=True)),
                ('email',      models.EmailField(null=True, blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('expires_at', models.DateTimeField()),
                ('used_at',    models.DateTimeField(null=True, blank=True)),
            ],
        ),
        migrations.AddIndex(
            model_name='verificationtoken',
            index=models.Index(fields=['user', 'purpose']),
        ),
    ]
```

---

## How Purposes Stay Isolated

```
Token A → purpose='email_verify'   ──┐
                                      ├── same table, separate behavior
Token B → purpose='password_reset' ──┘

_resolve_token(..., expected_purpose='email_verify')
  → will NEVER match a password_reset token even with the same raw value
```

The `purpose` filter in `_resolve_token` ensures a reset link can't be used to verify an email and vice versa — critical for security.

---

## Cleanup (Cron Job)

```python
# Run daily — purge expired/used tokens older than 7 days
def cleanup_old_tokens():
    cutoff = timezone.now() - timedelta(days=7)
    deleted, _ = VerificationToken.objects.filter(
        models.Q(expires_at__lt=cutoff) |
        models.Q(used_at__lt=cutoff)
    ).delete()
    print(f"Cleaned up {deleted} old tokens")
```

---

## What You Gain

| Concern | Benefit |
|---|---|
| One migration | Single table for all token flows |
| One token lifecycle | `create_for` / `is_valid` / `consume` reused everywhere |
| Purpose isolation | Cross-flow token reuse is impossible |
| Easy to extend | Add `EMAIL_CHANGE`, `PHONE_VERIFY`, `MAGIC_LINK` with zero schema changes |
| Audit trail | Query `VerificationToken.objects.filter(user=user)` to see full history |
