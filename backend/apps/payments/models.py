from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models

from apps.common.models import UUIDModel
from apps.orders.models import Order


class PaymentGateway(UUIDModel):
    name = models.CharField(max_length=50, unique=True)
    config = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ("name",)

    def __str__(self) -> str:
        return self.name


class Payment(UUIDModel):
    STATUS_CHOICES = (
        ("INITIATED", "Initiated"),
        ("AUTHORIZED", "Authorized"),
        ("CAPTURED", "Captured"),
        ("FAILED", "Failed"),
        ("REFUNDED", "Refunded"),
    )

    id = models.BigAutoField(primary_key=True)
    order = models.ForeignKey(Order, related_name="payments", on_delete=models.CASCADE)
    gateway = models.ForeignKey(PaymentGateway, related_name="payments", on_delete=models.PROTECT)
    gateway_order_id = models.CharField(max_length=255, blank=True, default="")
    gateway_payment_id = models.CharField(max_length=255, blank=True, default="")
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.00"))])
    currency = models.CharField(max_length=10, default="INR")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="INITIATED")
    response = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ("-created_on",)

    def __str__(self) -> str:
        return f"{self.order.uuid} - {self.gateway.name}"


class Coupon(UUIDModel):
    TYPE_CHOICES = (
        ("PERCENT", "Percent"),
        ("FLAT", "Flat"),
    )

    code = models.CharField(max_length=50, unique=True)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    value = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.00"))])
    min_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    valid_from = models.DateField(null=True, blank=True)
    valid_to = models.DateField(null=True, blank=True)
    max_usage = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        ordering = ("code",)

    def __str__(self) -> str:
        return self.code


class CouponUsage(UUIDModel):
    coupon = models.ForeignKey(Coupon, related_name="usages", on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="coupon_usages", on_delete=models.CASCADE)
    order = models.ForeignKey(Order, related_name="coupon_usages", on_delete=models.CASCADE)
    used_on = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-used_on",)

    def __str__(self) -> str:
        return f"{self.coupon.code} - {self.user_id}"


class Refund(UUIDModel):
    STATUS_CHOICES = (
        ("INITIATED", "Initiated"),
        ("PROCESSING", "Processing"),
        ("COMPLETED", "Completed"),
        ("FAILED", "Failed"),
    )

    payment = models.ForeignKey(Payment, related_name="refunds", on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.00"))])
    gateway_refund_id = models.CharField(max_length=255, blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="INITIATED")

    class Meta:
        ordering = ("-created_on",)

    def __str__(self) -> str:
        return f"Refund {self.uuid}"
