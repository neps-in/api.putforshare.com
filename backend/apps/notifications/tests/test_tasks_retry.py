# notifications/tests/test_tasks_retry.py
from __future__ import annotations

from unittest import mock

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.notifications.models import (
    Channel,
    DeliveryStatus,
    Notification,
    NotificationDelivery,
)
from apps.notifications.providers.base import ProviderError
from apps.notifications.tasks.email_delivery import send_notification_delivery_email_task

User = get_user_model()


class SendNotificationDeliveryEmailTaskTests(TestCase):
    def setUp(self) -> None:
        self.user = User.objects.create_user(
            email="test@example.com",
            username="tester",
            password="pass1234",
        )
        self.notification = Notification.objects.create(
            recipient=self.user,
            type="welcome",
            title="Welcome",
            send_email=True,
            context={"first_name": "Test"},
        )
        self.delivery = NotificationDelivery.objects.create(
            notification=self.notification,
            channel=Channel.EMAIL,
            target=self.user.email,
        )

    @mock.patch(
        "apps.notifications.tasks.email_delivery.email_provider.send",
        return_value="ses-msg-id-123",
    )
    def test_successful_send_marks_sent(self, mock_send):
        send_notification_delivery_email_task(self.delivery.id)

        self.delivery.refresh_from_db()
        self.assertEqual(self.delivery.status, DeliveryStatus.SENT)
        self.assertEqual(self.delivery.attempt_count, 1)
        self.assertEqual(self.delivery.provider_message_id, "ses-msg-id-123")
        self.assertEqual(self.delivery.last_error, "")
        mock_send.assert_called_once()

        self.notification.refresh_from_db()
        self.assertIsNotNone(self.notification.email_sent_at)

    @mock.patch(
        "apps.notifications.tasks.email_delivery.email_provider.send",
        side_effect=ProviderError("SES rejected"),
    )
    def test_provider_error_marks_failed_and_reraises_for_retry(self, mock_send):
        with self.assertRaises(ProviderError):
            send_notification_delivery_email_task(self.delivery.id)

        self.delivery.refresh_from_db()
        self.assertEqual(self.delivery.status, DeliveryStatus.FAILED)
        self.assertEqual(self.delivery.attempt_count, 1)
        self.assertIn("SES rejected", self.delivery.last_error)

    @mock.patch("apps.notifications.tasks.email_delivery.email_provider.send")
    def test_already_sent_delivery_is_skipped(self, mock_send):
        self.delivery.status = DeliveryStatus.SENT
        self.delivery.save(update_fields=["status"])

        send_notification_delivery_email_task(self.delivery.id)
        mock_send.assert_not_called()

    @mock.patch("apps.notifications.tasks.email_delivery.email_provider.send")
    def test_missing_target_marks_gave_up(self, mock_send):
        self.delivery.target = ""
        self.delivery.save(update_fields=["target"])

        send_notification_delivery_email_task(self.delivery.id)

        self.delivery.refresh_from_db()
        self.assertEqual(self.delivery.status, DeliveryStatus.GAVE_UP)
        self.assertIn("No target", self.delivery.last_error)
        mock_send.assert_not_called()
