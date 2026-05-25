# notifications/admin.py
from __future__ import annotations

import json

from django.contrib import admin, messages
from django.http import HttpRequest, HttpResponse
from django.template import Template, Context
from django.urls import path, reverse
from django.utils.html import format_html

from .models import (
    Notification,
    NotificationDelivery,
    NotificationTemplate,
    UserNotificationPreference,
    Channel,
    DeliveryStatus,
)

class ProblemDeliveryFilter(admin.SimpleListFilter):
    title = "Problem status"
    parameter_name = "problem"

    def lookups(self, request, model_admin):
        return [
            ("problems", "Failed / Gave up"),
            ("retries", "Currently retrying"),
        ]

    def queryset(self, request, queryset):
        value = self.value()
        if value == "problems":
            return queryset.filter(status__in=[DeliveryStatus.FAILED, DeliveryStatus.GAVE_UP])
        if value == "retries":
            return queryset.filter(status=DeliveryStatus.RETRYING)
        return queryset


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """
    Top-level notifications:
    - Inspect when events were created
    - See which user they belong to
    - Debug context
    """
    list_display = (
        "id",
        "type",
        "recipient",
        "title",
        "created_at",
        "send_email",
        "email_sent_at",
        "is_read",
    )
    list_filter = ("type", "send_email", "is_read", "created_at")
    search_fields = ("title", "message", "recipient__email", "recipient__username")
    date_hierarchy = "created_at"

    readonly_fields = ("created_at", "email_sent_at", "context")


@admin.register(NotificationDelivery)
class NotificationDeliveryAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "channel",
        "target",
        "status",
        "attempt_count",
        "provider_message_id",
        "notification_type",
        "notification_title",
        "created_at",
        "updated_at",
        "short_error",
    )
    list_filter = (
        "channel",
        "status",
        ProblemDeliveryFilter,
        "created_at",
    )
    search_fields = (
        "target",
        "notification__type",
        "notification__title",
        "provider_message_id",
        "last_error",
    )
    date_hierarchy = "created_at"
    ordering = ("-created_at",)

    readonly_fields = (
        "notification",
        "channel",
        "target",
        "status",
        "attempt_count",
        "last_error",
        "provider_message_id",
        "created_at",
        "updated_at",
    )

    # Helpful for quick navigation back to Notification
    def notification_type(self, obj):
        return obj.notification.type

    notification_type.short_description = "Type"

    def notification_title(self, obj):
        return obj.notification.title

    notification_title.short_description = "Title"

    def short_error(self, obj):
        if not obj.last_error:
            return ""
        if len(obj.last_error) <= 60:
            return obj.last_error
        return obj.last_error[:57] + "..."

    short_error.short_description = "Last error"

    # Optional action: retry failed/gave_up deliveries
    actions = ["retry_deliveries"]

    @admin.action(description="Retry selected failed deliveries")
    def retry_deliveries(self, request, queryset):
        from apps.notifications.tasks.email_delivery import send_notification_delivery_email_task

        to_retry = queryset.filter(
            status__in=[DeliveryStatus.FAILED, DeliveryStatus.GAVE_UP],
            channel=Channel.EMAIL,  # for now only email
        )

        count = 0
        for delivery in to_retry:
            delivery.status = DeliveryStatus.PENDING
            delivery.last_error = ""
            delivery.save(update_fields=["status", "last_error"])
            send_notification_delivery_email_task.delay(delivery.id)
            count += 1

        self.message_user(request, f"Re-queued {count} delivery(ies) for retry.", messages.SUCCESS)


@admin.register(NotificationTemplate)
class NotificationTemplateAdmin(admin.ModelAdmin):
    list_display = ("type", "channel", "is_active", "updated_at", "preview_link")
    list_filter = ("channel", "is_active")
    search_fields = ("type", "body", "subject")
    ordering = ("type", "channel")

    # Quick actions
    actions = ["activate_templates", "deactivate_templates"]

    @admin.action(description="Activate selected templates")
    def activate_templates(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f"{updated} template(s) activated.", messages.SUCCESS)

    @admin.action(description="Deactivate selected templates")
    def deactivate_templates(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f"{updated} template(s) deactivated.", messages.SUCCESS)

    # --- Preview bits ---

    def preview_link(self, obj):
        url = reverse("admin:notifications_template_preview", args=[obj.pk])
        return format_html('<a href="{}">Preview</a>', url)

    preview_link.short_description = "Preview"

    def get_urls(self):
        """
        Add custom /preview/ URL under this ModelAdmin.
        """
        urls = super().get_urls()
        custom_urls = [
            path(
                "template-preview/<int:pk>/",
                self.admin_site.admin_view(self.preview_view),
                name="notifications_template_preview",
            ),
        ]
        return custom_urls + urls

    def preview_view(self, request: HttpRequest, pk: int) -> HttpResponse:
        """
        Render a simple page that lets you input JSON context and see rendered output.
        """
        tmpl = self.get_object(request, pk)
        if tmpl is None:
            self.message_user(request, "Template not found.", messages.ERROR)
            from django.shortcuts import redirect
            return redirect("admin:notifications_notificationtemplate_changelist")

        rendered_subject = ""
        rendered_body = ""
        context_json = request.POST.get("context_json") or '{"example_key": "example_value"}'
        error_message = None

        if request.method == "POST":
            try:
                context_dict = json.loads(context_json)
                ctx = Context(context_dict)

                # Render subject
                subject = tmpl.subject or ""
                subject_t = Template(subject)
                rendered_subject = subject_t.render(ctx)

                # Render body
                body_t = Template(tmpl.body)
                rendered_body = body_t.render(ctx)

            except json.JSONDecodeError as exc:
                error_message = f"Invalid JSON: {exc}"
            except Exception as exc:  # template error
                error_message = f"Template error: {exc}"

            if error_message:
                messages.error(request, error_message)
            else:
                messages.success(request, "Template rendered successfully.")

        # Minimal custom template using admin base
        from django.shortcuts import render

        return render(
            request,
            "admin/notifications/template_preview.html",
            {
                "template_obj": tmpl,
                "context_json": context_json,
                "rendered_subject": rendered_subject,
                "rendered_body": rendered_body,
                "title": f"Preview template: {tmpl.type} ({tmpl.channel})",
            },
        )

@admin.register(UserNotificationPreference)
class UserNotificationPreferenceAdmin(admin.ModelAdmin):
    """
    Per-user settings:
    - Allow support to enable/disable certain channels
    - Inspect fine-grained per_type JSON
    """
    list_display = (
        "user",
        "email_enabled",
        "sms_enabled",
        "whatsapp_enabled",
        "updated_at",
    )
    list_filter = ("email_enabled", "sms_enabled", "whatsapp_enabled")
    search_fields = ("user__email", "user__username")
    raw_id_fields = ("user",)
    readonly_fields = ("updated_at",)



