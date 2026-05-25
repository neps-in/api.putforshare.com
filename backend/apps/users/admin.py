from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import Address, User, VerificationToken


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ("-created_on",)
    list_display = ("email", "uuid", "pfs_role", "mobile_verified_on", "net_earnings", "is_active", "is_staff")
    search_fields = ("email", "uuid", "username", "full_name")
    list_filter = ("pfs_role", "is_active", "is_staff", "mobile_verified", "plan_locked")

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (
            "Profile",
            {
                "fields": (
                    "uuid",
                    "username",
                    "full_name",
                    "mobile",
                    "favourite_book",
                    "upi_id",
                    "pfs_role",
                    "plan",
                    "plan_locked",
                    "store_credit",
                    "net_earnings",
                    "inventories",
                )
            },
        ),
        (
            "Verification",
            {
                "fields": (
                    "mobile_verified",
                    "mobile_verified_on",
                    "upi_last_verified_on",
                )
            },
        ),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Dates", {"fields": ("created_on", "updated_on", "last_login")}),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "username", "full_name", "password1", "password2", "pfs_role", "is_active", "is_staff"),
            },
        ),
    )

    readonly_fields = ("uuid", "inventories", "created_on", "updated_on")


@admin.register(VerificationToken)
class VerificationTokenAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "purpose", "email", "created_at", "expires_at", "used_at")
    list_filter = ("purpose",)
    search_fields = ("user__email", "email")
    readonly_fields = ("user", "purpose", "token_hash", "email", "created_at", "expires_at", "used_at")
    ordering = ("-created_at",)

    def has_add_permission(self, request):
        return False


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = (
        "uuid",
        "user",
        "address_name",
        "pincode",
        "address_type",
        "default_shipping_address",
        "default_billing_address",
    )
    search_fields = ("uuid", "user__email", "address_name", "pincode", "town_city", "state_region")
