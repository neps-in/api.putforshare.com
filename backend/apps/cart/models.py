from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q

from apps.common.models import UUIDModel
from apps.inventory.models import Product


class Cart(UUIDModel):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="carts",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    guest_token = models.CharField(max_length=255, null=True, blank=True, db_index=True)

    class Meta:
        ordering = ("-updated_on",)
        constraints = [
            models.UniqueConstraint(
                fields=["user"],
                condition=Q(is_active=True, is_archived=False),
                name="cart_unique_active_user",
            ),
            models.UniqueConstraint(
                fields=["guest_token"],
                condition=Q(is_active=True, is_archived=False),
                name="cart_unique_active_guest",
            ),
            models.CheckConstraint(
                condition=Q(user__isnull=False) | Q(guest_token__isnull=False),
                name="cart_user_or_guest_required",
            ),
        ]

    def __str__(self) -> str:
        owner = self.user.email if self.user else self.guest_token
        return f"Cart {self.uuid} ({owner})"

    @property
    def active_items(self):
        return self.items.filter(is_archived=False)

    @property
    def subtotal(self):
        return sum((item.item_total for item in self.active_items), start=Decimal("0.00"))

    @property
    def total_items(self):
        return sum((item.quantity for item in self.active_items), start=0)


class CartItem(UUIDModel):
    id = models.BigAutoField(primary_key=True)
    cart = models.ForeignKey(Cart, related_name="items", on_delete=models.CASCADE)
    product = models.ForeignKey(Product, related_name="cart_items", on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)], default=1)

    class Meta:
        ordering = ("-created_on",)
        constraints = [
            models.UniqueConstraint(
                fields=["cart", "product"],
                condition=Q(is_archived=False),
                name="cartitem_unique_active_product",
            )
        ]

    def __str__(self) -> str:
        return f"{self.cart.uuid} - {self.product.sku}"

    @property
    def unit_price(self):
        return self.product.sale_price

    @property
    def item_total(self):
        return self.unit_price * self.quantity
