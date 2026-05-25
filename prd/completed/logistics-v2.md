# Logistics app v2

# All model in logistics app is inherited from UUIDModel [x]

# PINCODE Service Check [x]

1.  List all pincodes [x]
2.  CRUD operation [x]
3.  search by ('pincode', 'office_name',
    'division_name', 'region_name',
    'circle_name', 'taluk',
    'district_name', 'state_name') [x]
4.  Pincode model [x] done

```py
    # For GeoCoding
     # sudo apt-get install gdal-bin
    from django.contrib.gis.db import models
    from django.contrib.gis.geos import Point

    class Pincodes(models.Model):

         office_name = models.CharField(max_length=200, blank=True, default='')

         pincode = models.CharField(max_length=16, blank=True, default='')
         office_type = models.CharField(max_length=200, blank=True, default='')
         delivery_status = models.CharField(max_length=200, blank=True, default='')
         division_name = models.CharField(max_length=200, blank=True, default='')
         region_name = models.CharField(max_length=200, blank=True, default='')
         circle_name = models.CharField(max_length=200, blank=True, default='')
         taluk = models.CharField(max_length=200, blank=True, default='')
         district_name = models.CharField(max_length=200, blank=True, default='')
         state_name = models.CharField(max_length=200, blank=True, default='')
         state_short_name = models.CharField(max_length=200, blank=True, default='')
         telephone = models.CharField(max_length=20, blank=True, default='')
         alternate_telephone = models.CharField(
             max_length=20, blank=True, default='')
         mobile_number = models.CharField(max_length=20, blank=True, default='')
         head_post_master = models.CharField(max_length=255, blank=True, default='')
         head_post_master_mobile_number = models.CharField(
             max_length=255, blank=True, default='')
         related_suboffice = models.CharField(
             max_length=200, blank=True, default='')
         related_headoffice = models.CharField(
             max_length=200, blank=True, default='')
         post_office_address = models.TextField(blank=True, default='')
         # For Plus code https://maps.google.com/pluscodes/
         plus_code = models.CharField(max_length=255, blank=True, default='')
         po_latitude = models.PointField(geography=True, default=Point(0.0, 0.0))
         po_longitude = models.PointField(geography=True, default=Point(0.0, 0.0))

         # These lat, long can be discarded,
         longitude = models.CharField(max_length=50, blank=True, default='')
         latitude = models.CharField(max_length=50, blank=True, default='')

         # Service Unavailable temporarily due to emergency
         # protocol from the GOVT.
         embargo = models.BooleanField(default=False)

         # Some remarks when updating the pincode details
         remark = models.CharField(
             max_length=255, blank=True, default='', null=True)
         archived = models.BooleanField(default=False)

         class Meta:
             ordering = ('-updated_on', 'office_name', 'pincode')
             verbose_name_plural = "pincodes"

```

4. Shipper Model inherited from uuidmodel [x]

```py
class Shipper():

    id = models.BigAutoField(primary_key=True)

    # FK To User table from Shipment Tbl
    owner = models.ForeignKey(User, related_name='shipperowner',
                              on_delete=models.DO_NOTHING, null=True, default='')
    shipper_shortname = models.CharField(
        max_length=255, blank=False, default='')
    shipper_name = models.CharField(max_length=255, blank=False, default='')
    shipper_account_number = models.CharField(
        max_length=255, blank=False, default='')
    shipper_account_name = models.CharField(
        max_length=255, blank=False, default='')

    def __str__(self):
        # Prefer description if available, otherwise show an ID fallback
        return f"Shipper #{self.id} - {self.shipper_shortname}"

    class Meta:
        ordering = ('-updated_on',)
```

# 5. Package Model [x]

```py
class Package(models.Model):

    id = models.BigAutoField(primary_key=True)

    # FK To User table from Package Tbl.
    # One user - many packages
    owner = models.ForeignKey(User), related_name='packs',

    # FK to Pickup Request
    # One pickup req - many packages
    pickup = models.ForeignKey(PickupRequest)

    # later this will be used
    awb_number = models.CharField(max_length=255, blank=False, default='')

    # Weight in Kg
    weight_per_package = models.DecimalField(
        max_digits=10, decimal_places=2, default='1.00')

    # Dimension in CM
    package_dimension_length = models.DecimalField(
        max_digits=10, decimal_places=2, default='1.00')
    package_dimension_breadth = models.DecimalField(
        max_digits=10, decimal_places=2, default='1.00')
    package_dimension_height = models.DecimalField(
        max_digits=10, decimal_places=2, default='1.00')

    # Predefined content
    package_category = models.CharField(
        max_length=255, blank=False, default='')

    hsn_code = models.CharField(max_length=255, blank=False, default='')
    # Removed
    # package_content = models.CharField(max_length=255, blank=False, default='')

    # Something narrative
    package_name = models.CharField(
        max_length=255, blank=False, default='')

    package_description = models.CharField(
        max_length=255, blank=False, default='')

    # No of books/items in the package
    quantity = models.IntegerField(default='0')

    def __str__(self):
        # Prefer description if available, otherwise show an ID fallback
        return f"Package #{self.id} - {self.package_description}"

    class Meta:
        ordering = ('-updated_at',)
```

# 6. Pickup Request Model [x]

```py
class PickupRequest(models.Model):
    id = models.BigAutoField(primary_key=True)

    # FK To User table from Pickuo Request Tbl
    owner = models.ForeignKey(User)

    # Pickup Request ID generated by Shipper's System
    shipper_pkreqid = models.CharField(max_length=255, blank=True, default='')

    # FK to Shipper model - One shipper - many pickup req
    shipper = models.ForeignKey(Shipper), related_name='shipperpickups',
                                on_delete=models.DO_NOTHING, blank=True, null=True, default='')

    # awb_number: ( FK to shipment table)
    # awb_number = models.CharField(
    #     max_length=255, blank=True, null=True, default='')

    from_user = models.ForeignKey(User)
    from_address = models.ForeignKey(Address)

    # FK to user
    to_user = models.ForeignKey(User)
    to_address = models.ForeignKey(Address)

    pickup_scheduled_date = models.DateField(auto_now_add=False)
    pickup_ready_start_time = models.DateTimeField(blank=True, null=True)
    pickup_ready_end_time = models.DateTimeField(blank=True, null=True)

    # packages - One pickup req has many packages

    no_of_packages = models.IntegerField(default=0)

    total_weight = models.DecimalField(
        max_digits=10, decimal_places=2, default='1.00')

    total_invoice_value = models.DecimalField(
        max_digits=10, decimal_places=2, default='1.00')

    fright_charges = models.DecimalField(
        max_digits=10, decimal_places=2, default='1.00')

    pickup_status = models.CharField(max_length=255, choices=settings.INBOUND_PICKUP_STATUS_CHOICES,
                              blank=True, null=True, default='')

    pickup_mode = models.CharField(
        max_length=50,
        choices=settings.SHIPMENT_MODE_CHOICES,
        default='ROADWAYS_ECONOMY'
    )

    # Any pickup instructions for the audience
    pickup_instruction = models.CharField(
        max_length=255, blank=True, null=True, default='')

    # In the frontend ask only if the choice selected by
    # the user is request for calcellation
    reason_for_cancellation = models.CharField(
        max_length=255, blank=True, null=True, default='')
    # def clean(self):
    # Ensure pickup_scheduled_for is greater than pickup_created_at
    # Generally.

    #     if self.pickup_scheduled_date <= created_on_date or \
    #             self.pickup_scheduled_date <= last_modified_on_date:
    #         raise ValidationError({
    #             'pickup_scheduled_date': 'Pickup scheduled date must be atleast one day after the date of creation(today). Please contact support phone number in that case immediately to prioritize your pickup.'
    #         })

    #     if self.from_user == self.to_user:
    #         raise ValidationError({
    #             'to_user': 'Make sure from user and to user are different.'
    #         })

    #     if self.from_address == self.to_address:
    #         raise ValidationError({
    #             'from_address': 'Make sure From address and to address are different.'
    #         })

    # if self.no_of_packages <= 0:
    #     raise ValidationError({
    #         'no_of_packages': 'Make sure you have added at least one package.'
    #     })

    def save(self, *args, **kwargs):
        # Run full_clean before saving to ensure validations are applied
        # And report the error in the frontend
        self.full_clean()
        super().save(*args, **kwargs)

```

# PackageProfile model [x]

```py
class PackageProfile(models.Model):

    id = models.BigAutoField(primary_key=True)

    # For now
    # FK to inventory model
    # later once catalog model is built
    # it can be related to catalog
    inventory - FK to inventory model

    # Can be applied to ine category
    package_profile_category = models.CharField(
        max_length=255, blank=False, default='')

    hsn_code = models.CharField(max_length=255, blank=False, default='')

    # Something narrative
    package_profile_description = models.CharField(
        max_length=255, blank=False, default='')

    # Weight in grams of single unit item
    weight_per_package = models.DecimalField(
        max_digits=10, decimal_places=2, default='1.00')

    # Dimension in cm and grams
    package_dimension_length = models.DecimalField(
        max_digits=10, decimal_places=2, default='1.00')
    package_dimension_breadth = models.DecimalField(
        max_digits=10, decimal_places=2, default='1.00')
    package_dimension_height = models.DecimalField(
        max_digits=10, decimal_places=2, default='1.00')


```
