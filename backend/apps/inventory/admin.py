from django.contrib import admin, messages
from django.db.models import Count

from .models import (
    Author,
    Book,
    BookAuthor,
    Category,
    ISBNLookupLog,
    ISBNNotFoundCache,
    MerchantFeedDebounceEntry,
    MerchantFeedSyncLog,
    Product,
    Publisher,
    Soap,
)


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
    list_display = ("name", "uuid", "normalized_name", "slug", "book_count", "is_active")
    readonly_fields = ("slug", "normalized_name")
    search_fields = ("name", "normalized_name", "uuid")

    def get_queryset(self, request):
        # Annotate book-link count to avoid N+1 on the changelist.
        return super().get_queryset(request).annotate(_book_count=Count("author_books"))

    @admin.display(description="# books", ordering="_book_count")
    def book_count(self, obj):
        return obj._book_count


@admin.register(Publisher)
class PublisherAdmin(admin.ModelAdmin):
    list_display = ("name", "uuid", "slug", "is_active")
    readonly_fields = ("slug",)
    search_fields = ("name", "uuid")


class BookAuthorInline(admin.TabularInline):
    """Editable Book↔Author M2M through rows with order + role."""

    model = BookAuthor
    extra = 0
    autocomplete_fields = ("author",)
    fields = ("author", "role", "order")
    ordering = ("order", "id")


@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    """Book admin with resolver-aware columns + manual-review workflow.

    PRD §9.2: surface isbn_13, title, primary author, binding (`cover_type`),
    metadata_quality_score, last_fetched_at. PRD §9.3 actions: re-enrich
    (force_refresh=True) and mark/clear manual review.

    The "Regenerate covers" action from the PRD is intentionally absent —
    covers are deferred to the existing product-image system, not the resolver.
    """

    list_display = (
        "isbn_13",
        "name",
        "primary_author",
        "cover_type",
        "metadata_quality_score",
        "manual_review_needed",
        "is_stale",
        "last_fetched_at",
    )
    list_filter = (
        "is_active",
        "manual_review_needed",
        "is_stale",
        "cover_type",
        "publisher",
        "category",
    )
    search_fields = ("name", "subtitle", "sku", "uuid", "isbn_10", "isbn_13", "authors__name")
    ordering = ("-last_fetched_at",)
    inlines = (BookAuthorInline,)
    readonly_fields = ("last_fetched_at", "last_refreshed_at", "sources", "field_origins")
    actions = ("reenrich_books", "mark_manual_review_needed", "clear_manual_review_flag")

    def get_queryset(self, request):
        # Prevent N+1 when rendering primary_author + publisher columns.
        return (
            super().get_queryset(request)
            .select_related("publisher")
            .prefetch_related("book_authors__author")
        )

    @admin.display(description="Primary author")
    def primary_author(self, obj):
        # `book_authors` is the related_name on BookAuthor's FK to Book.
        # Ordered by (order, id) so the first one is the merger-supplied first author.
        first = next(iter(obj.book_authors.all()), None)
        return first.author.name if first else "—"

    # -------- Actions --------

    @admin.action(description="Re-enrich selected books (force_refresh=True)")
    def reenrich_books(self, request, queryset):
        # Imported lazily so admin doesn't pay the Celery import cost at module load.
        from .services.isbnapi.tasks import enrich_isbn_task

        enqueued, skipped = 0, 0
        for book in queryset.only("id", "isbn_13", "isbn_10"):
            isbn = book.isbn_13 or book.isbn_10
            if not isbn:
                skipped += 1
                continue
            enrich_isbn_task.delay(isbn, force_refresh=True)
            enqueued += 1
        self.message_user(
            request,
            f"Enqueued {enqueued} re-enrichment task(s). Skipped {skipped} book(s) without an ISBN.",
            level=messages.SUCCESS if enqueued else messages.WARNING,
        )

    @admin.action(description="Mark as manual review needed")
    def mark_manual_review_needed(self, request, queryset):
        updated = queryset.update(manual_review_needed=True)
        self.message_user(
            request, f"Flagged {updated} book(s) for manual review.", level=messages.SUCCESS,
        )

    @admin.action(description="Clear manual review flag")
    def clear_manual_review_flag(self, request, queryset):
        updated = queryset.update(manual_review_needed=False)
        self.message_user(
            request, f"Cleared review flag on {updated} book(s).", level=messages.SUCCESS,
        )


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


# ---------------------------------------------------------------------------
# ISBN resolver — read-only audit + suppression admin
# ---------------------------------------------------------------------------

@admin.register(ISBNLookupLog)
class ISBNLookupLogAdmin(admin.ModelAdmin):
    """Read-only audit view. Every row is written by `BookSource.fetch`."""

    list_display = ("created_on", "isbn", "source", "status", "http_status", "latency_ms")
    list_filter = ("source", "status", "created_on")
    search_fields = ("isbn", "error")
    readonly_fields = ("isbn", "source", "status", "latency_ms", "http_status", "error", "created_on")
    date_hierarchy = "created_on"
    ordering = ("-created_on",)

    def has_add_permission(self, request):
        return False  # audit-only

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        # Allow bulk-delete for housekeeping (we have no automated purge for this table yet).
        return request.user.is_superuser


@admin.register(ISBNNotFoundCache)
class ISBNNotFoundCacheAdmin(admin.ModelAdmin):
    """Suppression rows for ISBNs no source has metadata for.

    The "Clear suppression" action deletes the selected rows so the next
    lookup runs the cascade fresh — handy when a previously-unknown ISBN
    has since been added to one of the upstream catalogues.
    """

    list_display = ("isbn_13", "attempts", "is_active_suppression", "last_attempt_at", "retry_after")
    list_filter = ("attempts",)
    search_fields = ("isbn_13",)
    readonly_fields = ("isbn_13", "attempts", "last_attempt_at", "retry_after", "created_on")
    ordering = ("-last_attempt_at",)
    actions = ("clear_suppression",)

    @admin.display(description="Active?", boolean=True)
    def is_active_suppression(self, obj):
        from django.utils import timezone
        return obj.retry_after > timezone.now()

    @admin.action(description="Clear suppression (next lookup will run the cascade)")
    def clear_suppression(self, request, queryset):
        deleted, _ = queryset.delete()
        self.message_user(
            request, f"Cleared {deleted} suppression row(s).", level=messages.SUCCESS,
        )

    def has_add_permission(self, request):
        # Rows are created by the resolver, not by admins.
        return False
