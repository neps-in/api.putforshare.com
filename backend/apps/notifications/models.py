from __future__ import annotations

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.db import models
from django.utils import timezone

User = get_user_model()

# 🧠 What these models solve
# | Problem                        | Solution                                              |
# | ------------------------------ | ----------------------------------------------------- |
# | Avoid duplicate provider calls | `DeliveryStatus` + `provider_message_id`              |
# | Retry failures automatically   | Celery handles retries using these models             |
# | Audit / compliance             | Logs target, errors, attempts, timestamps             |
# | Notification muting/opt-out    | Stored **on user**, not per app                       |
# | Fast template updates          | Editable via Django admin                             |
# | Multi-channel support          | Single `Notification → multiple NotificationDelivery` |



class Channel(models.TextChoices):
    """
    Supported notification channels (“mediums”).
    These values are used both for routing and template lookup.
    
    Tuple
    In Python 3, when you write 
    variable = "value1", "value2", you are assigning a tuple to the 
    variable variable.A tuple is an ordered, immutable sequence 
    of elements. The elements are enclosed in parentheses, but in this specific case, the parentheses are optional when creating a 
    tuple with multiple items separated by commas.
    """
    EMAIL = "email", "Email"
    SMS = "sms", "SMS"
    WHATSAPP = "whatsapp", "WhatsApp"


class DeliveryStatus(models.TextChoices):
    """
    Status lifecycle of a delivery attempt (per-channel).
    - pending    → Not yet picked up by Celery
    - retrying   → Being retried (Celery exponential backoff)
    - sent       → Successfully delivered to provider API
    - failed     → Failed but will retry again
    - gave_up    → Max retries reached, stopped
    """
    PENDING = "pending", "Pending"
    SENT = "sent", "Sent"
    FAILED = "failed", "Failed"
    RETRYING = "retrying", "Retrying"
    GAVE_UP = "gave_up", "Gave Up"


class Notification(models.Model):
    """
    Represents ONE logical notification event.

    Examples:
    - "Welcome email" upon user registration
    - "Order #321 shipped" for purchase workflow
    - "Password reset"

    A single logical notification may be sent across multiple channels
    (email + SMS + WhatsApp), so this model has a one-to-many relationship
    with NotificationDelivery.
    """

    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,    # If user is deleted → auto-remove notifications
        null=True,                   # Allow system notifications (no user)
        blank=True,
        related_name="notifications",
    )
    
    # Optional: who caused this (admin, system, customer)
    actor = models.ForeignKey(
        User,
        related_name='notifications_caused',
        on_delete=models.SET_NULL,
        null=True, blank=True
    )
    
    # Category / type, useful for filtering
    type = models.CharField(
        max_length=64,
        db_index=True,               # Speed up filtering by type
        help_text="String key for this event (e.g. 'welcome', 'order_shipped').",
        blank=True, default='generic'
    )
    
    # In-app content
    title = models.CharField(max_length=255)
    message = models.TextField(blank=True)
    target_url = models.URLField(blank=True)  # order details, etc.

    # Read tracking for in-app notifications
    is_read = models.BooleanField(default=False)

    # Email-related
    send_email = models.BooleanField(default=False)      # should this be emailed?
    email_sent_at = models.DateTimeField(null=True, blank=True)
    email_subject = models.CharField(max_length=255, blank=True)
    email_body = models.TextField(blank=True)

    context = models.JSONField(
        default=dict,
        blank=True,
        help_text="Dynamic data for template rendering (e.g., order_id, first_name).",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.type} →  {self.recipient or 'System'} - {self.title[:30]}"

    def get_email_subject(self):
        return self.email_subject or self.title

    def get_email_body(self):
        if self.email_body:
            return self.email_body
        base = self.message or self.title
        if self.target_url:
            base += f"\n\nView details: {self.target_url}"
        return base

    def send_email_now(self):
        """Synchronous email sender — bypasses Celery/NotificationDelivery."""
        if not self.send_email:
            return
        if not self.recipient or not self.recipient.email:
            return

        send_mail(
            self.get_email_subject(),
            self.get_email_body(),
            getattr(settings, "DEFAULT_FROM_EMAIL", None),
            [self.recipient.email],
            fail_silently=True,
        )

        self.email_sent_at = timezone.now()
        self.save(update_fields=["email_sent_at"])


class NotificationDelivery(models.Model):
    """
    Represents ONE physical send attempt to a specific target over a specific channel.
    i.e., The actual message that will go out via Celery.

    There can be multiple deliveries for a single Notification:
    - Email delivery with subject/body
    - SMS delivery with short text
    - WhatsApp delivery with template message

    This table stores:
    - target (email / phone / whatsApp number)
    - status changes: pending → sent OR failed → retry → gave_up
    - provider message IDs for tracking
    """

    notification = models.ForeignKey(
        Notification,
        on_delete=models.CASCADE,
        related_name="deliveries",   # notification.deliveries.all()
    )

    channel = models.CharField(
        max_length=32,
        choices=Channel.choices,     # Must match allowed channels
    )

    target = models.CharField(
        max_length=255,
        help_text="Where the message will be delivered (email / phone / WhatsApp ID).",
    )

    status = models.CharField(
        max_length=32,
        choices=DeliveryStatus.choices,
        default=DeliveryStatus.PENDING,
        db_index=True,               # Faster admin + operational queries
    )

    attempt_count = models.PositiveIntegerField(
        default=0,
        help_text="How many times this delivery has been attempted.",
    )

    last_error = models.TextField(
        blank=True,
        help_text="The most recent failure message from provider/API.",
    )

    provider_message_id = models.CharField(
        max_length=255,
        blank=True,
        help_text="API-tracking ID (e.g., Twilio SID, Email Message ID).",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)  # For monitoring changes

    class Meta:
        indexes = [
            # Operationally useful for dashboards and recovery scripts
            models.Index(fields=["channel", "status"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"{self.channel} → {self.target} ({self.status})"


class NotificationTemplate(models.Model):
    """
    Stores reusable content templates.
    One entry per (type + channel).

    Why store in DB instead of code?
    - Business teams can edit via Django admin
    - No production deploy needed to edit wording
    - Templates can be translated per language later

    Example:
        type="welcome", channel="email" → HTML email template
        type="order_shipped", channel="sms" → short SMS body
    """

    type = models.CharField(
        max_length=64,
        db_index=True,
        help_text="Matches Notification.type (e.g. 'welcome', 'order_shipped').",
    )

    channel = models.CharField(max_length=32, choices=Channel.choices)

    # Email: Subject and HTML/Text body
    subject = models.CharField(
        max_length=255,
        blank=True,
        help_text="Email only: SMS/WhatsApp do not use subject.",
    )

    body = models.TextField(
        help_text="Django template markup allowed (HTML/Text). Use context variables.",
    )

    is_active = models.BooleanField(
        default=True,
        help_text="Disable a template without deleting it.",
    )

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("type", "channel")  # Exactly 1 template per channel per type
        ordering = ["type", "channel"]

    def __str__(self):
        return f"{self.type} ({self.channel})"


class UserNotificationPreference(models.Model):
    """
    Optional per-user settings to respect privacy/legal/cost preferences.

    Example use cases:
    - User opts out of SMS (to save cost)
    - User only wants marketing via email, not WhatsApp
    - GDPR: allow users to suppress certain categories

    `per_type` enables per-notification rules,
    e.g. {"order_shipped": ["email"], "marketing": []}
    """

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="notification_preferences",
    )

    # Global channel toggles (universal for all notification types)
    # True: allow this channel for the user
    email_enabled = models.BooleanField(default=True)
    sms_enabled = models.BooleanField(default=False)
    whatsapp_enabled = models.BooleanField(default=False)

    # Example structure:
    # {
    #   "order_shipped": ["email"],
    #   "marketing": []  # blocked completely
    # }
    per_type = models.JSONField(
        default=dict,
        blank=True,
        help_text="Override channel selection per type (optional).",
    )

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Preferences for {self.user}"
