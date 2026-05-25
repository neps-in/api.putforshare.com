from django.contrib import admin

from .models import Author, Book, Category, MerchantFeedDebounceEntry, MerchantFeedSyncLog, Product, Publisher, Soap


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "uuid", "slug", "is_active")
    search_fields = ("name", "slug", "uuid")


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "uuid", "sku", "category", "seller", "is_active", "tag_list")
    search_fields = ("name", "sku", "uuid", "tags__name")
    list_filter = ("is_active", "category")

    @admin.display(description="Tags")
    def tag_list(self, obj):
        return ", ".join(obj.tags.names())


@admin.register(Author)
class AuthorAdmin(admin.ModelAdmin):
    list_display = ("name", "uuid", "slug","is_active")
    readonly_fields = ['slug']
    search_fields = ("name", "uuid")


@admin.register(Publisher)
class PublisherAdmin(admin.ModelAdmin):
    list_display = ("name", "uuid", "slug", "is_active")
    readonly_fields = ['slug']
    search_fields = ("name", "uuid")


@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ("name", "uuid", "sku", "publisher", "is_active")
    search_fields = ("name", "sku", "uuid", "isbn_10", "isbn_13")
    list_filter = ("is_active", "publisher", "category")
    filter_horizontal = ("authors",)


@admin.register(Soap)
class SoapAdmin(admin.ModelAdmin):
    list_display = ("name", "uuid", "sku", "brand", "is_active")
    search_fields = ("name", "sku", "uuid", "brand")
    list_filter = ("is_active", "brand", "category")


@admin.register(MerchantFeedSyncLog)
class MerchantFeedSyncLogAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "trigger_source",
        "run_mode",
        "status",
        "product",
        "total_items",
        "success_items",
        "failed_items",
        "created_on",
    )
    list_filter = ("trigger_source", "run_mode", "status", "created_on")
    search_fields = ("id", "celery_task_id", "error_message", "feed_relative_path", "feed_checksum")
    readonly_fields = (
        "trigger_source",
        "run_mode",
        "status",
        "product",
        "started_on",
        "completed_on",
        "celery_task_id",
        "feed_relative_path",
        "feed_public_url",
        "feed_checksum",
        "total_items",
        "success_items",
        "failed_items",
        "payload",
        "error_message",
        "created_on",
        "updated_on",
    )


@admin.register(MerchantFeedDebounceEntry)
class MerchantFeedDebounceEntryAdmin(admin.ModelAdmin):
    list_display = ("id", "dedupe_key", "product", "next_sync_on", "enqueue_count", "last_seen_on")
    list_filter = ("next_sync_on", "last_seen_on")
    search_fields = ("dedupe_key", "product__name", "product__sku")
