from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.conf import settings
from django.db import models
from django.utils.text import slugify

from taggit.managers import TaggableManager

from apps.common.models import UUIDModel

BOOK_QUALITY_CHOICES = (
    ("NEW", "New"),
    ("USED_LOOKS_NEW", "Used - Looks Like New"),
    ("USED_LOOKS_GOOD", "Used - Looks Good"),
    ("USED_ACCEPTABLE", "Used - Acceptable"),
)


class Category(UUIDModel):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True)
    # Todo - category can have image linked to photos model
    # one category - one photo 
    description = models.TextField(blank=True)

    class Meta:
        ordering = ("name",)
        verbose_name_plural = "Categories"

    def __str__(self) -> str:
        return self.name
    
    def save(self, *args, **kwargs):

        # Making the slug unique
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            num = 1
            while Category.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{num}"
                num += 1
            self.slug = slug

        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

class Product(UUIDModel):
    SELL_OPTION_CHOICES = (
        ("SELF_SELL", "Self Sell"),
        ("SMART_SELL", "Smart Sell"),
    )

    id = models.BigAutoField(primary_key=True)
    seller = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="products", on_delete=models.PROTECT, null=True)
    sku = models.CharField(max_length=100, unique=True)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    tags = TaggableManager(blank=True)

    upc = models.CharField(max_length=255, blank=True, default="")
    gcid = models.CharField(max_length=255, blank=True, default="")
    part_number = models.CharField(max_length=255, blank=True, default="")
    sell_option = models.CharField(max_length=15, choices=SELL_OPTION_CHOICES, default="SMART_SELL")

    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, blank=True, null=True)

    short_description = models.TextField(blank=True, default="")
    description = models.TextField(blank=True, default="")
    date_sale_price_starts = models.DateTimeField(null=True, blank=True, default=None)
    date_sale_price_ends = models.DateTimeField(null=True, blank=True, default=None)

    min_retail_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal("0.00"))])
    max_retail_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal("0.00"))])
    sale_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal("0.00"))])

    stock_quantity = models.PositiveIntegerField(default=1)
    product_dimension_length = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    product_dimension_breadth = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    product_dimension_height = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    product_dimension_weight = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    view_counter = models.BigIntegerField(default=0)
    inventory_note = models.TextField(blank=True, default="")
    is_featured = models.BooleanField(default=False)
    seller_state = models.CharField(max_length=50, blank=True, default="")
    
    class Meta:
        ordering = ("-updated_on",)
        constraints = [
            models.CheckConstraint(condition=models.Q(min_retail_price__gte=0), name="product_price_non_negative"),
            models.CheckConstraint(condition=models.Q(max_retail_price__gte=0), name="product_mrp_non_negative"),
            models.CheckConstraint(condition=models.Q(sale_price__gte=0), name="product_sale_price_non_negative"),
            models.CheckConstraint(condition=models.Q(stock_quantity__gte=0), name="product_stock_quantity_non_negative"),
            models.CheckConstraint(
                condition=models.Q(product_dimension_length__gte=0), name="product_dimension_length_non_negative"
            ),
            models.CheckConstraint(
                condition=models.Q(product_dimension_breadth__gte=0), name="product_dimension_breadth_non_negative"
            ),
            models.CheckConstraint(
                condition=models.Q(product_dimension_height__gte=0), name="product_dimension_height_non_negative"
            ),
            models.CheckConstraint(
                condition=models.Q(product_dimension_weight__gte=0), name="product_dimension_weight_non_negative"
            ),
            models.CheckConstraint(
                condition=models.Q(sale_price__lte=models.F("max_retail_price")),
                name="product_sale_price_lte_mrp",
            ),
        ]
        
    def save(self, *args, **kwargs):
        # Making the slug unique
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            num = 1
            while Product.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{num}"
                num += 1
            self.slug = slug

        super().save(*args, **kwargs)

    @staticmethod
    def is_book_category(category) -> bool:
        category_name = str(getattr(category, "name", "") or "").strip().lower()
        return "book" in category_name

    def clean(self):
        super().clean()
        if self.sale_price is not None and self.max_retail_price is not None and self.sale_price > self.max_retail_price:
            raise ValidationError({"sale_price": "Sale price must be less than or equal to max retail price."})

    @property
    def is_in_stock(self) -> bool:
        return self.stock_quantity > 0

    def __str__(self) -> str:
        return self.name

class Author(UUIDModel):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=255, unique=True)
    normalized_name = models.CharField(max_length=255, db_index=True)  # lowercase, accent-stripped, for dedupe
    slug = models.SlugField(
        max_length=255, default='')

    bio = models.TextField(blank=True, default="")
    photo = models.OneToOneField(
        "photos.Photo",
        related_name="author_profile",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        default=None,
    )
    is_featured = models.BooleanField(default=False)

    class Meta:
        ordering = ("name",)
        verbose_name_plural = "authors"

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs):
        # Making the slug unique
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            num = 1
            while Author.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{num}"
                num += 1
            self.slug = slug

        super().save(*args, **kwargs)


class Publisher(UUIDModel):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=255, unique=True)
    slug = models.SlugField(max_length=255, blank=True, null=True)
    description = models.TextField(blank=True, default="")
    brand_image = models.OneToOneField(
        "photos.Photo",
        related_name="publisher_brand",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        default=None,
    )
    is_featured = models.BooleanField(default=False)

    class Meta:
        ordering = ("name",)
        verbose_name_plural = "publishers"

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs):

        # Making the slug unique
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            num = 1
            while Publisher.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{num}"
                num += 1
            self.slug = slug

        super().save(*args, **kwargs)

    def __str__(self):
        return self.name



class Book(Product):
    quality = models.CharField(max_length=200, blank=True, default="")
    quality_note = models.CharField(max_length=255, blank=True, default="")
    isbn_10 = models.CharField(max_length=15, blank=True, default="")
    isbn_13 = models.CharField(max_length=15, blank=True, default="")
    
    book_language = models.CharField(max_length=255, blank=True, default="")
    book_edition = models.CharField(max_length=255, blank=True, default="")
    cover_type = models.CharField(max_length=255, blank=True, default="")
    page_count = models.PositiveIntegerField(default=0)
    publisher = models.ForeignKey(
        Publisher, related_name="books", on_delete=models.PROTECT, null=True, blank=True, default=None
    )
    published_date = models.CharField(max_length=20, blank=True, default="")  # raw string; APIs return "2019", "2019-03", "2019-03-15" after publisher
    published_year = models.PositiveIntegerField(null=True, blank=True)
    authors = models.ManyToManyField(Author, related_name="books", blank=True)
    metadata_quality_score = models.IntegerField(default=0)  # 0–100; see §10
    sources = models.JSONField(default=dict)  # {"google": {...raw}, "openlibrary": {...raw}} for audit
    field_origins = models.JSONField(default=dict)  # {"title": "google", "binding": "isbndb"} — which source provided each value
    last_fetched_at = models.DateTimeField(null=True, blank=True)
    last_refreshed_at = models.DateTimeField(null=True, blank=True)
    is_stale = models.BooleanField(default=False)  # flagged after 12 months
    manual_review_needed = models.BooleanField(default=False)
    
    # To display goodreads review in book detail page
    goodread_id = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        ordering = ("-updated_on",)
        indexes = [
            models.Index(fields=["isbn_10"]),
            models.Index(fields=["isbn_13"]),
            models.Index(fields=["published_year"]),
            models.Index(fields=["metadata_quality_score"]),
            models.Index(fields=["is_stale", "last_fetched_at"]),
        ]

    @classmethod
    def get_book_quality_choices(cls):
        return BOOK_QUALITY_CHOICES

    def get_quality_display_label(self) -> str:
        lookup = dict(BOOK_QUALITY_CHOICES)
        return lookup.get(self.quality, "")

    def clean(self):
        super().clean()
        valid_quality_values = {value for value, _ in BOOK_QUALITY_CHOICES}
        if self.quality and self.quality not in valid_quality_values:
            raise ValidationError({"quality": "Select a valid book quality."})
        if not self.quality:
            self.quality = "USED_LOOKS_GOOD"


class Soap(Product):
    brand = models.CharField(max_length=255, blank=True, default="")
    fragrance = models.CharField(max_length=255, blank=True, default="")
    net_weight_grams = models.PositiveIntegerField(default=0)
    skin_type = models.CharField(max_length=100, blank=True, default="")
    shelf_life_months = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ("-updated_on",)


class MerchantFeedSyncLog(models.Model):
    class TriggerSource(models.TextChoices):
        MANUAL = "MANUAL", "Manual"
        PRODUCT_UPDATE = "PRODUCT_UPDATE", "Product Update"
        SCHEDULED_12H = "SCHEDULED_12H", "Scheduled 12h"
        SCHEDULED_24H = "SCHEDULED_24H", "Scheduled 24h"

    class RunMode(models.TextChoices):
        FULL = "FULL", "Full"
        DELTA = "DELTA", "Delta"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        RUNNING = "RUNNING", "Running"
        SUCCESS = "SUCCESS", "Success"
        FAILED = "FAILED", "Failed"

    id = models.BigAutoField(primary_key=True)
    trigger_source = models.CharField(max_length=32, choices=TriggerSource.choices, default=TriggerSource.MANUAL)
    run_mode = models.CharField(max_length=10, choices=RunMode.choices, default=RunMode.FULL)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING, db_index=True)

    product = models.ForeignKey(
        Product,
        related_name="merchant_feed_sync_logs",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        default=None,
    )
    started_on = models.DateTimeField(null=True, blank=True, default=None)
    completed_on = models.DateTimeField(null=True, blank=True, default=None)
    celery_task_id = models.CharField(max_length=255, blank=True, default="")
    feed_relative_path = models.CharField(max_length=512, blank=True, default="")
    feed_public_url = models.URLField(max_length=1000, blank=True, default="")
    feed_checksum = models.CharField(max_length=128, blank=True, default="")
    total_items = models.PositiveIntegerField(default=0)
    success_items = models.PositiveIntegerField(default=0)
    failed_items = models.PositiveIntegerField(default=0)
    payload = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True, default="")

    created_on = models.DateTimeField(auto_now_add=True)
    updated_on = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_on",)

    def __str__(self):
        return f"MerchantFeedSyncLog #{self.id} - {self.trigger_source} - {self.status}"


class ISBNLookupLog(models.Model):
    """Per-source ISBN lookup audit row. Written by isbnapi sources after each fetch."""

    class Status(models.TextChoices):
        HIT = "hit", "Hit"
        MISS = "miss", "Miss"
        ERROR = "error", "Error"
        RATE_LIMITED = "rate_limited", "Rate Limited"

    id = models.BigAutoField(primary_key=True)
    isbn = models.CharField(max_length=13, db_index=True)
    source = models.CharField(max_length=50)
    status = models.CharField(max_length=20, choices=Status.choices)
    latency_ms = models.IntegerField()
    http_status = models.IntegerField(null=True, blank=True)
    error = models.TextField(blank=True, default="")
    created_on = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ("-created_on",)

    def __str__(self) -> str:
        return f"ISBNLookupLog[{self.source}/{self.status}] {self.isbn} #{self.id}"


class MerchantFeedDebounceEntry(models.Model):
    id = models.BigAutoField(primary_key=True)
    dedupe_key = models.CharField(max_length=255, unique=True)
    product = models.ForeignKey(
        Product,
        related_name="merchant_feed_debounce_entries",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        default=None,
    )
    next_sync_on = models.DateTimeField(db_index=True)
    last_seen_on = models.DateTimeField(auto_now=True)
    enqueue_count = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ("next_sync_on", "id")

    def __str__(self):
        return f"{self.dedupe_key} @ {self.next_sync_on.isoformat()}"
