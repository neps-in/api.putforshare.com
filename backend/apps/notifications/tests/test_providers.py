# notifications/tests/test_providers.py
from __future__ import annotations

from unittest import mock

from django.test import TestCase, override_settings
from anymail.exceptions import AnymailAPIError

from apps.notifications.providers.email import EmailProvider, ProviderError


@override_settings(
    DEFAULT_FROM_EMAIL="noreply@putforshare.com",
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
)
class EmailProviderTests(TestCase):
    def setUp(self):
        self.provider = EmailProvider()

    def test_send_returns_message_id_from_anymail_status(self):
        fake_status = mock.Mock(message_id="ses-id-xyz")

        with mock.patch(
            "apps.notifications.providers.email.EmailMultiAlternatives.send",
            return_value=1,
        ):
            with mock.patch.object(
                EmailProvider, "send", autospec=False
            ):
                pass  # placeholder; real call below

        # Real send path: patch EmailMultiAlternatives.send and inject anymail_status.
        def fake_send(self_msg, fail_silently=False):
            self_msg.anymail_status = fake_status
            return 1

        with mock.patch(
            "django.core.mail.EmailMultiAlternatives.send",
            new=fake_send,
        ):
            msg_id = self.provider.send(
                target="user@example.com",
                subject="hi",
                body="<p>hi</p>",
                context={},
                user=None,
                channel="email",
                notification_type="welcome",
            )
        self.assertEqual(msg_id, "ses-id-xyz")

    def test_empty_target_raises_provider_error(self):
        with self.assertRaises(ProviderError):
            self.provider.send(
                target="",
                subject="x",
                body="x",
                context={},
                user=None,
                channel="email",
                notification_type="welcome",
            )

    def test_anymail_api_error_is_wrapped(self):
        def boom(self_msg, fail_silently=False):
            raise AnymailAPIError("boom")

        with mock.patch(
            "django.core.mail.EmailMultiAlternatives.send",
            new=boom,
        ):
            with self.assertRaises(ProviderError) as cm:
                self.provider.send(
                    target="user@example.com",
                    subject="hi",
                    body="hi",
                    context={},
                    user=None,
                    channel="email",
                    notification_type="welcome",
                )
        self.assertIn("SES API error", str(cm.exception))
