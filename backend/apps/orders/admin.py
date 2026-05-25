from django.contrib import admin

from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ("uuid", "product_name", "sku", "quantity", "unit_price", "line_total")


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("uuid", "customer", "status", "payment_status", "total_payable", "created_on")
    list_filter = ("status", "payment_status")
    search_fields = ("uuid", "customer__email")
    inlines = [OrderItemInline]


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ("uuid", "order", "sku", "quantity", "line_total")
    search_fields = ("uuid", "sku", "order__uuid")
