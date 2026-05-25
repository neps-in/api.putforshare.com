# notifications/tests/test_tasks.py
"""Render-pipeline tests for tasks.email_delivery.render_email_from_notification."""
from __future__ import annotations

from django.test import TestCase

from apps.notifications.models import Channel, Notification, NotificationTemplate
from apps.notifications.tasks.email_delivery import render_email_from_notification


class RenderEmailFromNotificationTests(TestCase):
    def test_db_template_is_used_when_present(self):
        NotificationTemplate.objects.create(
            type="welcome",
            channel=Channel.EMAIL,
            subject="Hi {{ first_name }}",
            body="<p>Hello {{ first_name }}!</p>",
            is_active=True,
        )
        n = Notification(
            type="welcome",
            title="ignored",
            context={"first_name": "Aravind"},
        )
        subject, body = render_email_from_notification(n)
        self.assertEqual(subject, "Hi Aravind")
        self.assertIn("Hello Aravind!", body)

    def test_fallback_uses_notification_fields_when_no_db_row(self):
        n = Notification(
            type="no_such_type",
            title="Subject {{ first_name }}",
            email_body="Body for {{ first_name }}",
            context={"first_name": "Aravind"},
        )
        subject, body = render_email_from_notification(n)
        self.assertEqual(subject, "Subject Aravind")
        self.assertIn("Body for Aravind", body)

    def test_extends_email_base_resolves_from_loader(self):
        # body that extends the shared layout — only works if Engine has dirs set.
        NotificationTemplate.objects.create(
            type="extends_test",
            channel=Channel.EMAIL,
            subject="x",
            body='{% extends "email_base.html" %}{% block content %}HELLO{% endblock %}',
            is_active=True,
        )
        n = Notification(type="extends_test", title="x", context={})
        _, body = render_email_from_notification(n)
        self.assertIn("<!DOCTYPE html>", body)
        self.assertIn("HELLO", body)
