from django.contrib import admin

from .models import Package, PackageProfile, PickupRequest, Pincode, Shipper


@admin.register(Pincode)
class PincodeAdmin(admin.ModelAdmin):
    list_display = ("pincode", "office_name", "district_name", "state_name", "region", "metro", "embargo", "is_archived")
    search_fields = (
        "pincode",
        "office_name",
        "division_name",
        "region_name",
        "circle_name",
        "taluk",
        "district_name",
        "state_name",
        "region",
    )
    list_filter = ("region", "metro", "state_name", "district_name", "embargo", "is_archived")


@admin.register(Shipper)
class ShipperAdmin(admin.ModelAdmin):
    list_display = ("shipper_shortname", "shipper_name", "shipper_account_number", "owner", "is_archived")
    search_fields = ("shipper_shortname", "shipper_name", "shipper_account_number", "shipper_account_name")
    list_filter = ("is_archived",)


@admin.register(PickupRequest)
class PickupRequestAdmin(admin.ModelAdmin):
    list_display = ("uuid", "shipper_pkreqid", "pickup_status", "pickup_mode", "pickup_scheduled_date", "is_archived")
    search_fields = ("uuid", "shipper_pkreqid")
    list_filter = ("pickup_status", "pickup_mode", "is_archived")


@admin.register(Package)
class PackageAdmin(admin.ModelAdmin):
    list_display = ("awb_number", "package_name", "package_category", "quantity", "owner", "is_archived")
    search_fields = ("awb_number", "package_name", "package_description", "hsn_code")
    list_filter = ("package_category", "is_archived")


@admin.register(PackageProfile)
class PackageProfileAdmin(admin.ModelAdmin):
    list_display = ("inventory", "package_profile_category", "hsn_code", "is_archived")
    search_fields = ("package_profile_category", "package_profile_description", "hsn_code")
    list_filter = ("package_profile_category", "is_archived")
