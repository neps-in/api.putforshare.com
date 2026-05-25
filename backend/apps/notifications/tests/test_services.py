# notifications/tests/test_services.py
from __future__ import annotations

from unittest import mock

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.notifications.models import (
    Channel,
    DeliveryStatus,
    UserNotificationPreference,
)
from apps.notifications.services import notification_service

User = get_user_model()


class NotificationServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="svc@example.com",
            username="svcuser",
            password="pass1234",
        )

    @mock.patch("apps.notifications.services.send_notification_delivery_email_task.delay")
    def test_send_creates_notification_and_email_delivery(self, mock_delay):
        notification, deliveries = notification_service.send(
            user=self.user,
            type="welcome",
            title="Welcome",
            message="Thanks for joining.",
            target_url="https://dash.putforshare.com/onboarding",
        )

        self.assertEqual(notification.recipient_id, self.user.id)
        self.assertEqual(notification.title, "Welcome")
        self.assertTrue(notification.send_email)
        self.assertEqual(len(deliveries), 1)
        self.assertEqual(deliveries[0].channel, Channel.EMAIL)
        self.assertEqual(deliveries[0].target, self.user.email)
        mock_delay.assert_called_once_with(deliveries[0].id)

    @mock.patch("apps.notifications.services.send_notification_delivery_email_task.delay")
    def test_email_disabled_preference_skips_email_delivery(self, mock_delay):
        UserNotificationPreference.objects.create(
            user=self.user, email_enabled=False,
        )

        notification, deliveries = notification_service.send(
            user=self.user, type="welcome", title="Welcome",
        )

        self.assertEqual(notification.send_email, True)  # notification still flagged
        self.assertEqual(deliveries, [])                 # but no delivery row
        mock_delay.assert_not_called()

    @mock.patch("apps.notifications.services.send_notification_delivery_email_task.delay")
    def test_per_type_override_wins_over_global_flag(self, mock_delay):
        UserNotificationPreference.objects.create(
            user=self.user,
            email_enabled=True,
            per_type={"marketing": []},
        )

        _, deliveries = notification_service.send(
            user=self.user, type="marketing", title="Promo",
        )
        self.assertEqual(deliveries, [])
        mock_delay.assert_not_called()

    @mock.patch("apps.notifications.services.send_notification_delivery_email_task.delay")
    def test_sms_channel_marks_gave_up_without_provider(self, mock_delay):
        _, deliveries = notification_service.send(
            user=self.user,
            type="order_shipped",
            title="Shipped",
            channels=[Channel.SMS],
            override_targets={Channel.SMS: "+919999999999"},
        )

        self.assertEqual(len(deliveries), 1)
        deliveries[0].refresh_from_db()
        self.assertEqual(deliveries[0].status, DeliveryStatus.GAVE_UP)
        self.assertIn("No provider configured", deliveries[0].last_error)
        mock_delay.assert_not_called()
