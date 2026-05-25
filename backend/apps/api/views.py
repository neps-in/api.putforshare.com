import hashlib
import hmac
import os
import re
from pathlib import Path
from decimal import Decimal

from django.conf import settings
from django.contrib.auth import login
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from django.core.paginator import Paginator
from django.db import transaction
from django.db.models import Count, F, Min, Q, Sum, Value
from django.db.models.functions import Coalesce
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from rest_framework import generics, mixins, serializers as drf_serializers, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.response import Response
from rest_framework.views import APIView
from taggit.models import Tag

from apps.cart.models import Cart, CartItem
from apps.users.services import InvalidTokenError, VerificationService
from apps.inventory.models import Author, Category, MerchantFeedDebounceEntry, MerchantFeedSyncLog, Product, Publisher
from apps.inventory.services.merchant_feed import write_google_merchant_feed_file
from apps.inventory.tasks import run_merchant_feed_sync_task
from apps.logistics.models import Package, PickupRequest
from apps.orders.models import Order, OrderItem
from apps.payments.models import Coupon, CouponUsage, Payment, PaymentGateway, Refund
from apps.payments.providers import PaymentProviderError, get_payment_provider
from apps.users.models import Address, User

from apps.inventory.services.isbnapi.cache import invalidate_book as invalidate_isbn_cache
from apps.inventory.services.isbnapi.isbn import InvalidISBN, normalize as normalize_isbn
from apps.inventory.services.isbnapi.service import get_book_metadata_sync
from .pagination import StandardResultsPagination
from .permissions import IsAdminRole, IsSellerOrAdmin
from .serializers import (
    AddressSerializer,
    AdminAddressSerializer,
    AuthorSerializer,
    AuthorWithProductCountSerializer,
    CategorySerializer,
    CategoryWithProductCountSerializer,
    ChangePasswordSerializer,
    CheckoutSerializer,
    CheckoutInitiateSerializer,
    CheckoutPreviewSerializer,
    CartAddItemSerializer,
    CartItemSerializer,
    CartItemQuantitySerializer,
    CartMergeSerializer,
    CartRemoveItemSerializer,
    CartSerializer,
    CartUpdateItemSerializer,
    EmailVerificationConfirmSerializer,
    EmailVerificationResendSerializer,
    LoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    MyInventorySerializer,
    AdminInventorySerializer,
    OrderSerializer,
    PaymentStatusUpdateSerializer,
    ProfileEditSerializer,
    ProductDetailSerializer,
    ProductSerializer,
    PublisherSerializer,
    PublisherWithProductCountSerializer,
    SellerWithProductCountSerializer,
    SignupSerializer,
    TagWithProductCountSerializer,
    PaymentVerifySerializer,
    PaymentInitiateSerializer,
    RefundRequestSerializer,
    UserSerializer,
    AdminUserSerializer,
)

from apps.logistics.serializers import (
    PackageSerializer,
    PickupRequestSerializer,
    AdminPackageSerializer,
    AdminPickupRequestSerializer,
)


def get_product_queryset():
    return (
        Product.objects.select_related("seller", "category", "book", "soap")
        .prefetch_related("tags")
        .filter(is_archived=False)
    )


def get_category_count_queryset():
    return (
        Category.objects.filter(is_archived=False)
        .annotate(product_count=Count("products", filter=Q(products__is_archived=False), distinct=True))
        .order_by("name")
    )


def get_tag_count_queryset():
    return Tag.objects.annotate(
        product_count=Count("product", filter=Q(product__is_archived=False), distinct=True)
    ).order_by("name")


def get_author_count_queryset():
    return (
        Author.objects.filter(is_archived=False)
        .annotate(product_count=Count("books", filter=Q(books__is_archived=False), distinct=True))
        .order_by("name")
    )


def get_publisher_count_queryset():
    return (
        Publisher.objects.filter(is_archived=False)
        .annotate(product_count=Count("books", filter=Q(books__is_archived=False), distinct=True))
        .order_by("name")
    )


def get_seller_count_queryset():
    return (
        User.objects.filter(is_archived=False, is_active=True, pfs_role="SELLER")
        .annotate(
            product_count=Count(
                "products",
                filter=Q(products__is_archived=False, products__is_active=True),
                distinct=True,
            )
        )
        .filter(product_count__gt=0)
        .order_by("full_name", "username", "email")
    )


def apply_date_filters(queryset, request, field_name="created_on", param_prefix="created"):
    range_key = (request.query_params.get(f"{param_prefix}_range") or "").strip().lower()
    from_raw = request.query_params.get(f"{param_prefix}_from")
    to_raw = request.query_params.get(f"{param_prefix}_to")

    now = timezone.now()
    if range_key in {"today", "week", "month"}:
        if range_key == "today":
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif range_key == "week":
            start = now - timezone.timedelta(days=7)
        else:
            start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        return queryset.filter(**{f"{field_name}__gte": start, f"{field_name}__lte": now})

    if from_raw:
        parsed = parse_datetime(from_raw) or parse_date(from_raw)
        if parsed:
            if isinstance(parsed, timezone.datetime):
                start = parsed
            else:
                start = timezone.make_aware(timezone.datetime.combine(parsed, timezone.datetime.min.time()))
            queryset = queryset.filter(**{f"{field_name}__gte": start})

    if to_raw:
        parsed = parse_datetime(to_raw) or parse_date(to_raw)
        if parsed:
            if isinstance(parsed, timezone.datetime):
                end = parsed
            else:
                end = timezone.make_aware(timezone.datetime.combine(parsed, timezone.datetime.max.time()))
            queryset = queryset.filter(**{f"{field_name}__lte": end})

    return queryset


def _get_guest_token(request):
    token = request.headers.get("X-Guest-Token")
    if not token:
        token = request.query_params.get("guest_token")
    if not token and hasattr(request, "data"):
        token = request.data.get("guest_token")
    token = (token or "").strip()
    return token or None


def _resolve_cart_owner(request):
    if request.user and request.user.is_authenticated:
        return {"user": request.user, "guest_token": None}
    guest_token = _get_guest_token(request)
    if not guest_token:
        raise drf_serializers.ValidationError("guest_token is required for guest carts.")
    return {"user": None, "guest_token": guest_token}


def _get_active_cart(*, user=None, guest_token=None, create=False):
    filters = {"is_active": True, "is_archived": False}
    if user is not None:
        filters["user"] = user
    else:
        filters["guest_token"] = guest_token
    cart = Cart.objects.filter(**filters).first()
    if not cart and create:
        cart = Cart.objects.create(user=user, guest_token=guest_token)
    return cart


def _assert_cart_editable(cart):
    if cart.is_archived or not cart.is_active:
        raise drf_serializers.ValidationError("This cart is archived and cannot be modified.")


def _get_cart_item(cart, *, item_uuid=None, product_uuid=None):
    queryset = cart.items.filter(is_archived=False).select_related("product")
    if item_uuid:
        return queryset.filter(uuid=item_uuid).first()
    if product_uuid:
        return queryset.filter(product__uuid=product_uuid).first()
    return None


def _resolve_shipping_address(user, address_uuid=None):
    if address_uuid:
        address = Address.objects.filter(uuid=address_uuid, user=user, is_archived=False).first()
        if not address:
            raise drf_serializers.ValidationError("Shipping address not found.")
        return address

    address = Address.objects.filter(user=user, is_archived=False, default_shipping_address=True).first()
    if not address:
        address = Address.objects.filter(user=user, is_archived=False).first()
    if not address:
        raise drf_serializers.ValidationError("No address available for this user.")
    return address


def _calculate_cart_totals(cart_items):
    subtotal = Decimal("0.00")
    resolved_items = []
    for item in cart_items:
        product = item.product
        if not product.is_active or product.is_archived:
            raise drf_serializers.ValidationError(f"Product not available: {product.uuid}")
        if item.quantity > product.stock_quantity:
            raise drf_serializers.ValidationError(f"Insufficient stock for {product.name}")
        unit_price = product.sale_price
        line_total = unit_price * item.quantity
        subtotal += line_total
        resolved_items.append((item, product, unit_price, line_total))
    return subtotal, resolved_items


def _calculate_items_totals(items_payload):
    subtotal = Decimal("0.00")
    resolved_items = []
    for item in items_payload:
        product = Product.objects.filter(uuid=item["product_uuid"], is_active=True, is_archived=False).first()
        if not product:
            raise drf_serializers.ValidationError(f"Product not found: {item['product_uuid']}")
        if item["quantity"] > product.stock_quantity:
            raise drf_serializers.ValidationError(f"Insufficient stock for {product.name}")
        unit_price = product.sale_price
        line_total = unit_price * item["quantity"]
        subtotal += line_total
        resolved_items.append((item, product, unit_price, line_total))
    return subtotal, resolved_items


def _apply_coupon(code, *, user, subtotal):
    if not code:
        return None, Decimal("0.00")
    coupon = Coupon.objects.filter(code__iexact=code.strip(), is_active=True, is_archived=False).first()
    if not coupon:
        raise drf_serializers.ValidationError("Invalid coupon code.")

    today = timezone.now().date()
    if coupon.valid_from and today < coupon.valid_from:
        raise drf_serializers.ValidationError("Coupon is not active yet.")
    if coupon.valid_to and today > coupon.valid_to:
        raise drf_serializers.ValidationError("Coupon has expired.")
    if subtotal < coupon.min_amount:
        raise drf_serializers.ValidationError("Cart total does not meet coupon minimum amount.")
    if coupon.max_usage is not None:
        usage_count = coupon.usages.count()
        if usage_count >= coupon.max_usage:
            raise drf_serializers.ValidationError("Coupon usage limit reached.")

    if coupon.type == "PERCENT":
        discount = (subtotal * coupon.value) / Decimal("100.00")
    else:
        discount = coupon.value

    if discount > subtotal:
        discount = subtotal
    return coupon, discount


class SignupAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                "detail": "Account created. Check your email to verify your account before logging in.",
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        token, _ = Token.objects.get_or_create(user=user)
        login(request, user)
        return Response({"token": token.key, "user": UserSerializer(user).data})


class ChangePasswordAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Password updated successfully."})


class RequestPasswordResetAPIView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "password_reset_request"

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        VerificationService.send_password_reset(serializer.validated_data["email"])
        return Response({"detail": "If that email exists, a reset link was sent."})


class ConfirmPasswordResetAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            VerificationService.reset_password(
                serializer.validated_data["token"],
                serializer.validated_data["password"],
            )
        except InvalidTokenError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"detail": "Password updated."})


class VerifyEmailAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        return self._verify(token)

    def post(self, request):
        serializer = EmailVerificationConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return self._verify(serializer.validated_data["token"])

    @staticmethod
    def _verify(raw_token):
        try:
            VerificationService.verify_email(raw_token)
        except InvalidTokenError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"detail": "Email verified."})


class ResendEmailVerificationAPIView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "verify_email_resend"

    def post(self, request):
        serializer = EmailVerificationResendSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        VerificationService.resend_email_verification(serializer.validated_data["email"])
        return Response({"detail": "If a pending verification exists for that email, a new link was sent."})


class LogoutAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if hasattr(request.user, "auth_token"):
            request.user.auth_token.delete()
        return Response({"detail": "Logged out successfully."})


class MeAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"user": UserSerializer(request.user).data})

    def patch(self, request):
        serializer = ProfileEditSerializer(instance=request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"user": UserSerializer(request.user).data})


class UserProfileAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, uuid):
        return get_object_or_404(User.objects.filter(is_archived=False), uuid=uuid)

    def _check_access(self, request, target_user):
        return request.user.pfs_role == "ADMIN" or request.user.pk == target_user.pk

    def get(self, request, uuid):
        target_user = self.get_object(uuid)
        if not self._check_access(request, target_user):
            return Response({"detail": "You do not have permission to access this profile."}, status=status.HTTP_403_FORBIDDEN)
        return Response({"user": UserSerializer(target_user).data})

    def patch(self, request, uuid):
        target_user = self.get_object(uuid)
        if not self._check_access(request, target_user):
            return Response({"detail": "You do not have permission to edit this profile."}, status=status.HTTP_403_FORBIDDEN)
        serializer = ProfileEditSerializer(instance=target_user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"user": UserSerializer(target_user).data})


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.filter(is_archived=False)
    serializer_class = UserSerializer
    lookup_field = "uuid"


class AdminUserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.filter(is_archived=False)
    serializer_class = AdminUserSerializer
    lookup_field = "uuid"
    permission_classes = [IsAuthenticated, IsAdminRole]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["email", "username", "full_name", "mobile"]
    ordering_fields = ["email", "username", "full_name", "created_on", "updated_on", "pfs_role", "plan", "is_active", "is_staff"]
    ordering = ["-updated_on"]

    def get_queryset(self):
        queryset = apply_date_filters(super().get_queryset(), self.request, "created_on")
        role = self.request.query_params.get("pfs_role")
        if role:
            queryset = queryset.filter(pfs_role=role)
        is_active_param = self.request.query_params.get("is_active")
        if is_active_param is not None:
            normalized = str(is_active_param).strip().lower()
            if normalized in {"1", "true", "yes", "on"}:
                queryset = queryset.filter(is_active=True)
            elif normalized in {"0", "false", "no", "off"}:
                queryset = queryset.filter(is_active=False)
        is_staff_param = self.request.query_params.get("is_staff")
        if is_staff_param is not None:
            normalized = str(is_staff_param).strip().lower()
            if normalized in {"1", "true", "yes", "on"}:
                queryset = queryset.filter(is_staff=True)
            elif normalized in {"0", "false", "no", "off"}:
                queryset = queryset.filter(is_staff=False)
        return queryset


class AdminAddressViewSet(viewsets.ModelViewSet):
    queryset = Address.objects.filter(is_archived=False)
    serializer_class = AdminAddressSerializer
    lookup_field = "uuid"
    permission_classes = [IsAuthenticated, IsAdminRole]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["address_name", "full_name", "mobile_num", "town_city", "state_region", "pincode"]
    ordering_fields = ["address_name", "town_city", "state_region", "created_on", "updated_on", "is_active"]
    ordering = ["-updated_on"]


class AdminInventoryViewSet(viewsets.ModelViewSet):
    serializer_class = AdminInventorySerializer
    lookup_field = "uuid"
    permission_classes = [IsAuthenticated, IsAdminRole]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = [
        "name",
        "sku",
        "book__isbn_10",
        "book__isbn_13",
        "book__authors__name",
        "book__publisher__name",
    ]
    ordering_fields = [
        "name",
        "isbn_10",
        "isbn_13",
        "author_name",
        "publisher_name",
        "min_retail_price",
        "stock_quantity",
        "created_on",
        "updated_on",
    ]
    ordering = ["-updated_on"]

    def get_queryset(self):
        queryset = (
            get_product_queryset()
            .annotate(
                isbn_10=Coalesce(F("book__isbn_10"), Value("")),
                isbn_13=Coalesce(F("book__isbn_13"), Value("")),
                author_name=Coalesce(Min("book__authors__name"), Value("")),
                publisher_name=Coalesce(F("book__publisher__name"), Value("")),
            )
            .distinct()
        )
        return apply_date_filters(queryset, self.request, "created_on")


class AdminPackageViewSet(viewsets.ModelViewSet):
    queryset = Package.objects.filter(is_archived=False)
    serializer_class = AdminPackageSerializer
    lookup_field = "uuid"
    permission_classes = [IsAuthenticated, IsAdminRole]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["package_name", "package_description", "awb_number", "package_category", "hsn_code"]
    ordering_fields = ["package_name", "awb_number", "weight_per_package", "created_on", "updated_on"]
    ordering = ["-updated_on"]


class AdminPickupRequestViewSet(viewsets.ModelViewSet):
    queryset = PickupRequest.objects.filter(is_archived=False)
    serializer_class = AdminPickupRequestSerializer
    lookup_field = "uuid"
    permission_classes = [IsAuthenticated, IsAdminRole]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["shipper_pkreqid", "pickup_status", "pickup_mode"]
    ordering_fields = ["pickup_scheduled_date", "pickup_status", "created_on", "updated_on"]
    ordering = ["-updated_on"]

    def get_queryset(self):
        queryset = super().get_queryset()
        queryset = apply_date_filters(queryset, self.request, "created_on")
        return apply_date_filters(queryset, self.request, "pickup_scheduled_date", "scheduled")


class AdminOrderListAPIView(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]
    pagination_class = StandardResultsPagination
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["uuid", "customer__email", "customer__full_name", "customer__username"]
    ordering_fields = ["created_on", "placed_on", "total_payable", "status", "payment_status"]
    ordering = ["-created_on"]

    def get_queryset(self):
        queryset = (
            Order.objects.filter(is_archived=False)
            .select_related("customer", "shipping_address", "billing_address")
            .prefetch_related("items", "items__seller")
        )
        queryset = apply_date_filters(queryset, self.request, "created_on")
        status = self.request.query_params.get("status")
        if status:
            queryset = queryset.filter(status=status)
        payment_status = self.request.query_params.get("payment_status")
        if payment_status:
            queryset = queryset.filter(payment_status=payment_status)
        return queryset


class AdminOrderDetailAPIView(generics.RetrieveAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]
    lookup_field = "uuid"

    def get_queryset(self):
        return (
            Order.objects.filter(is_archived=False)
            .select_related("customer", "shipping_address", "billing_address")
            .prefetch_related("items", "items__seller")
        )


class AdminUserAddressListAPIView(generics.ListAPIView):
    serializer_class = AddressSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]
    pagination_class = StandardResultsPagination

    def get_queryset(self):
        user = get_object_or_404(User.objects.filter(is_archived=False), uuid=self.kwargs["uuid"])
        return Address.objects.filter(user=user, is_archived=False).order_by("-created_on")


class AdminUserPackageListAPIView(generics.ListAPIView):
    serializer_class = PackageSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]
    pagination_class = StandardResultsPagination

    def get_queryset(self):
        user = get_object_or_404(User.objects.filter(is_archived=False), uuid=self.kwargs["uuid"])
        return Package.objects.filter(owner=user, is_archived=False).order_by("-created_on")


class AdminUserPickupRequestListAPIView(generics.ListAPIView):
    serializer_class = PickupRequestSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]
    pagination_class = StandardResultsPagination

    def get_queryset(self):
        user = get_object_or_404(User.objects.filter(is_archived=False), uuid=self.kwargs["uuid"])
        return (
            PickupRequest.objects.filter(is_archived=False)
            .filter(Q(owner=user) | Q(from_user=user) | Q(to_user=user))
            .distinct()
            .order_by("-created_on")
        )


class AdminUserInventoryListAPIView(generics.ListAPIView):
    serializer_class = MyInventorySerializer
    permission_classes = [IsAuthenticated, IsAdminRole]
    pagination_class = StandardResultsPagination

    def get_queryset(self):
        user = get_object_or_404(User.objects.filter(is_archived=False), uuid=self.kwargs["uuid"])
        return (
            get_product_queryset()
            .filter(seller=user)
            .annotate(
                isbn_10=Coalesce(F("book__isbn_10"), Value("")),
                isbn_13=Coalesce(F("book__isbn_13"), Value("")),
                author_name=Coalesce(Min("book__authors__name"), Value("")),
                publisher_name=Coalesce(F("book__publisher__name"), Value("")),
            )
            .distinct()
            .order_by("-updated_on")
        )


class AdminUserOrderListAPIView(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]
    pagination_class = StandardResultsPagination

    def get_queryset(self):
        user = get_object_or_404(User.objects.filter(is_archived=False), uuid=self.kwargs["uuid"])
        return Order.objects.prefetch_related("items").filter(customer=user, is_archived=False).order_by("-created_on")


class SuperAdminKPIAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        users_queryset = User.objects.filter(is_archived=False)
        total_users = users_queryset.count()
        active_users = users_queryset.filter(is_active=True).count()
        banned_users = users_queryset.filter(is_active=False).count()

        orders_queryset = Order.objects.filter(is_archived=False)
        total_orders = orders_queryset.count()
        order_status_rows = orders_queryset.values("status").annotate(count=Count("id"))
        order_status_counts = {row["status"]: row["count"] for row in order_status_rows}
        paid_revenue = orders_queryset.filter(payment_status="PAID").aggregate(
            total=Coalesce(Sum("total_payable"), Decimal("0.00"))
        )["total"]
        order_currency = orders_queryset.values_list("currency", flat=True).first() or "INR"

        total_addresses = Address.objects.filter(is_archived=False).count()

        packages_queryset = Package.objects.filter(is_archived=False)
        total_packages = packages_queryset.count()
        orphan_packages = packages_queryset.filter(Q(pickup__isnull=True) | Q(pickup__is_archived=True)).count()
        used_packages = max(total_packages - orphan_packages, 0)

        pickup_queryset = PickupRequest.objects.filter(is_archived=False)
        total_pickups = pickup_queryset.count()
        pickup_status_rows = pickup_queryset.values("pickup_status").annotate(count=Count("id"))
        pickup_status_counts = {row["pickup_status"]: row["count"] for row in pickup_status_rows}

        merchant_logs = MerchantFeedSyncLog.objects.all()
        last_feed_log = merchant_logs.order_by("-created_on").first()
        last_24h = timezone.now() - timezone.timedelta(hours=24)
        last_24h_logs = merchant_logs.filter(created_on__gte=last_24h)
        feed_failed_24h = last_24h_logs.filter(status=MerchantFeedSyncLog.Status.FAILED).count()
        feed_success_24h = last_24h_logs.filter(status=MerchantFeedSyncLog.Status.SUCCESS).count()
        feed_pending_queue = MerchantFeedDebounceEntry.objects.count()

        payload = {
            "users": {
                "total": total_users,
                "active": active_users,
                "banned": banned_users,
            },
            "orders": {
                "total": total_orders,
                "booked": order_status_counts.get("BOOKED", 0)
                + order_status_counts.get("PENDING_PAYMENT", 0)
                + order_status_counts.get("PAID", 0),
                "picked": order_status_counts.get("PICKED", 0),
                "delivered": order_status_counts.get("DELIVERED", 0)
                + order_status_counts.get("FULFILLED", 0),
                "by_status": order_status_counts,
            },
            "revenue": {
                "currency": order_currency,
                "total": paid_revenue,
            },
            "addresses": {
                "total": total_addresses,
            },
            "packages": {
                "total": total_packages,
                "used_in_pickup_requests": used_packages,
                "orphan": orphan_packages,
            },
            "pickup_requests": {
                "total": total_pickups,
                "draft": pickup_status_counts.get("DRAFT", 0),
                "booked": pickup_status_counts.get("BOOKED", 0),
                "picked": pickup_status_counts.get("PICKED", 0)
                + pickup_status_counts.get("PICKED_UP_AND_IN_TRANSIT", 0)
                + pickup_status_counts.get("RECEIVED", 0),
                "cancelled": pickup_status_counts.get("CANCELLED", 0)
                + pickup_status_counts.get("REQUEST_CANCEL", 0),
                "by_status": pickup_status_counts,
            },
            "merchant_feed": {
                "pending_queue": feed_pending_queue,
                "success_24h": feed_success_24h,
                "failed_24h": feed_failed_24h,
                "last_status": getattr(last_feed_log, "status", ""),
                "last_run_on": getattr(last_feed_log, "created_on", None),
                "last_error": getattr(last_feed_log, "error_message", ""),
            },
        }
        return Response(payload, status=status.HTTP_200_OK)


_PUBLISHED_YEAR_RE = re.compile(r"\b(19|20)\d{2}\b")


def _legacy_metadata_payload(isbn: str, merged) -> dict:
    """Reshape MergedBookResponse into the legacy bookapi response shape.

    Why: existing dash frontend (dataProvider.js) consumes
    {isbn, source, cached, book:{title, publisher_name, published_year, ...}}.
    Keep that contract until the frontend can move to the new shape.
    """
    if merged is None or not merged.title:
        return {"isbn": isbn, "source": None, "cached": False, "book": None}

    description = merged.description or ""
    year_match = _PUBLISHED_YEAR_RE.search(merged.published_date or "")
    published_year = int(year_match.group(0)) if year_match else None

    return {
        "isbn": isbn,
        "source": merged.sources[0] if merged.sources else None,
        "cached": bool(merged.cached),
        "book": {
            "title": merged.title or "",
            "short_description": description[:280],
            "description": description,
            "authors": list(merged.authors or []),
            "publisher_name": merged.publisher or "",
            "published_year": published_year,
            "page_count": int(merged.page_count or 0),
            "isbn_10": merged.isbn10 or "",
            "isbn_13": merged.isbn13 or "",
            "book_language": merged.language or "",
            "book_edition": "",
            "min_retail_price": None,
            "cover_image_url": merged.thumbnail or "",
        },
    }


class InventoryMetadataFetchAPIView(APIView):
    permission_classes = [IsAuthenticated, IsSellerOrAdmin]

    def get(self, request):
        isbn_raw = str(request.query_params.get("isbn", "")).strip()
        try:
            parsed = normalize_isbn(isbn_raw)
        except InvalidISBN:
            raise drf_serializers.ValidationError(
                {"isbn": ["This query param must be a valid ISBN-10 or ISBN-13."]}
            )
        isbn = parsed["isbn_13"]

        if str(request.query_params.get("refresh", "")).strip().lower() == "true":
            invalidate_isbn_cache(isbn)

        merged = get_book_metadata_sync(isbn)
        payload = _legacy_metadata_payload(isbn, merged)
        if payload["book"] is None:
            payload["detail"] = "No metadata found for this ISBN."
            return Response(payload, status=status.HTTP_404_NOT_FOUND)

        return Response(payload, status=status.HTTP_200_OK)


class AddressViewSet(viewsets.ModelViewSet):
    serializer_class = AddressSerializer
    lookup_field = "uuid"
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user, is_archived=False).order_by("-created_on")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.filter(is_archived=False)
    serializer_class = CategorySerializer
    lookup_field = "uuid"

    def get_permissions(self):
        if self.request.method in {"POST", "PUT", "PATCH", "DELETE"}:
            return [IsSellerOrAdmin()]
        return super().get_permissions()


class AuthorViewSet(viewsets.ModelViewSet):
    queryset = Author.objects.filter(is_archived=False)
    serializer_class = AuthorSerializer
    lookup_field = "uuid"
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["name", "slug", "bio"]
    ordering_fields = ["name", "slug", "created_on", "updated_on", "is_active"]
    ordering = ["name"]

    def get_permissions(self):
        if self.request.method in {"POST", "PUT", "PATCH", "DELETE"}:
            return [IsSellerOrAdmin()]
        return super().get_permissions()


class PublisherViewSet(viewsets.ModelViewSet):
    queryset = Publisher.objects.filter(is_archived=False)
    serializer_class = PublisherSerializer
    lookup_field = "uuid"
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["name", "slug", "description"]
    ordering_fields = ["name", "slug", "created_on", "updated_on", "is_active"]
    ordering = ["name"]

    def get_permissions(self):
        if self.request.method in {"POST", "PUT", "PATCH", "DELETE"}:
            return [IsSellerOrAdmin()]
        return super().get_permissions()


class ProductViewSet(viewsets.ModelViewSet):
    queryset = get_product_queryset()
    serializer_class = ProductSerializer
    lookup_field = "uuid"

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ProductDetailSerializer
        return super().get_serializer_class()

    def get_permissions(self):
        if self.request.method in {"POST", "PUT", "PATCH", "DELETE"}:
            return [IsSellerOrAdmin()]
        return super().get_permissions()


class MyInventoryViewSet(viewsets.ModelViewSet):
    serializer_class = MyInventorySerializer
    lookup_field = "uuid"
    permission_classes = [IsAuthenticated, IsSellerOrAdmin]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = [
        "name",
        "sku",
        "book__isbn_10",
        "book__isbn_13",
        "book__authors__name",
        "book__publisher__name",
    ]
    ordering_fields = [
        "name",
        "isbn_10",
        "isbn_13",
        "author_name",
        "publisher_name",
        "min_retail_price",
        "stock_quantity",
        "created_on",
        "updated_on",
    ]
    ordering = ["-updated_on"]

    @staticmethod
    def _assert_self_sell_inventory_mutation_allowed(user):
        if getattr(user, "pfs_role", "") == "ADMIN":
            return
        if getattr(user, "plan", "") != "SELF_SELL":
            raise PermissionDenied(
                "Only Self Sell users can add, edit, or delete inventory. Other plans have read-only access."
            )

    def get_queryset(self):
        queryset = (
            get_product_queryset()
            .filter(seller=self.request.user)
            .annotate(
                isbn_10=Coalesce(F("book__isbn_10"), Value("")),
                isbn_13=Coalesce(F("book__isbn_13"), Value("")),
                author_name=Coalesce(Min("book__authors__name"), Value("")),
                publisher_name=Coalesce(F("book__publisher__name"), Value("")),
            )
            .distinct()
        )
        is_active_param = self.request.query_params.get("is_active")
        if is_active_param is not None:
            normalized = str(is_active_param).strip().lower()
            if normalized in {"1", "true", "yes", "on"}:
                queryset = queryset.filter(is_active=True)
            elif normalized in {"0", "false", "no", "off"}:
                queryset = queryset.filter(is_active=False)
        return queryset

    def perform_create(self, serializer):
        serializer.save(seller=self.request.user)

    def create(self, request, *args, **kwargs):
        self._assert_self_sell_inventory_mutation_allowed(request.user)
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        self._assert_self_sell_inventory_mutation_allowed(request.user)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        self._assert_self_sell_inventory_mutation_allowed(request.user)
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        self._assert_self_sell_inventory_mutation_allowed(request.user)
        return super().destroy(request, *args, **kwargs)


class CategoryWithProductCountListAPIView(generics.ListAPIView):
    serializer_class = CategoryWithProductCountSerializer
    permission_classes = [AllowAny]
    pagination_class = StandardResultsPagination

    def get_queryset(self):
        return get_category_count_queryset()


class TagWithProductCountListAPIView(generics.ListAPIView):
    serializer_class = TagWithProductCountSerializer
    permission_classes = [AllowAny]
    pagination_class = StandardResultsPagination

    def get_queryset(self):
        return get_tag_count_queryset()


class AuthorWithProductCountListAPIView(generics.ListAPIView):
    serializer_class = AuthorWithProductCountSerializer
    permission_classes = [AllowAny]
    pagination_class = StandardResultsPagination

    def get_queryset(self):
        return get_author_count_queryset()


class PublisherWithProductCountListAPIView(generics.ListAPIView):
    serializer_class = PublisherWithProductCountSerializer
    permission_classes = [AllowAny]
    pagination_class = StandardResultsPagination

    def get_queryset(self):
        return get_publisher_count_queryset()


class SellerWithProductCountListAPIView(generics.ListAPIView):
    serializer_class = SellerWithProductCountSerializer
    permission_classes = [AllowAny]
    pagination_class = StandardResultsPagination

    def get_queryset(self):
        return get_seller_count_queryset()


class CategoryProductListAPIView(generics.ListAPIView):
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]
    pagination_class = StandardResultsPagination

    def get_queryset(self):
        category = get_object_or_404(Category.objects.filter(is_archived=False), uuid=self.kwargs["uuid"])
        return get_product_queryset().filter(category=category)


class TagProductListAPIView(generics.ListAPIView):
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]
    pagination_class = StandardResultsPagination

    def get_queryset(self):
        return get_product_queryset().filter(tags__slug=self.kwargs["slug"]).distinct()


class SellerProductListAPIView(generics.ListAPIView):
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]
    pagination_class = StandardResultsPagination

    def get_queryset(self):
        seller = get_object_or_404(
            User.objects.filter(is_archived=False, is_active=True, pfs_role="SELLER"),
            uuid=self.kwargs["uuid"],
        )
        return get_product_queryset().filter(seller=seller, is_active=True)


class ReStoreProductListAPIView(generics.ListAPIView):
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]
    pagination_class = StandardResultsPagination

    def get_queryset(self):
        return get_product_queryset().filter(sale_price=Decimal("1.00"))


class UnderPriceProductListAPIView(generics.ListAPIView):
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]
    pagination_class = StandardResultsPagination

    def get_queryset(self):
        raw = self.request.query_params.get("max_price", "10")
        try:
            max_price = Decimal(raw)
        except Exception:
            raise drf_serializers.ValidationError("Invalid max_price value.")
        return get_product_queryset().filter(sale_price__lte=max_price)


class GraphQLAPIView(APIView):
    permission_classes = [AllowAny]

    def _extract_first_message(self, value):
        if isinstance(value, dict):
            for nested in value.values():
                message = self._extract_first_message(nested)
                if message:
                    return message
            return ""
        if isinstance(value, list):
            for nested in value:
                message = self._extract_first_message(nested)
                if message:
                    return message
            return ""
        if value is None:
            return ""
        return str(value)

    def _error_response(self, message, status_code, errors=None):
        payload_errors = errors if errors is not None else {"non_field_errors": [message]}
        return Response(
            {
                "detail": message,
                "errors": payload_errors,
                "status_code": int(status_code),
            },
            status=status_code,
        )

    def post(self, request):
        query = request.data.get("query")
        variables = request.data.get("variables") or {}

        if not isinstance(query, str) or not query.strip():
            return self._error_response("`query` must be a non-empty string.", status.HTTP_400_BAD_REQUEST)
        if not isinstance(variables, dict):
            return self._error_response("`variables` must be a JSON object.", status.HTTP_400_BAD_REQUEST)

        handlers = {
            "products": self._products,
            "tagsWithProductCount": self._tags_with_product_count,
            "categoriesWithProductCount": self._categories_with_product_count,
            "authorsWithProductCount": self._authors_with_product_count,
            "publishersWithProductCount": self._publishers_with_product_count,
            "productsByCategory": self._products_by_category,
            "productsByTag": self._products_by_tag,
            "productsByAuthor": self._products_by_author,
            "productsByPublisher": self._products_by_publisher,
            "productDetail": self._product_detail,
        }

        try:
            data = {}
            for field_name, handler in handlers.items():
                pattern = rf"\b{re.escape(field_name)}\b"
                if re.search(pattern, query):
                    data[field_name] = handler(request, variables)
        except drf_serializers.ValidationError as exc:
            detail = self._extract_first_message(exc.detail) or "Validation error."
            return self._error_response(detail, status.HTTP_400_BAD_REQUEST, errors=exc.detail)
        except Http404:
            return self._error_response("Requested resource was not found.", status.HTTP_404_NOT_FOUND)

        if not data:
            return self._error_response("Unsupported query field.", status.HTTP_400_BAD_REQUEST)

        return Response({"data": data}, status=status.HTTP_200_OK)

    def _parse_page(self, value, default):
        try:
            parsed = int(value)
        except (TypeError, ValueError):
            return default
        return max(1, parsed)

    def _parse_page_size(self, value, default=10):
        try:
            parsed = int(value)
        except (TypeError, ValueError):
            return default
        return max(1, min(parsed, 100))

    def _paginate(self, queryset, serializer_class, request, variables):
        page = self._parse_page(variables.get("page"), 1)
        page_size = self._parse_page_size(variables.get("pageSize"), 10)
        paginator = Paginator(queryset, page_size)
        page_obj = paginator.get_page(page)
        serialized = serializer_class(page_obj.object_list, many=True, context={"request": request}).data
        return {
            "count": paginator.count,
            "next": page_obj.next_page_number() if page_obj.has_next() else None,
            "previous": page_obj.previous_page_number() if page_obj.has_previous() else None,
            "results": serialized,
        }

    def _products(self, request, variables):
        queryset = get_product_queryset()
        category_uuid = variables.get("categoryUuid")
        tag_slug = variables.get("tagSlug")
        if category_uuid:
            queryset = queryset.filter(category__uuid=category_uuid)
        if tag_slug:
            queryset = queryset.filter(tags__slug=tag_slug).distinct()
        return self._paginate(queryset, ProductSerializer, request, variables)

    def _tags_with_product_count(self, request, variables):
        queryset = get_tag_count_queryset()
        return self._paginate(queryset, TagWithProductCountSerializer, request, variables)

    def _categories_with_product_count(self, request, variables):
        queryset = get_category_count_queryset()
        return self._paginate(queryset, CategoryWithProductCountSerializer, request, variables)

    def _authors_with_product_count(self, request, variables):
        queryset = get_author_count_queryset()
        return self._paginate(queryset, AuthorWithProductCountSerializer, request, variables)

    def _publishers_with_product_count(self, request, variables):
        queryset = get_publisher_count_queryset()
        return self._paginate(queryset, PublisherWithProductCountSerializer, request, variables)

    def _products_by_category(self, request, variables):
        category_uuid = variables.get("categoryUuid")
        if not category_uuid:
            raise drf_serializers.ValidationError("`categoryUuid` is required.")
        category = get_object_or_404(Category.objects.filter(is_archived=False), uuid=category_uuid)
        queryset = get_product_queryset().filter(category=category)
        return self._paginate(queryset, ProductSerializer, request, variables)

    def _products_by_tag(self, request, variables):
        tag_slug = variables.get("tagSlug")
        if not tag_slug:
            raise drf_serializers.ValidationError("`tagSlug` is required.")
        queryset = get_product_queryset().filter(tags__slug=tag_slug).distinct()
        return self._paginate(queryset, ProductSerializer, request, variables)

    def _products_by_author(self, request, variables):
        author_slug = variables.get("authorSlug")
        if not author_slug:
            raise drf_serializers.ValidationError("`authorSlug` is required.")
        queryset = get_product_queryset().filter(book__authors__slug=author_slug).distinct()
        return self._paginate(queryset, ProductSerializer, request, variables)

    def _products_by_publisher(self, request, variables):
        publisher_slug = variables.get("publisherSlug")
        if not publisher_slug:
            raise drf_serializers.ValidationError("`publisherSlug` is required.")
        queryset = get_product_queryset().filter(book__publisher__slug=publisher_slug).distinct()
        return self._paginate(queryset, ProductSerializer, request, variables)

    def _product_detail(self, request, variables):
        product_uuid = variables.get("uuid")
        if not product_uuid:
            raise drf_serializers.ValidationError("`uuid` is required.")
        product = get_object_or_404(get_product_queryset(), uuid=product_uuid)
        return ProductDetailSerializer(product, context={"request": request}).data


class MerchantFeedXMLAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        feed_path = Path(settings.MEDIA_ROOT) / "feeds" / "google-merchant-feed.xml"
        if not feed_path.exists():
            write_google_merchant_feed_file()

        response = FileResponse(feed_path.open("rb"), content_type="application/xml; charset=utf-8")
        response["Content-Disposition"] = 'inline; filename="google-merchant-feed.xml"'
        return response


class AdminMerchantFeedSyncAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def post(self, request):
        trigger_source = str(request.data.get("trigger_source") or MerchantFeedSyncLog.TriggerSource.MANUAL).strip().upper()
        if trigger_source not in dict(MerchantFeedSyncLog.TriggerSource.choices):
            trigger_source = MerchantFeedSyncLog.TriggerSource.MANUAL

        run_mode = str(request.data.get("run_mode") or MerchantFeedSyncLog.RunMode.FULL).strip().upper()
        if run_mode not in dict(MerchantFeedSyncLog.RunMode.choices):
            run_mode = MerchantFeedSyncLog.RunMode.FULL

        log = MerchantFeedSyncLog.objects.create(
            trigger_source=trigger_source,
            run_mode=run_mode,
            status=MerchantFeedSyncLog.Status.PENDING,
            payload={
                "requested_by": str(request.user.uuid),
            },
        )
        run_merchant_feed_sync_task.delay(
            log_id=log.id,
            trigger_source=trigger_source,
            run_mode=run_mode,
        )
        return Response(
            {
                "detail": "Merchant feed sync queued.",
                "log_id": log.id,
                "status": log.status,
            },
            status=status.HTTP_202_ACCEPTED,
        )


class CartAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        owner = _resolve_cart_owner(request)
        cart = _get_active_cart(user=owner["user"], guest_token=owner["guest_token"])
        if not cart:
            return Response(
                {
                    "uuid": None,
                    "is_active": False,
                    "is_archived": False,
                    "created_on": None,
                    "updated_on": None,
                    "items": [],
                    "total_items": 0,
                    "subtotal": Decimal("0.00"),
                    "grand_total": Decimal("0.00"),
                }
            )
        return Response(CartSerializer(cart).data)


class CartAddAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = CartAddItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        owner = _resolve_cart_owner(request)
        cart = _get_active_cart(user=owner["user"], guest_token=owner["guest_token"], create=True)
        _assert_cart_editable(cart)

        product = Product.objects.filter(
            uuid=serializer.validated_data["product_uuid"],
            is_active=True,
            is_archived=False,
        ).first()
        if not product:
            raise drf_serializers.ValidationError("Product not found.")
        if product.stock_quantity < 1:
            raise drf_serializers.ValidationError("Product is out of stock.")

        quantity = serializer.validated_data["quantity"]
        item = cart.items.filter(product=product, is_archived=False).first()
        new_quantity = quantity if not item else item.quantity + quantity

        if new_quantity > product.stock_quantity:
            raise drf_serializers.ValidationError("Insufficient stock for requested quantity.")

        if item:
            item.quantity = new_quantity
            item.save(update_fields=["quantity", "updated_on"])
        else:
            CartItem.objects.create(cart=cart, product=product, quantity=quantity)

        return Response(CartSerializer(cart).data, status=status.HTTP_200_OK)


class CartUpdateAPIView(APIView):
    permission_classes = [AllowAny]

    def put(self, request):
        serializer = CartUpdateItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        owner = _resolve_cart_owner(request)
        cart = _get_active_cart(user=owner["user"], guest_token=owner["guest_token"])
        if not cart:
            raise drf_serializers.ValidationError("Cart not found.")
        _assert_cart_editable(cart)

        item = _get_cart_item(
            cart,
            item_uuid=serializer.validated_data.get("item_uuid"),
            product_uuid=serializer.validated_data.get("product_uuid"),
        )
        if not item:
            raise drf_serializers.ValidationError("Cart item not found.")

        product = item.product
        if not product.is_active or product.is_archived:
            raise drf_serializers.ValidationError("Product is not available.")

        quantity = serializer.validated_data["quantity"]
        if quantity > product.stock_quantity:
            raise drf_serializers.ValidationError("Insufficient stock for requested quantity.")

        item.quantity = quantity
        item.save(update_fields=["quantity", "updated_on"])
        return Response(CartSerializer(cart).data)


class CartRemoveAPIView(APIView):
    permission_classes = [AllowAny]

    def delete(self, request):
        serializer = CartRemoveItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        owner = _resolve_cart_owner(request)
        cart = _get_active_cart(user=owner["user"], guest_token=owner["guest_token"])
        if not cart:
            raise drf_serializers.ValidationError("Cart not found.")
        _assert_cart_editable(cart)

        item = _get_cart_item(
            cart,
            item_uuid=serializer.validated_data.get("item_uuid"),
            product_uuid=serializer.validated_data.get("product_uuid"),
        )
        if not item:
            raise drf_serializers.ValidationError("Cart item not found.")

        item.delete()
        return Response(CartSerializer(cart).data)


class CartMergeAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CartMergeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        guest_token = serializer.validated_data["guest_token"].strip()
        if not guest_token:
            raise drf_serializers.ValidationError("guest_token is required.")

        guest_cart = _get_active_cart(guest_token=guest_token)
        if not guest_cart:
            user_cart = _get_active_cart(user=request.user)
            if not user_cart:
                return Response(
                    {
                        "uuid": None,
                        "is_active": False,
                        "is_archived": False,
                        "created_on": None,
                        "updated_on": None,
                        "items": [],
                        "total_items": 0,
                        "subtotal": Decimal("0.00"),
                        "grand_total": Decimal("0.00"),
                    }
                )
            return Response(CartSerializer(user_cart).data)

        existing_user_cart = _get_active_cart(user=request.user)
        if not existing_user_cart:
            guest_cart.user = request.user
            guest_cart.guest_token = None
            guest_cart.save(update_fields=["user", "guest_token", "updated_on"])
            return Response(CartSerializer(guest_cart).data)

        user_cart = existing_user_cart
        _assert_cart_editable(user_cart)

        with transaction.atomic():
            for item in guest_cart.items.filter(is_archived=False).select_related("product"):
                product = item.product
                if not product.is_active or product.is_archived:
                    raise drf_serializers.ValidationError(f"Product not available: {product.uuid}")
                if product.stock_quantity < 1:
                    raise drf_serializers.ValidationError(f"Product out of stock: {product.uuid}")

                existing_item = user_cart.items.filter(product=product, is_archived=False).first()
                new_quantity = item.quantity + (existing_item.quantity if existing_item else 0)

                if new_quantity > product.stock_quantity:
                    raise drf_serializers.ValidationError(f"Insufficient stock for {product.name}")

                if existing_item:
                    existing_item.quantity = new_quantity
                    existing_item.save(update_fields=["quantity", "updated_on"])
                    item.delete()
                else:
                    item.cart = user_cart
                    item.save(update_fields=["cart", "updated_on"])

            guest_cart.is_archived = True
            guest_cart.is_active = False
            guest_cart.save(update_fields=["is_archived", "is_active", "updated_on"])

        return Response(CartSerializer(user_cart).data)


class CartItemsAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        owner = _resolve_cart_owner(request)
        cart = _get_active_cart(user=owner["user"], guest_token=owner["guest_token"])
        if not cart:
            return Response([])
        items = cart.items.filter(is_archived=False).select_related("product")
        return Response(CartItemSerializer(items, many=True).data)


class CartItemDetailAPIView(APIView):
    permission_classes = [AllowAny]

    def put(self, request, uuid=None):
        owner = _resolve_cart_owner(request)
        item = (
            CartItem.objects.select_related("cart", "product")
            .filter(uuid=uuid, is_archived=False)
            .first()
        )
        if not item:
            raise Http404

        if owner["user"]:
            if item.cart.user_id != owner["user"].id:
                return Response({"detail": "You do not have permission to update this item."}, status=status.HTTP_403_FORBIDDEN)
        elif item.cart.guest_token != owner["guest_token"]:
            return Response({"detail": "You do not have permission to update this item."}, status=status.HTTP_403_FORBIDDEN)

        _assert_cart_editable(item.cart)

        serializer = CartItemQuantitySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        quantity = serializer.validated_data["quantity"]
        product = item.product
        if not product.is_active or product.is_archived:
            raise drf_serializers.ValidationError("Product is not available.")
        if quantity > product.stock_quantity:
            raise drf_serializers.ValidationError("Insufficient stock for requested quantity.")

        item.quantity = quantity
        item.save(update_fields=["quantity", "updated_on"])
        return Response(CartItemSerializer(item).data)

    def delete(self, request, uuid=None):
        owner = _resolve_cart_owner(request)
        item = (
            CartItem.objects.select_related("cart", "product")
            .filter(uuid=uuid, is_archived=False)
            .first()
        )
        if not item:
            raise Http404

        if owner["user"]:
            if item.cart.user_id != owner["user"].id:
                return Response({"detail": "You do not have permission to remove this item."}, status=status.HTTP_403_FORBIDDEN)
        elif item.cart.guest_token != owner["guest_token"]:
            return Response({"detail": "You do not have permission to remove this item."}, status=status.HTTP_403_FORBIDDEN)

        _assert_cart_editable(item.cart)
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CheckoutAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CheckoutSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class CheckoutPreviewAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CheckoutPreviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        cart = _get_active_cart(user=request.user)
        items_payload = serializer.validated_data.get("items", [])

        if cart:
            cart_items = cart.items.filter(is_archived=False).select_related("product")
        else:
            cart_items = None

        if cart_items and cart_items.exists():
            subtotal, _ = _calculate_cart_totals(cart_items)
        elif items_payload:
            subtotal, _ = _calculate_items_totals(items_payload)
        else:
            raise drf_serializers.ValidationError("Cart is empty.")
        coupon_code = serializer.validated_data.get("coupon_code") or ""
        coupon, discount = _apply_coupon(coupon_code, user=request.user, subtotal=subtotal)

        return Response(
            {
                "subtotal": subtotal,
                "discount": discount,
                "total": subtotal - discount,
                "coupon": coupon.code if coupon else None,
            }
        )


class CheckoutInitiateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CheckoutInitiateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        cart = _get_active_cart(user=request.user)
        items_payload = serializer.validated_data.get("items", [])

        if cart:
            cart_items = cart.items.filter(is_archived=False).select_related("product")
        else:
            cart_items = None

        if cart_items and cart_items.exists():
            subtotal, resolved_items = _calculate_cart_totals(cart_items)
        elif items_payload:
            subtotal, resolved_items = _calculate_items_totals(items_payload)
        else:
            raise drf_serializers.ValidationError("Cart is empty.")
        coupon_code = serializer.validated_data.get("coupon_code") or ""
        coupon, discount = _apply_coupon(coupon_code, user=request.user, subtotal=subtotal)

        shipping_address = _resolve_shipping_address(request.user, serializer.validated_data.get("address_uuid"))

        total_payable = subtotal - discount
        if total_payable < 0:
            total_payable = Decimal("0.00")

        gateway_name = serializer.validated_data.get("gateway", "razorpay")
        gateway, _ = PaymentGateway.objects.get_or_create(name=gateway_name, defaults={"is_active": True})
        if not gateway.is_active:
            raise drf_serializers.ValidationError("Payment gateway is not available.")

        with transaction.atomic():
            order = Order.objects.create(
                customer=request.user,
                shipping_address=shipping_address,
                billing_address=shipping_address,
                subtotal=subtotal,
                shipping_charge=Decimal("0.00"),
                tax_amount=Decimal("0.00"),
                discount_amount=discount,
                total_payable=total_payable,
                notes="",
                status="PENDING_PAYMENT",
                payment_status="PENDING",
                placed_on=timezone.now(),
            )

            for item_data, product, unit_price, line_total in resolved_items:
                OrderItem.objects.create(
                    order=order,
                    product=product,
                    seller=product.seller,
                    product_name=product.name,
                    sku=product.sku,
                    quantity=item_data["quantity"] if isinstance(item_data, dict) else item_data.quantity,
                    unit_price=unit_price,
                    line_total=line_total,
                )

            if coupon:
                CouponUsage.objects.create(coupon=coupon, user=request.user, order=order)

            try:
                provider = get_payment_provider(gateway.name)
            except PaymentProviderError as exc:
                raise drf_serializers.ValidationError(str(exc))
            receipt = str(order.uuid)
            gateway_order = provider.create_order(
                amount=int(total_payable * 100),
                currency=order.currency,
                receipt=receipt,
            )
            payment = Payment.objects.create(
                order=order,
                gateway=gateway,
                gateway_order_id=gateway_order.get("id", ""),
                amount=total_payable,
                currency=order.currency,
                status="INITIATED",
                response=gateway_order,
            )

            if cart:
                cart.is_active = False
                cart.is_archived = True
                cart.save(update_fields=["is_active", "is_archived", "updated_on"])

        return Response(
            {
                "order": OrderSerializer(order).data,
                "payment": {
                    "uuid": payment.uuid,
                    "gateway": gateway.name,
                    "gateway_order_id": payment.gateway_order_id,
                    "amount": payment.amount,
                    "currency": payment.currency,
                    "key_id": os.environ.get("RAZORPAY_SECRET_KEY_ID") or os.environ.get("RAZORPAY_KEY", ""),
                },
            },
            status=status.HTTP_201_CREATED,
        )


class PaymentVerifyAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PaymentVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order = Order.objects.filter(uuid=serializer.validated_data["order_uuid"], is_archived=False).first()
        if not order:
            raise drf_serializers.ValidationError("Order not found.")
        if order.customer_id != request.user.id and request.user.pfs_role != "ADMIN":
            return Response({"detail": "You do not have permission to verify this order."}, status=status.HTTP_403_FORBIDDEN)

        payment = order.payments.order_by("-created_on").first()
        if not payment:
            raise drf_serializers.ValidationError("Payment not found.")

        gateway_name = serializer.validated_data.get("gateway", "razorpay")
        try:
            provider = get_payment_provider(gateway_name)
        except PaymentProviderError as exc:
            raise drf_serializers.ValidationError(str(exc))
        payload = {
            "razorpay_order_id": serializer.validated_data.get("razorpay_order_id", ""),
            "razorpay_payment_id": serializer.validated_data.get("razorpay_payment_id", ""),
        }
        signature = serializer.validated_data.get("signature", "")
        if not provider.verify_payment(payload=payload, signature=signature):
            raise drf_serializers.ValidationError("Payment verification failed.")

        payment.gateway_payment_id = payload["razorpay_payment_id"]
        payment.status = "CAPTURED"
        payment.response = {**payment.response, "verified": True}
        payment.save(update_fields=["gateway_payment_id", "status", "response", "updated_on"])

        order.payment_status = "PAID"
        order.status = "PAID"
        order.save(update_fields=["payment_status", "status", "updated_on"])

        return Response({"detail": "Payment verified", "order": OrderSerializer(order).data})


class PaymentInitiateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PaymentInitiateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order = Order.objects.filter(uuid=serializer.validated_data["order_uuid"], is_archived=False).first()
        if not order:
            raise drf_serializers.ValidationError("Order not found.")
        if order.customer_id != request.user.id and request.user.pfs_role != "ADMIN":
            return Response({"detail": "You do not have permission to pay for this order."}, status=status.HTTP_403_FORBIDDEN)

        if order.status not in {"PENDING_PAYMENT", "PAYMENT_FAILED"}:
            raise drf_serializers.ValidationError("Order is not eligible for payment retry.")

        gateway_name = serializer.validated_data.get("gateway", "razorpay")
        gateway, _ = PaymentGateway.objects.get_or_create(name=gateway_name, defaults={"is_active": True})
        if not gateway.is_active:
            raise drf_serializers.ValidationError("Payment gateway is not available.")

        try:
            provider = get_payment_provider(gateway.name)
        except PaymentProviderError as exc:
            raise drf_serializers.ValidationError(str(exc))

        receipt = str(order.uuid)
        total_payable = order.total_payable
        gateway_order = provider.create_order(
            amount=int(total_payable * 100),
            currency=order.currency,
            receipt=receipt,
        )

        payment = Payment.objects.create(
            order=order,
            gateway=gateway,
            gateway_order_id=gateway_order.get("id", ""),
            amount=total_payable,
            currency=order.currency,
            status="INITIATED",
            response=gateway_order,
        )

        return Response(
            {
                "order": OrderSerializer(order).data,
                "payment": {
                    "uuid": payment.uuid,
                    "gateway": gateway.name,
                    "gateway_order_id": payment.gateway_order_id,
                    "amount": payment.amount,
                    "currency": payment.currency,
                    "key_id": os.environ.get("RAZORPAY_SECRET_KEY_ID") or os.environ.get("RAZORPAY_KEY", ""),
                },
            },
            status=status.HTTP_201_CREATED,
        )


class PaymentWebhookAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        payload = request.data
        gateway = payload.get("entity") or "razorpay"
        try:
            get_payment_provider(gateway)
        except PaymentProviderError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        signature = request.headers.get("X-Razorpay-Signature", "")
        if signature:
            body = request.body.decode("utf-8")
            secret = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "")
            if secret:
                expected = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()
                if not hmac.compare_digest(expected, signature):
                    return Response({"detail": "Invalid signature."}, status=status.HTTP_400_BAD_REQUEST)

        event = payload.get("event", "")
        payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
        gateway_order_id = payment_entity.get("order_id", "")
        gateway_payment_id = payment_entity.get("id", "")
        payment = Payment.objects.filter(gateway_order_id=gateway_order_id).first()
        if not payment:
            return Response({"detail": "Payment not found."}, status=status.HTTP_404_NOT_FOUND)

        if event.endswith("captured"):
            payment.status = "CAPTURED"
        elif event.endswith("failed"):
            payment.status = "FAILED"
        payment.gateway_payment_id = gateway_payment_id
        payment.response = payload
        payment.save(update_fields=["status", "gateway_payment_id", "response", "updated_on"])

        if payment.status == "CAPTURED":
            order = payment.order
            order.payment_status = "PAID"
            order.status = "PAID"
            order.save(update_fields=["payment_status", "status", "updated_on"])

        return Response({"detail": "Webhook processed."})


class RefundAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = RefundRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        payment = Payment.objects.filter(uuid=serializer.validated_data["payment_uuid"]).first()
        if not payment:
            raise drf_serializers.ValidationError("Payment not found.")
        if payment.order.customer_id != request.user.id and request.user.pfs_role != "ADMIN":
            return Response({"detail": "You do not have permission to refund this payment."}, status=status.HTTP_403_FORBIDDEN)

        amount = serializer.validated_data["amount"]
        if amount > payment.amount:
            raise drf_serializers.ValidationError("Refund amount exceeds payment amount.")

        try:
            provider = get_payment_provider(payment.gateway.name)
        except PaymentProviderError as exc:
            raise drf_serializers.ValidationError(str(exc))
        try:
            refund_response = provider.refund(payment_id=payment.gateway_payment_id, amount=int(amount * 100))
        except PaymentProviderError as exc:
            raise drf_serializers.ValidationError(str(exc))

        refund = Refund.objects.create(
            payment=payment,
            amount=amount,
            gateway_refund_id=refund_response.get("id", ""),
            status="INITIATED",
        )

        payment.status = "REFUNDED"
        payment.save(update_fields=["status", "updated_on"])

        return Response(
            {
                "refund_uuid": refund.uuid,
                "status": refund.status,
                "gateway_refund_id": refund.gateway_refund_id,
            },
            status=status.HTTP_201_CREATED,
        )


class OrderViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = OrderSerializer
    lookup_field = "uuid"
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.pfs_role == "ADMIN":
            return Order.objects.prefetch_related("items").filter(is_archived=False)
        return Order.objects.prefetch_related("items").filter(customer=user, is_archived=False)

    @action(detail=True, methods=["patch"], url_path="payment-status")
    def payment_status(self, request, uuid=None):
        if request.user.pfs_role not in {"ADMIN", "SELLER"}:
            return Response({"detail": "You do not have permission to update payment status."}, status=status.HTTP_403_FORBIDDEN)
        order = self.get_object()
        serializer = PaymentStatusUpdateSerializer(order, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(OrderSerializer(order).data)
