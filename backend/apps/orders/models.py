from django.conf import settings
from django.db import models

from apps.common.models import UUIDModel
from apps.inventory.models import Product
from apps.users.models import Address


class Order(UUIDModel):
    STATUS_CHOICES = (
        ("DRAFT", "Draft"),
        ("PENDING_PAYMENT", "Pending Payment"),
        ("PAID", "Paid"),
        ("PAYMENT_FAILED", "Payment Failed"),
        ("CANCELLED", "Cancelled"),
        ("FULFILLED", "Fulfilled"),
        ("REFUNDED", "Refunded"),
    )

    PAYMENT_STATUS_CHOICES = (
        ("UNPAID", "Unpaid"),
        ("PENDING", "Pending"),
        ("PAID", "Paid"),
        ("FAILED", "Failed"),
        ("REFUNDED", "Refunded"),
    )

    id = models.BigAutoField(primary_key=True)
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="orders")
    shipping_address = models.ForeignKey(Address, on_delete=models.PROTECT, related_name="shipping_orders")
    billing_address = models.ForeignKey(Address, on_delete=models.PROTECT, related_name="billing_orders")

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PENDING_PAYMENT")
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default="UNPAID")

    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    shipping_charge = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_payable = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    currency = models.CharField(max_length=10, default="INR")

    notes = models.TextField(blank=True, default="")
    placed_on = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-created_on",)

    def __str__(self) -> str:
        return f"Order {self.uuid}"


class OrderItem(UUIDModel):
    id = models.BigAutoField(primary_key=True)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="order_items")
    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="sold_order_items", null=True)

    product_name = models.CharField(max_length=255)
    sku = models.CharField(max_length=100)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    line_total = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        ordering = ("-created_on",)

    def __str__(self) -> str:
        return f"{self.order.uuid} - {self.sku}"
