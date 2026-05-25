from django.contrib import admin

from .models import Cart, CartItem


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ("uuid", "user", "guest_token", "is_active", "is_archived", "updated_on")
    list_filter = ("is_active", "is_archived")
    search_fields = ("uuid", "guest_token", "user__email")


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ("uuid", "cart", "product", "quantity", "is_active", "is_archived", "updated_on")
    list_filter = ("is_active", "is_archived")
    search_fields = ("uuid", "cart__uuid", "product__sku")
