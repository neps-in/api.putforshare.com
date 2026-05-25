"""
Seed the NotificationTemplate DB table from prd/email-templates/.

At send time, apps.notifications.tasks.email_delivery.render_email_from_notification
uses a Django Engine whose dirs include settings.EMAIL_TEMPLATE_DIRS, so
`{% extends "email_base.html" %}` resolves correctly from the stored body.

Usage:
    python manage.py seed_notification_templates
    python manage.py seed_notification_templates --dry-run
"""
from __future__ import annotations

from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from apps.notifications.models import Channel, NotificationTemplate


# (notification_type, html_filename, default_subject)
TEMPLATES = [
    ("welcome", "welcome.html", "Welcome to PutForShare"),
    ("password_reset", "forgot_password.html", "Reset your PutForShare password"),
    ("email_verification", "email_verification.html", "Verify your PutForShare email"),
    ("merchant_feed_sync_failed", "merchant_feed_sync_failed.html",
     "[PutForShare] Google Merchant feed sync failed"),
]


def _templates_dir() -> Path:
    dirs = getattr(settings, "EMAIL_TEMPLATE_DIRS", None) or []
    if not dirs:
        raise RuntimeError("settings.EMAIL_TEMPLATE_DIRS is empty.")
    return Path(dirs[0])


class Command(BaseCommand):
    help = "Seed NotificationTemplate rows from prd/email-templates/*.html"

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, **opts):
        templates_dir = _templates_dir()
        if not templates_dir.exists():
            self.stderr.write(f"Templates dir not found: {templates_dir}")
            return

        for ntype, filename, default_subject in TEMPLATES:
            path = templates_dir / filename
            if not path.exists():
                self.stderr.write(f"  skip {ntype}: {path} missing")
                continue

            body = path.read_text(encoding="utf-8")

            if opts["dry_run"]:
                self.stdout.write(
                    f"  would seed type={ntype!r} channel=email "
                    f"({len(body)} bytes from {filename})"
                )
                continue

            obj, created = NotificationTemplate.objects.update_or_create(
                type=ntype,
                channel=Channel.EMAIL,
                defaults={
                    "subject": default_subject,
                    "body": body,
                    "is_active": True,
                },
            )
            verb = "created" if created else "updated"
            self.stdout.write(
                f"  {verb} type={ntype!r} channel=email ({len(body)} bytes)"
            )

        self.stdout.write(self.style.SUCCESS("Done."))
