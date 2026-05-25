from decimal import Decimal

from django.conf import settings
from django.db import models

from apps.common.models import UUIDModel
from apps.inventory.models import Product
from apps.users.models import Address, User

from .regioning import REGION_CHOICES, derive_region, is_metro_city

DEFAULT_SHIPMENT_MODE_CHOICES = (
    ("AIRWAYS_PRIORITY", "Airways Priority Mode"),
    ("ROADWAYS_ECONOMY", "Roadways Economy Mode"),
)

DEFAULT_INBOUND_PICKUP_STATUS_CHOICES = (
    ("DRAFT", "Save Pickup Request as DRAFT."),
    ("BOOKED", "Finalize Pickup Request as BOOKED."),
    ("REQUEST_CANCEL", "Request Admin for cancellation of this Pickup Request."),
    ("READY_FOR_PICKUP", "Pickup Request is packed and ready for pickup."),
    ("CANCELLED", "CANCEL this Pickup Request."),
    ("PICKED_UP_AND_IN_TRANSIT", "Pickup Request is picked up and in transit."),
    ("PICKUP_REJECTED", "Pickup Request is rejected for some reason by Logistics Team."),
    ("RECEIVED", "Pickup Request received at the Warehouse."),
    ("RETURNED", "Pickup Request Returned to source location."),
)

SHIPMENT_MODE_CHOICES = tuple(getattr(settings, "SHIPMENT_MODE_CHOICES", DEFAULT_SHIPMENT_MODE_CHOICES))
INBOUND_PICKUP_STATUS_CHOICES = tuple(
    getattr(settings, "INBOUND_PICKUP_STATUS_CHOICES", DEFAULT_INBOUND_PICKUP_STATUS_CHOICES)
)
class Pincode(UUIDModel):
    id = models.BigAutoField(primary_key=True)

    office_name = models.CharField(max_length=200, blank=True, default="")
    pincode = models.CharField(max_length=16, blank=True, default="", db_index=True)
    office_type = models.CharField(max_length=200, blank=True, default="")
    delivery_status = models.CharField(max_length=200, blank=True, default="")
    division_name = models.CharField(max_length=200, blank=True, default="")
    region_name = models.CharField(max_length=200, blank=True, default="")
    circle_name = models.CharField(max_length=200, blank=True, default="")
    taluk = models.CharField(max_length=200, blank=True, default="")
    district_name = models.CharField(max_length=200, blank=True, default="")
    state_name = models.CharField(max_length=200, blank=True, default="")
    region = models.CharField(max_length=20, choices=REGION_CHOICES, blank=True, default="", db_index=True)
    metro = models.BooleanField(default=False, db_index=True)
    state_short_name = models.CharField(max_length=200, blank=True, default="")
    telephone = models.CharField(max_length=20, blank=True, default="")
    alternate_telephone = models.CharField(max_length=20, blank=True, default="")
    mobile_number = models.CharField(max_length=20, blank=True, default="")
    head_post_master = models.CharField(max_length=255, blank=True, default="")
    head_post_master_mobile_number = models.CharField(max_length=255, blank=True, default="")
    related_suboffice = models.CharField(max_length=200, blank=True, default="")
    related_headoffice = models.CharField(max_length=200, blank=True, default="")
    post_office_address = models.TextField(blank=True, default="")
    plus_code = models.CharField(max_length=255, blank=True, default="")
    # Geo fields represented in decimals for sqlite compatibility.
    # Use 
    po_latitude = models.DecimalField(max_digits=10, decimal_places=7, default=Decimal("0.0000000"))
    po_longitude = models.DecimalField(max_digits=10, decimal_places=7, default=Decimal("0.0000000"))
    longitude = models.CharField(max_length=50, blank=True, default="")
    latitude = models.CharField(max_length=50, blank=True, default="")
    embargo = models.BooleanField(default=False)
    remark = models.CharField(max_length=255, blank=True, default="", null=True)
    archived = models.BooleanField(default=False)

    class Meta:
        ordering = ("-updated_on", "office_name", "pincode")
        verbose_name_plural = "pincodes"

    def __str__(self):
        return f"{self.pincode} - {self.office_name}".strip(" -")

    def save(self, *args, **kwargs):
        if not self.region:
            self.region = derive_region(self.state_name, self.district_name)
        self.metro = is_metro_city(self.state_name, self.district_name)
        super().save(*args, **kwargs)


class Shipper(UUIDModel):
    id = models.BigAutoField(primary_key=True)

    owner = models.ForeignKey(
        User,
        related_name="shipperowner",
        on_delete=models.DO_NOTHING,
        null=True,
        blank=True,
        default=None,
    )
    shipper_shortname = models.CharField(max_length=255, blank=False, default="")
    shipper_name = models.CharField(max_length=255, blank=False, default="")
    shipper_account_number = models.CharField(max_length=255, blank=False, default="")
    shipper_account_name = models.CharField(max_length=255, blank=False, default="")

    class Meta:
        ordering = ("-updated_on",)

    def __str__(self):
        return f"Shipper #{self.id} - {self.shipper_shortname}"


class PickupRequest(UUIDModel):
    id = models.BigAutoField(primary_key=True)

    owner = models.ForeignKey(
        User,
        related_name="ownerpickups",
        on_delete=models.DO_NOTHING,
        blank=True,
        null=True,
        default=None,
    )
    shipper_pkreqid = models.CharField(max_length=255, blank=True, default="")
    shipper = models.ForeignKey(
        Shipper,
        related_name="shipperpickups",
        on_delete=models.DO_NOTHING,
        blank=True,
        null=True,
        default=None,
    )

    from_user = models.ForeignKey(User, related_name="pickup_from_user", on_delete=models.DO_NOTHING)
    from_address = models.ForeignKey(Address, related_name="pickup_from_address", on_delete=models.DO_NOTHING)

    to_user = models.ForeignKey(User, related_name="pickup_to_user", on_delete=models.DO_NOTHING)
    to_address = models.ForeignKey(Address, related_name="pickup_to_address", on_delete=models.DO_NOTHING)

    pickup_scheduled_date = models.DateField(auto_now_add=False)
    pickup_ready_start_time = models.DateTimeField(blank=True, null=True)
    pickup_ready_end_time = models.DateTimeField(blank=True, null=True)

    no_of_packages = models.IntegerField(default=0)

    total_weight = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("1.00"))
    total_invoice_value = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("1.00"))
    fright_charges = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("1.00"))

    pickup_status = models.CharField(
        max_length=255,
        choices=INBOUND_PICKUP_STATUS_CHOICES,
        blank=True,
        null=True,
        default="",
    )

    pickup_mode = models.CharField(
        max_length=50,
        choices=SHIPMENT_MODE_CHOICES,
        default="ROADWAYS_ECONOMY",
    )

    pickup_instruction = models.CharField(max_length=255, blank=True, null=True, default="")
    reason_for_cancellation = models.CharField(max_length=255, blank=True, null=True, default="")

    class Meta:
        ordering = ("-updated_on",)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"PickupRequest #{self.id} - {self.shipper_pkreqid or self.uuid}"


class Package(UUIDModel):
    id = models.BigAutoField(primary_key=True)

    owner = models.ForeignKey(User, related_name="packs", on_delete=models.DO_NOTHING)
    pickup = models.ForeignKey(
        PickupRequest,
        related_name="packages",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        default=None,
    )

    awb_number = models.CharField(max_length=255, blank=False, default="")
    weight_per_package = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("1.00"))

    package_dimension_length = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("1.00"))
    package_dimension_breadth = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("1.00"))
    package_dimension_height = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("1.00"))

    package_category = models.CharField(max_length=255, blank=False, default="")

    hsn_code = models.CharField(max_length=255, blank=False, default="")

    package_name = models.CharField(max_length=255, blank=False, default="")
    package_description = models.CharField(max_length=255, blank=False, default="")

    quantity = models.IntegerField(default=0)

    class Meta:
        ordering = ("-updated_on",)

    def __str__(self):
        return f"Package #{self.id} - {self.package_description}"


class PackageProfile(UUIDModel):
    id = models.BigAutoField(primary_key=True)

    inventory = models.ForeignKey(Product, related_name="package_profiles", on_delete=models.CASCADE)

    package_profile_category = models.CharField(max_length=255, blank=False, default="")
    hsn_code = models.CharField(max_length=255, blank=False, default="")
    package_profile_description = models.CharField(max_length=255, blank=False, default="")

    weight_per_package = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("1.00"))

    package_dimension_length = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("1.00"))
    package_dimension_breadth = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("1.00"))
    package_dimension_height = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("1.00"))

    class Meta:
        ordering = ("-updated_on",)

    def __str__(self):
        return f"{self.package_profile_category} - {self.inventory.name}"
