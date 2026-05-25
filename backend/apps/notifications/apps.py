from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    name = "apps.notifications"

    # def ready(self):
    #     # Task auto discovery happens via Celery, so only signals here if needed
    #     import notifications.signals  # noqa
