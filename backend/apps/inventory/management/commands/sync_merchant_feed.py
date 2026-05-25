from django.core.management.base import BaseCommand

from apps.inventory.models import MerchantFeedSyncLog
from apps.inventory.tasks import run_merchant_feed_sync_task


class Command(BaseCommand):
    help = "Queue Google Merchant feed sync using Celery."

    def add_arguments(self, parser):
        parser.add_argument(
            "--trigger-source",
            default=MerchantFeedSyncLog.TriggerSource.MANUAL,
            choices=[choice[0] for choice in MerchantFeedSyncLog.TriggerSource.choices],
            help="Trigger source to record in sync logs.",
        )
        parser.add_argument(
            "--run-mode",
            default=MerchantFeedSyncLog.RunMode.FULL,
            choices=[choice[0] for choice in MerchantFeedSyncLog.RunMode.choices],
            help="Run mode for sync job.",
        )

    def handle(self, *args, **options):
        trigger_source = options["trigger_source"]
        run_mode = options["run_mode"]

        log = MerchantFeedSyncLog.objects.create(
            trigger_source=trigger_source,
            run_mode=run_mode,
            status=MerchantFeedSyncLog.Status.PENDING,
        )
        run_merchant_feed_sync_task.delay(
            log_id=log.id,
            trigger_source=trigger_source,
            run_mode=run_mode,
        )
        self.stdout.write(self.style.SUCCESS(f"Queued merchant feed sync. Log ID: {log.id}"))
