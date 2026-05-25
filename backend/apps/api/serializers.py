import logging
from decimal import Decimal

from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone
from rest_framework import serializers
from taggit.models import Tag

from apps.common.uuid_utils import generate_uuid7
from apps.cart.models import Cart, CartItem
from apps.inventory.models import Author, Book, Category, Product, Publisher, Soap, BOOK_QUALITY_CHOICES
from apps.notifications.services import notification_service
from apps.orders.models import Order, OrderItem
from apps.payments.models import Coupon, CouponUsage, Payment, PaymentGateway, Refund
from apps.photos.models import Photo, PhotoAttachment
from apps.users.models import Address, User, VerificationToken
from apps.users.services import VerificationService

logger = logging.getLogger(__name__)


def _first_name(user: User) -> str:
    """Best-effort first name from full_name, falling back to the username."""
    full = (getattr(user, "full_name", "") or "").strip()
    if full:
        return full.split()[0]
    return (user.username or "").strip()


def _send_notification_safe(**kwargs) -> None:
    """Fire-and-forget wrapper so email/broker errors don't break the request."""
    try:
        notification_service.send(**kwargs)
    except Exception:
        logger.exception("notification_service.send failed for kwargs=%s", kwargs)


class UserSerializer(serializers.ModelSerializer):
    mobile_verified = serializers.SerializerMethodField()
    upi_verified = serializers.SerializerMethodField()
    profile_image_uuid = serializers.SlugRelatedField(source="profile_image", slug_field="uuid", read_only=True)
    profile_image_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "uuid",
            "email",
            "username",
            "full_name",
            "mobile",
            "mobile_verified_on",
            "mobile_verified",
            "favourite_book",
            "upi_id",
            "upi_verified",
            "profile_image_uuid",
            "profile_image_url",
            "pfs_role",
            "plan",
            "plan_locked",
            "is_active",
            "inventories",
            "net_earnings",
            "created_on",
            "updated_on",
        ]

    def get_mobile_verified(self, obj):
        return obj.mobile_verified_on is not None

    def get_upi_verified(self, obj):
        if hasattr(obj, "upi_verified"):
            return bool(obj.upi_verified)
        return obj.upi_last_verified_on is not None

    def get_profile_image_url(self, obj):
        if not obj.profile_image:
            return ""
        return obj.profile_image.effective_url


class AdminUserSerializer(serializers.ModelSerializer):
    mobile_verified = serializers.SerializerMethodField()
    profile_image_uuid = serializers.SlugRelatedField(
        source="profile_image",
        slug_field="uuid",
        queryset=Photo.objects.filter(is_archived=False),
        required=False,
        allow_null=True,
    )
    profile_image_url = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True, required=False, allow_blank=True, min_length=8)

    class Meta:
        model = User
        fields = [
            "uuid",
            "email",
            "username",
            "full_name",
            "password",
            "mobile",
            "mobile_verified_on",
            "mobile_verified",
            "favourite_book",
            "profile_image_uuid",
            "profile_image_url",
            "upi_id",
            "upi_verified",
            "pfs_role",
            "plan",
            "plan_locked",
            "is_active",
            "is_staff",
            "is_superuser",
            "inventories",
            "net_earnings",
            "created_on",
            "updated_on",
        ]
        read_only_fields = [
            "uuid",
            "mobile_verified_on",
            "mobile_verified",
            "profile_image_url",
            "upi_verified",
            "inventories",
            "net_earnings",
            "created_on",
            "updated_on",
        ]

    def validate_username(self, value):
        user = self.instance
        if User.objects.filter(username=value).exclude(pk=getattr(user, "pk", None)).exists():
            raise serializers.ValidationError("Username already in use.")
        return value

    def validate(self, attrs):
        if self.instance is None and not attrs.get("password"):
            raise serializers.ValidationError({"password": ["Password is required."]})
        user = self.instance
        if user and user.pfs_role == "SELLER" and user.plan_locked and "plan" in attrs and attrs["plan"] != user.plan:
            raise serializers.ValidationError({"plan": ["Plan can only be chosen once and is now locked."]})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        return User.objects.create_user(password=password, **validated_data)

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        next_plan = validated_data.get("plan", instance.plan)
        next_role = validated_data.get("pfs_role", instance.pfs_role)
        if next_role == "SELLER" and not instance.plan_locked and next_plan != instance.plan:
            validated_data["plan_locked"] = True
        if next_role != "SELLER":
            validated_data["plan_locked"] = False
        updated = super().update(instance, validated_data)
        if password:
            updated.set_password(password)
            updated.save(update_fields=["password", "updated_on"])
        return updated

    def get_mobile_verified(self, obj):
        return obj.mobile_verified_on is not None

    def get_upi_verified(self, obj):
        if hasattr(obj, "upi_verified"):
            return bool(obj.upi_verified)
        return obj.upi_last_verified_on is not None

    def get_profile_image_url(self, obj):
        if not obj.profile_image:
            return ""
        return obj.profile_image.effective_url


class ProfileEditSerializer(serializers.ModelSerializer):
    mobile_verified = serializers.SerializerMethodField()
    profile_image_uuid = serializers.SlugRelatedField(
        source="profile_image",
        slug_field="uuid",
        queryset=Photo.objects.filter(is_archived=False),
        required=False,
        allow_null=True,
    )
    profile_image_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "uuid",
            "email",
            "full_name",
            "username",
            "mobile",
            "mobile_verified_on",
            "mobile_verified",
            "favourite_book",
            "profile_image_uuid",
            "profile_image_url",
            "upi_id",
            "upi_verified",
            "plan",
            "plan_locked",
            "inventories",
            "net_earnings",
            "is_active",
            "created_on",
            "updated_on",
        ]
        read_only_fields = [
            "uuid",
            "email",
            "mobile_verified_on",
            "mobile_verified",
            "profile_image_url",
            "upi_verified",
            "plan_locked",
            "inventories",
            "net_earnings",
            "is_active",
            "created_on",
            "updated_on",
        ]

    def validate_username(self, value):
        user = self.instance
        if User.objects.filter(username=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError("Username already in use.")
        return value

    def validate(self, attrs):
        user = self.instance
        if user and user.pfs_role == "SELLER" and user.plan_locked and "plan" in attrs and attrs["plan"] != user.plan:
            raise serializers.ValidationError({"plan": ["Plan can only be chosen once and is now locked."]})
        return attrs

    def update(self, instance, validated_data):
        next_plan = validated_data.get("plan", instance.plan)
        if instance.pfs_role == "SELLER" and not instance.plan_locked and next_plan != instance.plan:
            validated_data["plan_locked"] = True
        return super().update(instance, validated_data)

    def get_mobile_verified(self, obj):
        return obj.mobile_verified_on is not None

    def get_upi_verified(self, obj):
        if hasattr(obj, "upi_verified"):
            return bool(obj.upi_verified)
        return obj.upi_last_verified_on is not None

    def get_profile_image_url(self, obj):
        if not obj.profile_image:
            return ""
        return obj.profile_image.effective_url


class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["email", "username", "full_name", "password"]

    def create(self, validated_data):
        password = validated_data.pop("password")
        validated_data.setdefault("pfs_role", "CUSTOMER")
        user = User.objects.create_user(password=password, **validated_data)

        frontend = settings.FRONTEND_BASE_URL.rstrip("/")
        ctx_common = {
            "first_name": _first_name(user),
            "user_email": user.email,
        }

        _send_notification_safe(
            user=user,
            type="welcome",
            title="Welcome to PutForShare",
            context={
                **ctx_common,
                "action_url": f"{frontend}/onboarding",
            },
        )

        VerificationService.send_email_verification(user)
        return user


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField()
    password = serializers.CharField(write_only=True, min_length=8)


class EmailVerificationConfirmSerializer(serializers.Serializer):
    token = serializers.CharField()


class EmailVerificationResendSerializer(serializers.Serializer):
    email = serializers.EmailField()


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = User.objects.filter(email=attrs["email"]).first()
        if not user or not user.check_password(attrs["password"]):
            raise serializers.ValidationError("Invalid email or password")
        if user.is_archived:
            raise serializers.ValidationError("User account is archived")
        if not user.is_active:
            has_pending_verify = VerificationToken.objects.filter(
                user=user,
                purpose=VerificationToken.Purpose.EMAIL_VERIFY,
                used_at__isnull=True,
            ).exists()
            if has_pending_verify or not user.last_login:
                raise serializers.ValidationError("Email not verified. Check your inbox.")
            raise serializers.ValidationError("User account is inactive")
        attrs["user"] = user
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_current_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect")
        return value

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password", "updated_on"])
        return user


class AddressSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(required=False, allow_blank=True)

    def validate_company_name(self, value):
        return value or ""

    class Meta:
        model = Address
        fields = [
            "id",
            "uuid",
            "address_name",
            "full_name",
            "mobile_num",
            "pincode",
            "building_name",
            "company_name",
            "area_sector",
            "locality",
            "landmark",
            "town_city",
            "state_region",
            "address_type",
            "default_shipping_address",
            "default_billing_address",
            "is_active",
            "is_archived",
            "created_on",
            "updated_on",
        ]


class AdminAddressSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(required=False, allow_blank=True)
    user_uuid = serializers.SlugRelatedField(
        source="user",
        slug_field="uuid",
        queryset=User.objects.filter(is_archived=False),
    )
    user_email = serializers.SerializerMethodField()

    def validate_company_name(self, value):
        return value or ""

    class Meta:
        model = Address
        fields = [
            "id",
            "uuid",
            "user_uuid",
            "user_email",
            "address_name",
            "full_name",
            "mobile_num",
            "pincode",
            "building_name",
            "company_name",
            "area_sector",
            "locality",
            "landmark",
            "town_city",
            "state_region",
            "address_type",
            "default_shipping_address",
            "default_billing_address",
            "is_active",
            "is_archived",
            "created_on",
            "updated_on",
        ]
        read_only_fields = [
            "id",
            "uuid",
            "user_email",
            "created_on",
            "updated_on",
        ]

    def get_user_email(self, obj):
        return getattr(obj.user, "email", "") if obj.user_id else ""


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["uuid", "name", "slug", "description", "is_active"]


class AuthorSerializer(serializers.ModelSerializer):
    photo_uuid = serializers.SlugRelatedField(
        source="photo",
        slug_field="uuid",
        queryset=Photo.objects.filter(is_archived=False),
        required=False,
        allow_null=True,
    )
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = Author
        fields = [
            "uuid",
            "name",
            "slug",
            "bio",
            "photo_uuid",
            "photo_url",
            "is_featured",
            "is_active",
            "created_on",
            "updated_on",
        ]

    def get_photo_url(self, obj):
        if not obj.photo:
            return ""
        return obj.photo.effective_url


class PublisherSerializer(serializers.ModelSerializer):
    brand_image_uuid = serializers.SlugRelatedField(
        source="brand_image",
        slug_field="uuid",
        queryset=Photo.objects.filter(is_archived=False),
        required=False,
        allow_null=True,
    )
    brand_image_url = serializers.SerializerMethodField()

    class Meta:
        model = Publisher
        fields = [
            "uuid",
            "name",
            "slug",
            "description",
            "brand_image_uuid",
            "brand_image_url",
            "is_featured",
            "is_active",
            "created_on",
            "updated_on",
        ]

    def get_brand_image_url(self, obj):
        if not obj.brand_image:
            return ""
        return obj.brand_image.effective_url


class CategoryWithProductCountSerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Category
        fields = ["uuid", "name", "slug", "description", "product_count", "is_active"]


class TagWithProductCountSerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Tag
        fields = ["name", "slug", "product_count"]


class AuthorWithProductCountSerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Author
        fields = ["uuid", "name", "slug", "product_count", "is_active"]


class PublisherWithProductCountSerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Publisher
        fields = ["uuid", "name", "slug", "description", "product_count", "is_active"]


class SellerWithProductCountSerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = User
        fields = ["uuid", "full_name", "username", "product_count"]


class ProductCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["uuid", "name", "slug"]


class ProductDetailAuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Author
        fields = ["uuid", "name", "slug"]


class ProductDetailPublisherSerializer(serializers.ModelSerializer):
    class Meta:
        model = Publisher
        fields = ["uuid", "name", "slug"]


class BookDetailSerializer(serializers.ModelSerializer):
    publisher = ProductDetailPublisherSerializer(read_only=True)
    authors = ProductDetailAuthorSerializer(many=True, read_only=True)

    class Meta:
        model = Book
        fields = [
            "isbn_10",
            "isbn_13",
            "book_language",
            "book_edition",
            "cover_type",
            "page_count",
            "published_year",
            "publisher",
            "authors",
        ]


class SoapDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Soap
        fields = [
            "brand",
            "fragrance",
            "net_weight_grams",
            "skin_type",
            "shelf_life_months",
        ]


class TagListField(serializers.Field):
    default_error_messages = {
        "invalid_type": "Tags must be a list of strings.",
        "invalid_item": "Each tag must be a non-empty string up to 100 characters.",
    }

    def to_representation(self, value):
        return list(value.names())

    def to_internal_value(self, data):
        if not isinstance(data, list):
            self.fail("invalid_type")

        normalized = []
        for item in data:
            if not isinstance(item, str):
                self.fail("invalid_item")
            cleaned = item.strip()
            if not cleaned or len(cleaned) > 100:
                self.fail("invalid_item")
            normalized.append(cleaned)
        return normalized


def _get_related_book(obj):
    if isinstance(obj, Book):
        return obj
    try:
        return obj.book
    except Book.DoesNotExist:
        return None


class ProductSerializer(serializers.ModelSerializer):
    seller_uuid = serializers.UUIDField(source="seller.uuid", read_only=True)
    category_uuid = serializers.UUIDField(source="category.uuid", read_only=True)
    category = ProductCategorySerializer(read_only=True)
    tags = TagListField(required=False)
    tag_details = serializers.SerializerMethodField()
    product_type = serializers.SerializerMethodField()
    quality = serializers.SerializerMethodField()
    quality_note = serializers.SerializerMethodField()
    quality_label = serializers.SerializerMethodField()
    quality_choices = serializers.SerializerMethodField()
    book_edition = serializers.SerializerMethodField()
    cover_type = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "uuid",
            "seller_uuid",
            "category_uuid",
            "category",
            "sku",
            "upc",
            "gcid",
            "part_number",
            "sell_option",
            "name",
            "short_description",
            "description",
            "date_sale_price_starts",
            "date_sale_price_ends",
            "quality",
            "quality_note",
            "quality_label",
            "quality_choices",
            "min_retail_price",
            "max_retail_price",
            "sale_price",
            "stock_quantity",
            "product_dimension_length",
            "product_dimension_breadth",
            "product_dimension_height",
            "product_dimension_weight",
            "view_counter",
            "inventory_note",
            "is_featured",
            "seller_state",
            "tags",
            "tag_details",
            "product_type",
            "book_edition",
            "cover_type",
            "is_active",
        ]
        read_only_fields = ["product_type"]

    def get_product_type(self, obj):
        if Product.is_book_category(getattr(obj, "category", None)):
            return "BOOK"
        if "soap" in str(getattr(getattr(obj, "category", None), "name", "") or "").strip().lower():
            return "SOAP"
        return "PRODUCT"

    def get_quality(self, obj):
        book = Book.objects.filter(pk=obj.pk).first()
        return str(getattr(book, "quality", "") or "") if book else ""

    def get_quality_note(self, obj):
        book = Book.objects.filter(pk=obj.pk).first()
        return str(getattr(book, "quality_note", "") or "") if book else ""

    def get_quality_label(self, obj):
        book = Book.objects.filter(pk=obj.pk).first()
        if not book:
            return ""
        return dict(BOOK_QUALITY_CHOICES).get(str(getattr(book, "quality", "") or ""), "")

    def get_quality_choices(self, obj):
        book = Book.objects.filter(pk=obj.pk).first()
        if not book:
            return []
        return [{"id": value, "name": label} for value, label in BOOK_QUALITY_CHOICES]

    def get_tag_details(self, obj):
        return [{"name": tag.name, "slug": tag.slug} for tag in obj.tags.all().order_by("name")]

    def get_book_edition(self, obj):
        if hasattr(obj, "book"):
            return obj.book.book_edition or ""
        return ""

    def get_cover_type(self, obj):
        if hasattr(obj, "book"):
            return obj.book.cover_type or ""
        return ""

    def create(self, validated_data):
        tags = validated_data.pop("tags", [])
        product = Product.objects.create(**validated_data)
        if tags:
            product.tags.set(tags)
        return product

    def update(self, instance, validated_data):
        tags = validated_data.pop("tags", None)
        instance = super().update(instance, validated_data)
        if tags is not None:
            instance.tags.set(tags)
        return instance


class ProductDetailSerializer(ProductSerializer):
    book_details = serializers.SerializerMethodField()
    soap_details = serializers.SerializerMethodField()

    class Meta(ProductSerializer.Meta):
        fields = [*ProductSerializer.Meta.fields, "book_details", "soap_details"]

    def get_book_details(self, obj):
        if not hasattr(obj, "book"):
            return None
        return BookDetailSerializer(obj.book).data

    def get_soap_details(self, obj):
        if not hasattr(obj, "soap"):
            return None
        return SoapDetailSerializer(obj.soap).data


class MyInventorySerializer(serializers.ModelSerializer):
    seller_uuid = serializers.UUIDField(source="seller.uuid", read_only=True)
    category_uuid = serializers.UUIDField(required=False, write_only=True)
    sku = serializers.CharField(required=False, allow_blank=True)
    min_retail_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    max_retail_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    sale_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    stock_quantity = serializers.IntegerField(required=False, min_value=0)
    category = ProductCategorySerializer(read_only=True)
    tags = TagListField(required=False)
    tag_details = serializers.SerializerMethodField()
    product_type = serializers.SerializerMethodField()
    quality = serializers.CharField(required=False, allow_blank=True, default="", write_only=True)
    quality_note = serializers.CharField(required=False, allow_blank=True, default="", write_only=True)
    quality_label = serializers.SerializerMethodField()
    quality_choices = serializers.SerializerMethodField()
    isbn_10_input = serializers.CharField(required=False, allow_blank=True, write_only=True)
    isbn_13_input = serializers.CharField(required=False, allow_blank=True, write_only=True)
    author_name_input = serializers.CharField(required=False, allow_blank=True, write_only=True)
    publisher_name_input = serializers.CharField(required=False, allow_blank=True, write_only=True)
    book_language_input = serializers.CharField(required=False, allow_blank=True, write_only=True)
    book_edition_input = serializers.CharField(required=False, allow_blank=True, write_only=True)
    cover_type_input = serializers.CharField(required=False, allow_blank=True, write_only=True)
    page_count_input = serializers.IntegerField(required=False, min_value=0, write_only=True)
    published_year_input = serializers.IntegerField(required=False, min_value=0, write_only=True)
    soap_brand_input = serializers.CharField(required=False, allow_blank=True, write_only=True)
    soap_fragrance_input = serializers.CharField(required=False, allow_blank=True, write_only=True)
    soap_net_weight_grams_input = serializers.IntegerField(required=False, min_value=0, write_only=True)
    soap_skin_type_input = serializers.CharField(required=False, allow_blank=True, write_only=True)
    soap_shelf_life_months_input = serializers.IntegerField(required=False, min_value=0, write_only=True)
    author_name = serializers.SerializerMethodField()
    publisher_name = serializers.SerializerMethodField()
    isbn_10 = serializers.SerializerMethodField()
    isbn_13 = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "uuid",
            "seller_uuid",
            "category_uuid",
            "category",
            "sku",
            "upc",
            "gcid",
            "part_number",
            "sell_option",
            "name",
            "short_description",
            "description",
            "date_sale_price_starts",
            "date_sale_price_ends",
            "quality",
            "quality_note",
            "quality_label",
            "quality_choices",
            "min_retail_price",
            "max_retail_price",
            "sale_price",
            "stock_quantity",
            "product_dimension_length",
            "product_dimension_breadth",
            "product_dimension_height",
            "product_dimension_weight",
            "view_counter",
            "inventory_note",
            "is_featured",
            "seller_state",
            "tags",
            "tag_details",
            "product_type",
            "isbn_10",
            "isbn_13",
            "author_name",
            "publisher_name",
            "isbn_10_input",
            "isbn_13_input",
            "author_name_input",
            "publisher_name_input",
            "book_language_input",
            "book_edition_input",
            "cover_type_input",
            "page_count_input",
            "published_year_input",
            "soap_brand_input",
            "soap_fragrance_input",
            "soap_net_weight_grams_input",
            "soap_skin_type_input",
            "soap_shelf_life_months_input",
            "is_active",
            "is_archived",
            "created_on",
            "updated_on",
        ]
        read_only_fields = [
            "id",
            "uuid",
            "seller_uuid",
            "tag_details",
            "product_type",
            "isbn_10",
            "isbn_13",
            "author_name",
            "publisher_name",
            "created_on",
            "updated_on",
        ]

    @staticmethod
    def _parse_author_names(value):
        if not value:
            return []
        return [item.strip() for item in str(value).split(",") if item and item.strip()]

    @staticmethod
    def _is_book_category(category):
        category_name = str(getattr(category, "name", "") or "").strip().lower()
        return "book" in category_name

    @staticmethod
    def _is_soap_category(category):
        category_name = str(getattr(category, "name", "") or "").strip().lower()
        return "soap" in category_name

    @staticmethod
    def _copy_product_fields_to_book(product, book):
        for field in Product._meta.concrete_fields:
            if field.primary_key:
                continue
            setattr(book, field.attname, getattr(product, field.attname))

    @staticmethod
    def _copy_product_fields_to_soap(product, soap):
        for field in Product._meta.concrete_fields:
            if field.primary_key:
                continue
            setattr(soap, field.attname, getattr(product, field.attname))

    def _extract_book_payload(self, validated_data):
        input_to_target = {
            "isbn_10_input": "isbn_10",
            "isbn_13_input": "isbn_13",
            "author_name_input": "author_name",
            "publisher_name_input": "publisher_name",
            "book_language_input": "book_language",
            "book_edition_input": "book_edition",
            "cover_type_input": "cover_type",
            "page_count_input": "page_count",
            "published_year_input": "published_year",
            "quality": "quality",
            "quality_note": "quality_note",
        }
        payload = {}
        for input_field, target_field in input_to_target.items():
            if input_field in validated_data:
                payload[target_field] = validated_data.pop(input_field)
        return payload

    def _extract_soap_payload(self, validated_data):
        input_to_target = {
            "soap_brand_input": "brand",
            "soap_fragrance_input": "fragrance",
            "soap_net_weight_grams_input": "net_weight_grams",
            "soap_skin_type_input": "skin_type",
            "soap_shelf_life_months_input": "shelf_life_months",
        }
        payload = {}
        for input_field, target_field in input_to_target.items():
            if input_field in validated_data:
                payload[target_field] = validated_data.pop(input_field)
        return payload

    def _upsert_book_metadata(self, product, book_payload):
        if not book_payload and not self._is_book_category(product.category):
            return

        try:
            book = product.book
            creating = False
        except Book.DoesNotExist:
            creating = True
            book = Book(pk=product.pk)
            self._copy_product_fields_to_book(product, book)
            book.isbn_10 = str(book_payload.get("isbn_10") or "")
            book.isbn_13 = str(book_payload.get("isbn_13") or "")
            book.quality = str(book_payload.get("quality") or "")
            book.quality_note = str(book_payload.get("quality_note") or "")
            book.book_language = str(book_payload.get("book_language") or "")
            book.book_edition = str(book_payload.get("book_edition") or "")
            book.cover_type = str(book_payload.get("cover_type") or "")
            book.page_count = int(book_payload.get("page_count") or 0)
            book.published_year = int(book_payload["published_year"]) if book_payload.get("published_year") else None
            book.save(force_insert=True)

        if not creating:
            update_fields = []
            for field_name in ("isbn_10", "isbn_13", "quality", "quality_note", "book_language", "book_edition", "cover_type"):
                if field_name in book_payload:
                    setattr(book, field_name, str(book_payload.get(field_name) or ""))
                    update_fields.append(field_name)

            if "page_count" in book_payload:
                book.page_count = int(book_payload.get("page_count") or 0)
                update_fields.append("page_count")

            if "published_year" in book_payload:
                book.published_year = int(book_payload["published_year"]) if book_payload.get("published_year") else None
                update_fields.append("published_year")

            if update_fields:
                book.save(update_fields=list(dict.fromkeys(update_fields)))

        if "publisher_name" in book_payload:
            publisher_name = str(book_payload.get("publisher_name") or "").strip()
            if publisher_name:
                publisher, _ = Publisher.objects.get_or_create(
                    name=publisher_name,
                    defaults={"description": ""},
                )
                book.publisher = publisher
            else:
                book.publisher = None
            book.save(update_fields=["publisher"])

        if "author_name" in book_payload:
            names = self._parse_author_names(book_payload.get("author_name"))
            if names:
                authors = []
                for name in names:
                    author, _ = Author.objects.get_or_create(name=name)
                    authors.append(author)
                book.authors.set(authors)
            else:
                book.authors.clear()

    def _upsert_soap_metadata(self, product, soap_payload):
        if not soap_payload and not self._is_soap_category(product.category):
            return

        try:
            soap = product.soap
            creating = False
        except Soap.DoesNotExist:
            creating = True
            soap = Soap(pk=product.pk)
            self._copy_product_fields_to_soap(product, soap)
            soap.brand = str(soap_payload.get("brand") or "")
            soap.fragrance = str(soap_payload.get("fragrance") or "")
            soap.net_weight_grams = int(soap_payload.get("net_weight_grams") or 0)
            soap.skin_type = str(soap_payload.get("skin_type") or "")
            soap.shelf_life_months = int(soap_payload.get("shelf_life_months") or 0)
            soap.save(force_insert=True)

        if not creating:
            update_fields = []
            for field_name in ("brand", "fragrance", "skin_type"):
                if field_name in soap_payload:
                    setattr(soap, field_name, str(soap_payload.get(field_name) or ""))
                    update_fields.append(field_name)
            for field_name in ("net_weight_grams", "shelf_life_months"):
                if field_name in soap_payload:
                    setattr(soap, field_name, int(soap_payload.get(field_name) or 0))
                    update_fields.append(field_name)
            if update_fields:
                soap.save(update_fields=list(dict.fromkeys(update_fields)))

    def _resolve_category(self, validated_data):
        category_uuid = validated_data.pop("category_uuid", None)

        if category_uuid is None:
            if self.instance is None:
                raise serializers.ValidationError({"category_uuid": ["This field is required."]})
            return

        category = Category.objects.filter(uuid=category_uuid, is_archived=False).first()
        if not category:
            raise serializers.ValidationError({"category_uuid": ["Category not found."]})
        validated_data["category"] = category

    def _get_category_for_quality(self, validated_data):
        category = validated_data.get("category")
        if category:
            return category

        category_uuid = validated_data.get("category_uuid")
        if category_uuid:
            return Category.objects.filter(uuid=category_uuid, is_archived=False).first()
        return getattr(self.instance, "category", None)

    def _is_book_product(self, validated_data):
        return Product.is_book_category(self._get_category_for_quality(validated_data))

    def validate(self, attrs):
        attrs = super().validate(attrs)
        is_book_product = self._is_book_product(attrs)
        if not is_book_product:
            attrs.pop("quality", None)
            attrs.pop("quality_note", None)
            return attrs

        allowed_quality_values = {value for value, _ in BOOK_QUALITY_CHOICES}
        quality = str(attrs.get("quality") or "").strip()
        if not quality:
            attrs["quality"] = "USED_LOOKS_GOOD"
        elif quality not in allowed_quality_values:
            raise serializers.ValidationError(
                {"quality": [f"Select a valid book quality: {', '.join(sorted(allowed_quality_values))}."]}
            )
        return attrs

    def _normalize_create_defaults(self, validated_data):
        if not validated_data.get("sku"):
            generated = str(generate_uuid7()).replace("-", "")[:12].upper()
            validated_data["sku"] = f"PFS-{generated}"

        if "min_retail_price" not in validated_data:
            validated_data["min_retail_price"] = Decimal("0.00")

        if "max_retail_price" not in validated_data:
            validated_data["max_retail_price"] = validated_data["min_retail_price"]

        if "sale_price" not in validated_data:
            validated_data["sale_price"] = validated_data["min_retail_price"]

        if "stock_quantity" not in validated_data:
            validated_data["stock_quantity"] = 1

    def get_product_type(self, obj):
        if Product.is_book_category(getattr(obj, "category", None)):
            return "BOOK"
        if "soap" in str(getattr(getattr(obj, "category", None), "name", "") or "").strip().lower():
            return "SOAP"
        return "PRODUCT"

    def get_quality(self, obj):
        book = _get_related_book(obj)
        return str(getattr(book, "quality", "") or "") if book else ""

    def get_quality_note(self, obj):
        book = _get_related_book(obj)
        return str(getattr(book, "quality_note", "") or "") if book else ""

    def get_quality_label(self, obj):
        book = _get_related_book(obj)
        if not book:
            return ""
        return dict(BOOK_QUALITY_CHOICES).get(str(getattr(book, "quality", "") or ""), "")

    def get_quality_choices(self, obj):
        book = _get_related_book(obj)
        if not book:
            return []
        return [{"id": value, "name": label} for value, label in BOOK_QUALITY_CHOICES]

    def get_tag_details(self, obj):
        return [{"name": tag.name, "slug": tag.slug} for tag in obj.tags.all().order_by("name")]

    def get_isbn_10(self, obj):
        book = _get_related_book(obj)
        return getattr(book, "isbn_10", "") if book else ""

    def get_isbn_13(self, obj):
        book = _get_related_book(obj)
        return getattr(book, "isbn_13", "") if book else ""

    def get_author_name(self, obj):
        book = _get_related_book(obj)
        if not book:
            return ""
        names = book.authors.values_list("name", flat=True)
        return ", ".join(names)

    def get_publisher_name(self, obj):
        book = _get_related_book(obj)
        if not book or not book.publisher:
            return ""
        return book.publisher.name

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["category_uuid"] = str(instance.category.uuid) if instance.category_id else None
        book = Book.objects.filter(pk=instance.pk).select_related("publisher").prefetch_related("authors").first()
        if book:
            data["quality"] = book.quality or ""
            data["quality_note"] = book.quality_note or ""
            data["quality_label"] = dict(BOOK_QUALITY_CHOICES).get(str(book.quality or ""), "")
            data["quality_choices"] = [{"id": value, "name": label} for value, label in BOOK_QUALITY_CHOICES]
            data["isbn_10_input"] = book.isbn_10 or ""
            data["isbn_13_input"] = book.isbn_13 or ""
            data["author_name_input"] = ", ".join(book.authors.values_list("name", flat=True))
            data["publisher_name_input"] = book.publisher.name if book.publisher else ""
            data["book_language_input"] = book.book_language or ""
            data["book_edition_input"] = book.book_edition or ""
            data["cover_type_input"] = book.cover_type or ""
            data["page_count_input"] = book.page_count or 0
            data["published_year_input"] = book.published_year or 0
        else:
            data["quality"] = ""
            data["quality_note"] = ""
            data["quality_label"] = ""
            data["quality_choices"] = []
            data["isbn_10_input"] = ""
            data["isbn_13_input"] = ""
            data["author_name_input"] = ""
            data["publisher_name_input"] = ""
            data["book_language_input"] = ""
            data["book_edition_input"] = ""
            data["cover_type_input"] = ""
            data["page_count_input"] = 0
            data["published_year_input"] = 0
        try:
            soap = instance.soap
        except Soap.DoesNotExist:
            soap = None
        if soap:
            data["soap_brand_input"] = soap.brand or ""
            data["soap_fragrance_input"] = soap.fragrance or ""
            data["soap_net_weight_grams_input"] = soap.net_weight_grams or 0
            data["soap_skin_type_input"] = soap.skin_type or ""
            data["soap_shelf_life_months_input"] = soap.shelf_life_months or 0
        else:
            data["soap_brand_input"] = ""
            data["soap_fragrance_input"] = ""
            data["soap_net_weight_grams_input"] = 0
            data["soap_skin_type_input"] = ""
            data["soap_shelf_life_months_input"] = 0
        return data

    def create(self, validated_data):
        tags = validated_data.pop("tags", [])
        book_payload = self._extract_book_payload(validated_data)
        soap_payload = self._extract_soap_payload(validated_data)
        self._resolve_category(validated_data)
        self._normalize_create_defaults(validated_data)

        product = Product.objects.create(**validated_data)
        if tags:
            product.tags.set(tags)
        self._upsert_book_metadata(product, book_payload)
        self._upsert_soap_metadata(product, soap_payload)
        return product

    def update(self, instance, validated_data):
        tags = validated_data.pop("tags", None)
        book_payload = self._extract_book_payload(validated_data)
        soap_payload = self._extract_soap_payload(validated_data)
        self._resolve_category(validated_data)

        instance = super().update(instance, validated_data)
        if tags is not None:
            instance.tags.set(tags)
        self._upsert_book_metadata(instance, book_payload)
        self._upsert_soap_metadata(instance, soap_payload)
        return instance


class AdminInventorySerializer(MyInventorySerializer):
    seller_uuid = serializers.SlugRelatedField(
        source="seller",
        slug_field="uuid",
        queryset=User.objects.filter(is_archived=False),
    )
    seller_email = serializers.SerializerMethodField()

    class Meta(MyInventorySerializer.Meta):
        fields = [*MyInventorySerializer.Meta.fields, "seller_email"]
        read_only_fields = [
            item for item in MyInventorySerializer.Meta.read_only_fields if item != "seller_uuid"
        ] + ["seller_email"]

    def get_seller_email(self, obj):
        return getattr(obj.seller, "email", "") if obj.seller_id else ""


class CheckoutItemInputSerializer(serializers.Serializer):
    product_uuid = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=1)


class OrderItemSerializer(serializers.ModelSerializer):
    product_uuid = serializers.UUIDField(source="product.uuid", read_only=True)
    product_image_url = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = [
            "uuid",
            "product_uuid",
            "product_name",
            "product_image_url",
            "sku",
            "quantity",
            "unit_price",
            "line_total",
        ]

    def get_product_image_url(self, obj):
        product = getattr(obj, "product", None)
        if not product:
            return ""
        content_type = ContentType.objects.get_for_model(product.__class__)
        attachment = (
            PhotoAttachment.objects.filter(
                content_type=content_type,
                object_id=product.id,
                is_archived=False,
            )
            .select_related("photo")
            .order_by("-is_primary", "sort_order", "-created_on")
            .first()
        )
        if attachment and attachment.photo:
            return attachment.photo.effective_url
        return ""


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    shipping_address_uuid = serializers.UUIDField(source="shipping_address.uuid", read_only=True)
    billing_address_uuid = serializers.UUIDField(source="billing_address.uuid", read_only=True)
    placed_by = serializers.SerializerMethodField()
    seller_names = serializers.SerializerMethodField()
    seller_addresses = serializers.SerializerMethodField()
    delivery_address = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "uuid",
            "status",
            "payment_status",
            "placed_by",
            "seller_names",
            "seller_addresses",
            "delivery_address",
            "subtotal",
            "shipping_charge",
            "tax_amount",
            "discount_amount",
            "total_payable",
            "currency",
            "shipping_address_uuid",
            "billing_address_uuid",
            "placed_on",
            "created_on",
            "items",
        ]

    def get_placed_by(self, obj):
        user = getattr(obj, "customer", None)
        if not user:
            return ""
        return user.full_name or user.username or user.email or ""

    def _format_address(self, address):
        if not address:
            return ""
        parts = [
            address.address_name,
            address.full_name,
            address.building_name,
            address.company_name,
            address.area_sector,
            address.landmark,
            address.town_city,
            address.state_region,
            address.pincode,
        ]
        return ", ".join([part for part in parts if part])

    def get_delivery_address(self, obj):
        return self._format_address(getattr(obj, "shipping_address", None))

    def get_seller_names(self, obj):
        seller_ids = list(
            obj.items.values_list("seller_id", flat=True).exclude(seller_id__isnull=True).distinct()
        )
        if not seller_ids:
            return ""
        sellers = User.objects.filter(id__in=seller_ids)
        names = [user.full_name or user.username or user.email for user in sellers]
        return ", ".join([name for name in names if name])

    def get_seller_addresses(self, obj):
        seller_ids = list(
            obj.items.values_list("seller_id", flat=True).exclude(seller_id__isnull=True).distinct()
        )
        if not seller_ids:
            return ""
        addresses = (
            Address.objects.filter(user_id__in=seller_ids, is_archived=False)
            .order_by("-default_shipping_address", "-updated_on")
        )
        address_map = {}
        for address in addresses:
            if address.user_id not in address_map:
                address_map[address.user_id] = self._format_address(address)
        formatted = [value for value in address_map.values() if value]
        return "; ".join(formatted)


class CartProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            "uuid",
            "name",
            "sku",
            "sale_price",
            "stock_quantity",
            "is_active",
            "is_archived",
        ]


class CartItemSerializer(serializers.ModelSerializer):
    product = CartProductSerializer(read_only=True)
    unit_price = serializers.SerializerMethodField()
    item_total = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = [
            "uuid",
            "product",
            "quantity",
            "unit_price",
            "item_total",
            "is_active",
            "is_archived",
            "created_on",
            "updated_on",
        ]

    def get_unit_price(self, obj):
        return obj.unit_price

    def get_item_total(self, obj):
        return obj.item_total


class CartSerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()
    total_items = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()
    grand_total = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = [
            "uuid",
            "is_active",
            "is_archived",
            "created_on",
            "updated_on",
            "items",
            "total_items",
            "subtotal",
            "grand_total",
        ]

    def get_items(self, obj):
        items = obj.items.filter(is_archived=False).select_related("product")
        return CartItemSerializer(items, many=True).data

    def get_total_items(self, obj):
        return obj.total_items

    def get_subtotal(self, obj):
        return obj.subtotal

    def get_grand_total(self, obj):
        return obj.subtotal


class CartAddItemSerializer(serializers.Serializer):
    product_uuid = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=1, default=1)


class CartUpdateItemSerializer(serializers.Serializer):
    item_uuid = serializers.UUIDField(required=False)
    product_uuid = serializers.UUIDField(required=False)
    quantity = serializers.IntegerField(min_value=1)

    def validate(self, attrs):
        if not attrs.get("item_uuid") and not attrs.get("product_uuid"):
            raise serializers.ValidationError("item_uuid or product_uuid is required.")
        return attrs


class CartRemoveItemSerializer(serializers.Serializer):
    item_uuid = serializers.UUIDField(required=False)
    product_uuid = serializers.UUIDField(required=False)

    def validate(self, attrs):
        if not attrs.get("item_uuid") and not attrs.get("product_uuid"):
            raise serializers.ValidationError("item_uuid or product_uuid is required.")
        return attrs


class CartMergeSerializer(serializers.Serializer):
    guest_token = serializers.CharField()


class CartItemQuantitySerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1)


class CheckoutPreviewSerializer(serializers.Serializer):
    address_uuid = serializers.UUIDField(required=False)
    coupon_code = serializers.CharField(required=False, allow_blank=True)
    items = CheckoutItemInputSerializer(many=True, required=False)


class CheckoutInitiateSerializer(serializers.Serializer):
    address_uuid = serializers.UUIDField(required=False)
    coupon_code = serializers.CharField(required=False, allow_blank=True)
    gateway = serializers.CharField(required=False, default="razorpay")
    items = CheckoutItemInputSerializer(many=True, required=False)


class PaymentVerifySerializer(serializers.Serializer):
    order_uuid = serializers.UUIDField()
    gateway = serializers.CharField(required=False, default="razorpay")
    razorpay_order_id = serializers.CharField(required=False, allow_blank=True)
    razorpay_payment_id = serializers.CharField(required=False, allow_blank=True)
    signature = serializers.CharField(required=False, allow_blank=True)


class PaymentInitiateSerializer(serializers.Serializer):
    order_uuid = serializers.UUIDField()
    gateway = serializers.CharField(required=False, default="razorpay")


class RefundRequestSerializer(serializers.Serializer):
    payment_uuid = serializers.UUIDField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)

class CheckoutSerializer(serializers.Serializer):
    shipping_address_uuid = serializers.UUIDField()
    billing_address_uuid = serializers.UUIDField(required=False)
    same_as_shipping = serializers.BooleanField(default=True)
    shipping_charge = serializers.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    tax_amount = serializers.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    discount_amount = serializers.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    notes = serializers.CharField(required=False, allow_blank=True)
    items = CheckoutItemInputSerializer(many=True)

    def validate(self, attrs):
        user = self.context["request"].user

        shipping_address = Address.objects.filter(uuid=attrs["shipping_address_uuid"], user=user, is_archived=False).first()
        if not shipping_address:
            raise serializers.ValidationError("Shipping address not found")

        billing_address = shipping_address
        if not attrs.get("same_as_shipping", True):
            billing_uuid = attrs.get("billing_address_uuid")
            if not billing_uuid:
                raise serializers.ValidationError("billing_address_uuid is required when same_as_shipping=false")
            billing_address = Address.objects.filter(uuid=billing_uuid, user=user, is_archived=False).first()
            if not billing_address:
                raise serializers.ValidationError("Billing address not found")

        if not attrs["items"]:
            raise serializers.ValidationError("At least one item is required")

        resolved_products = []
        subtotal = Decimal("0.00")

        for item in attrs["items"]:
            product = Product.objects.filter(uuid=item["product_uuid"], is_active=True, is_archived=False).first()
            if not product:
                raise serializers.ValidationError(f"Product not found: {item['product_uuid']}")
            if item["quantity"] > product.stock_quantity:
                raise serializers.ValidationError(f"Insufficient stock for {product.name}")

            unit_price = product.sale_price
            line_total = unit_price * item["quantity"]
            subtotal += line_total
            resolved_products.append((product, item["quantity"], unit_price, line_total))

        attrs["_shipping_address"] = shipping_address
        attrs["_billing_address"] = billing_address
        attrs["_resolved_products"] = resolved_products
        attrs["_subtotal"] = subtotal
        return attrs

    def create(self, validated_data):
        user = self.context["request"].user
        subtotal = validated_data["_subtotal"]
        shipping_charge = validated_data.get("shipping_charge") or Decimal("0.00")
        tax_amount = validated_data.get("tax_amount") or Decimal("0.00")
        discount_amount = validated_data.get("discount_amount") or Decimal("0.00")

        total_payable = subtotal + shipping_charge + tax_amount - discount_amount

        order = Order.objects.create(
            customer=user,
            shipping_address=validated_data["_shipping_address"],
            billing_address=validated_data["_billing_address"],
            subtotal=subtotal,
            shipping_charge=shipping_charge,
            tax_amount=tax_amount,
            discount_amount=discount_amount,
            total_payable=total_payable,
            notes=validated_data.get("notes", ""),
            status="PENDING_PAYMENT",
            payment_status="PENDING",
            placed_on=timezone.now(),
        )

        for product, quantity, unit_price, line_total in validated_data["_resolved_products"]:
            OrderItem.objects.create(
                order=order,
                product=product,
                seller=product.seller,
                product_name=product.name,
                sku=product.sku,
                quantity=quantity,
                unit_price=unit_price,
                line_total=line_total,
            )

        return order


class PaymentStatusUpdateSerializer(serializers.Serializer):
    payment_status = serializers.ChoiceField(choices=Order.PAYMENT_STATUS_CHOICES)

    def update(self, instance, validated_data):
        payment_status = validated_data["payment_status"]
        instance.payment_status = payment_status

        if payment_status == "PAID":
            instance.status = "PAID"
        elif payment_status == "FAILED":
            instance.status = "PAYMENT_FAILED"
        elif payment_status == "REFUNDED":
            instance.status = "REFUNDED"

        instance.save(update_fields=["payment_status", "status", "updated_on"])
        return instance
