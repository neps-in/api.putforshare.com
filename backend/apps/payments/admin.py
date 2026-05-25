from django.contrib import admin

from .models import Coupon, CouponUsage, Payment, PaymentGateway, Refund


@admin.register(PaymentGateway)
class PaymentGatewayAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active", "updated_on")
    list_filter = ("is_active", "is_archived")
    search_fields = ("name",)


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("order", "gateway", "amount", "currency", "status", "created_on")
    list_filter = ("status", "gateway")
    search_fields = ("order__uuid", "gateway_order_id", "gateway_payment_id")


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ("code", "type", "value", "min_amount", "valid_from", "valid_to", "max_usage")
    search_fields = ("code",)


@admin.register(CouponUsage)
class CouponUsageAdmin(admin.ModelAdmin):
    list_display = ("coupon", "user", "order", "used_on")
    search_fields = ("coupon__code", "user__email", "order__uuid")


@admin.register(Refund)
class RefundAdmin(admin.ModelAdmin):
    list_display = ("payment", "amount", "status", "created_on")
    list_filter = ("status",)
    search_fields = ("payment__order__uuid", "gateway_refund_id")
