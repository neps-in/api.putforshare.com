from django.db import transaction
from django.db.models.signals import m2m_changed, post_delete, post_save
from django.dispatch import receiver

from django.utils import timezone
from django.conf import settings

from apps.inventory.models import Author, Book, Category, Product, Publisher, Soap, MerchantFeedDebounceEntry


def _debounce_minutes() -> int:
    raw = int(getattr(settings, "MERCHANT_PUSH_DEBOUNCE_MINUTES", 15))
    return max(1, raw)


def _enqueue_debounce_key(*, dedupe_key: str, product_id: int | None = None) -> None:
    def _on_commit():
        next_sync_on = timezone.now() + timezone.timedelta(minutes=_debounce_minutes())
        entry, created = MerchantFeedDebounceEntry.objects.get_or_create(
            dedupe_key=dedupe_key,
            defaults={
                "product_id": product_id,
                "next_sync_on": next_sync_on,
                "enqueue_count": 1,
            },
        )
        if created:
            return
        entry.product_id = product_id
        entry.next_sync_on = next_sync_on
        entry.enqueue_count = int(entry.enqueue_count or 0) + 1
        entry.save(update_fields=["product", "next_sync_on", "enqueue_count", "last_seen_on"])

    transaction.on_commit(_on_commit)


@receiver(post_save, sender=Product)
def on_product_saved(sender, instance, **kwargs):
    _enqueue_debounce_key(dedupe_key=f"product:{instance.pk}", product_id=instance.pk)


@receiver(post_delete, sender=Product)
def on_product_deleted(sender, instance, **kwargs):
    _enqueue_debounce_key(dedupe_key=f"product:{instance.pk}", product_id=instance.pk)


@receiver(post_save, sender=Book)
def on_book_saved(sender, instance, **kwargs):
    _enqueue_debounce_key(dedupe_key=f"product:{instance.pk}", product_id=instance.pk)


@receiver(post_save, sender=Soap)
def on_soap_saved(sender, instance, **kwargs):
    _enqueue_debounce_key(dedupe_key=f"product:{instance.pk}", product_id=instance.pk)


@receiver(post_save, sender=Category)
def on_category_saved(sender, instance, **kwargs):
    _enqueue_debounce_key(dedupe_key="global:catalog", product_id=None)


@receiver(post_save, sender=Author)
def on_author_saved(sender, instance, **kwargs):
    _enqueue_debounce_key(dedupe_key="global:catalog", product_id=None)


@receiver(post_save, sender=Publisher)
def on_publisher_saved(sender, instance, **kwargs):
    _enqueue_debounce_key(dedupe_key="global:catalog", product_id=None)


@receiver(m2m_changed, sender=Product.tags.through)
def on_product_tags_changed(sender, instance, action, **kwargs):
    if action in {"post_add", "post_remove", "post_clear"}:
        _enqueue_debounce_key(dedupe_key=f"product:{instance.pk}", product_id=instance.pk)


@receiver(m2m_changed, sender=Book.authors.through)
def on_book_authors_changed(sender, instance, action, **kwargs):
    if action in {"post_add", "post_remove", "post_clear"}:
        _enqueue_debounce_key(dedupe_key=f"product:{instance.pk}", product_id=instance.pk)
