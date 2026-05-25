import hashlib
import os
import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone

from apps.common.models import UUIDModel
from .managers import UserManager


class User(UUIDModel, AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = (
        ("ADMIN", "Admin"),
        ("SELLER", "Seller"),
        ("CUSTOMER", "Customer"),
        ("GUEST", "Guest"),
    )

    PLAN_CHOICES = (
        ("SELF_SELL", "Self Sell"),
        ("SMART_SELL", "Smart Sell"),
        ("DONATE_100", "Donate 100%"),
        ("DONATE_50", "Donate 50%"),
    )

    id = models.BigAutoField(primary_key=True)
    full_name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=255, unique=True, blank=True, default="")
    password = models.CharField(max_length=255)

    mobile = models.CharField(max_length=20, blank=True, default="")
    mobile_verified = models.BooleanField(default=False)
    mobile_verified_on = models.DateTimeField(null=True, blank=True)
    favourite_book = models.TextField(blank=True, default="")
    profile_image = models.OneToOneField(
        "photos.Photo",
        related_name="user_profile",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        default=None,
    )

    upi_id = models.CharField(max_length=255, blank=True, default="")
    upi_verified = models.BooleanField(default=False)
    upi_last_verified_on = models.DateTimeField(null=True, blank=True)

    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default="SMART_SELL")
    plan_locked = models.BooleanField(default=False)
    donate_books_option = models.CharField(max_length=20, default="0")

    store_credit = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    net_earnings = models.DecimalField(max_digits=19, decimal_places=2, default=0)

    pfs_role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="GUEST")
    is_staff = models.BooleanField(default=False)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username", "full_name"]

    class Meta:
        ordering = ("-updated_on",)

    def __str__(self) -> str:
        return self.email

    @property
    def inventories(self) -> int:
        return self.products.filter(is_archived=False).count()


class Address(UUIDModel):
    ADDRESS_TYPE_CHOICES = (
        ("RESIDENCE", "Residence"),
        ("OFFICE", "Office"),
    )

    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(User, related_name="addresses", on_delete=models.CASCADE)
    address_name = models.CharField(max_length=120, blank=True, default="")
    full_name = models.CharField(max_length=200, blank=True, default="")
    mobile_num = models.CharField(max_length=20, blank=True, default="")
    
    pincode = models.CharField(max_length=10, default="000000")
    
    # building_name - Flat # , House No, Apartment name
    building_name = models.CharField(max_length=200, blank=True, default="")
    
    # Company Name
    company_name = models.CharField(max_length=200, blank=True, default="")
    
    # area_sector - Area / Colony / Street / Sector / Village
    area_sector = models.CharField(max_length=200, blank=True, default="")

    # Locality
    locality = models.CharField(max_length=200, blank=True, default="")

    # Landmark
    landmark = models.CharField(max_length=200, blank=True, default="")
    
    # Town City
    town_city = models.CharField(max_length=200, blank=True, default="")
    
    # State / Region / Province
    state_region = models.CharField(max_length=200, blank=True, default="")
    
    # address_type: residence (7am to 9pm delivery time) / commercial(7am to 9pm delivery tim
    address_type = models.CharField(max_length=20, choices=ADDRESS_TYPE_CHOICES, default="RESIDENCE")
    
    # Always deliver to this address unless otherwise specified.
    default_shipping_address = models.BooleanField(default=False)
    
    # Always bill to this address
    default_billing_address = models.BooleanField(default=False)

    @property
    def complete_address(self):
        # Dynamic field that is not in the table
        return f"{self.address_name} {os.linesep} " \
               f"{self.building_name} {os.linesep} " \
               f"{self.company_name} {os.linesep}  " \
               f"{self.area_sector} {os.linesep}  " \
               f"Landmark : {self.landmark} {os.linesep}  " \
               f"{self.town_city} {os.linesep} {self.state_region}"
    class Meta:
        ordering = ("-updated_on",)

    def __str__(self) -> str:
        return f"{self.user.email} - {self.pincode}"


class VerificationToken(models.Model):
    class Purpose(models.TextChoices):
        EMAIL_VERIFY = "email_verify", "Email Verification"
        PASSWORD_RESET = "password_reset", "Password Reset"
        EMAIL_CHANGE = "email_change", "Email Change"

    DEFAULT_EXPIRY_MINUTES = {
        Purpose.EMAIL_VERIFY: 24 * 60,
        Purpose.PASSWORD_RESET: 30,
        Purpose.EMAIL_CHANGE: 2 * 60,
    }

    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="verification_tokens",
    )
    purpose = models.CharField(max_length=20, choices=Purpose.choices)
    token_hash = models.CharField(max_length=64, unique=True, db_index=True)
    email = models.EmailField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=["user", "purpose"])]
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return f"{self.user_id}:{self.purpose}"

    def is_valid(self) -> bool:
        return self.used_at is None and self.expires_at > timezone.now()

    def consume(self) -> None:
        self.used_at = timezone.now()
        self.save(update_fields=["used_at"])

    @classmethod
    def create_for(cls, user, purpose, email=None, expiry_minutes=None):
        minutes = expiry_minutes or cls.DEFAULT_EXPIRY_MINUTES[purpose]

        cls.objects.filter(user=user, purpose=purpose, used_at=None).delete()

        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

        instance = cls.objects.create(
            user=user,
            purpose=purpose,
            token_hash=token_hash,
            email=email or user.email,
            expires_at=timezone.now() + timedelta(minutes=minutes),
        )
        return instance, raw_token
