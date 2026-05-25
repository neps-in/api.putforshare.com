from django.db.models import Sum
from rest_framework import serializers

from apps.users.models import Address, User

from .models import Package, PackageProfile, PickupRequest, Pincode, Shipper


class PincodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pincode
        fields = "__all__"


class ShipperSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shipper
        fields = "__all__"


class PickupRequestSerializer(serializers.ModelSerializer):
    packages = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Package.objects.filter(is_archived=False),
        required=False,
    )
    from_address_display = serializers.SerializerMethodField()
    to_address_display = serializers.SerializerMethodField()

    class Meta:
        model = PickupRequest
        fields = "__all__"
        read_only_fields = ("owner", "from_user", "to_user", "to_address", "no_of_packages")

    def _format_address(self, address):
        if not address:
            return ""
        return ", ".join(
            [
                part
                for part in (
                    address.full_name,
                    address.building_name,
                    address.area_sector,
                    address.town_city,
                    address.state_region,
                    address.pincode,
                )
                if part
            ]
        )

    def get_from_address_display(self, obj):
        return self._format_address(getattr(obj, "from_address", None))

    def get_to_address_display(self, obj):
        return self._format_address(getattr(obj, "to_address", None))

    def _resolve_destination(self):
        admin_user = User.objects.filter(email__iexact="admin@putforshare.com", is_archived=False).first()
        if not admin_user:
            raise serializers.ValidationError(
                {"to_user": "Destination admin user with email admin@putforshare.com is not available."}
            )

        admin_address = (
            Address.objects.filter(user=admin_user, is_archived=False)
            .order_by("-default_shipping_address", "-updated_on")
            .first()
        )
        if not admin_address:
            raise serializers.ValidationError(
                {"to_address": "Destination address for admin@putforshare.com is not available."}
            )
        return admin_user, admin_address

    def validate_from_address(self, value):
        request = self.context.get("request")
        if not request:
            return value

        user = request.user
        if value.user_id != user.id:
            raise serializers.ValidationError("Select an address created by the current user.")
        if value.is_archived:
            raise serializers.ValidationError("Selected address is archived.")
        return value


class AdminPickupRequestSerializer(serializers.ModelSerializer):
    packages = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Package.objects.filter(is_archived=False),
        required=False,
    )
    owner_uuid = serializers.SlugRelatedField(
        source="owner",
        slug_field="uuid",
        queryset=User.objects.filter(is_archived=False),
        required=False,
        allow_null=True,
    )
    from_user_uuid = serializers.SlugRelatedField(
        source="from_user",
        slug_field="uuid",
        queryset=User.objects.filter(is_archived=False),
    )
    to_user_uuid = serializers.SlugRelatedField(
        source="to_user",
        slug_field="uuid",
        queryset=User.objects.filter(is_archived=False),
    )
    from_address_uuid = serializers.SlugRelatedField(
        source="from_address",
        slug_field="uuid",
        queryset=Address.objects.filter(is_archived=False),
    )
    to_address_uuid = serializers.SlugRelatedField(
        source="to_address",
        slug_field="uuid",
        queryset=Address.objects.filter(is_archived=False),
    )
    owner_email = serializers.SerializerMethodField()
    from_user_email = serializers.SerializerMethodField()
    to_user_email = serializers.SerializerMethodField()
    from_user_username = serializers.SerializerMethodField()
    from_user_full_name = serializers.SerializerMethodField()
    from_user_mobile = serializers.SerializerMethodField()
    from_address_display = serializers.SerializerMethodField()
    to_address_display = serializers.SerializerMethodField()

    class Meta:
        model = PickupRequest
        fields = "__all__"
        read_only_fields = ("no_of_packages",)
        extra_kwargs = {
            "owner": {"read_only": True},
            "from_user": {"read_only": True},
            "to_user": {"read_only": True},
            "from_address": {"read_only": True},
            "to_address": {"read_only": True},
        }

    def _format_address(self, address):
        if not address:
            return ""
        return ", ".join(
            [
                part
                for part in (
                    address.full_name,
                    address.building_name,
                    address.area_sector,
                    address.town_city,
                    address.state_region,
                    address.pincode,
                )
                if part
            ]
        )

    def get_from_address_display(self, obj):
        return self._format_address(getattr(obj, "from_address", None))

    def get_to_address_display(self, obj):
        return self._format_address(getattr(obj, "to_address", None))

    def get_owner_email(self, obj):
        return getattr(obj.owner, "email", "") if obj.owner_id else ""

    def get_from_user_email(self, obj):
        return getattr(obj.from_user, "email", "") if obj.from_user_id else ""

    def get_to_user_email(self, obj):
        return getattr(obj.to_user, "email", "") if obj.to_user_id else ""

    def get_from_user_username(self, obj):
        return getattr(obj.from_user, "username", "") if obj.from_user_id else ""

    def get_from_user_full_name(self, obj):
        return getattr(obj.from_user, "full_name", "") if obj.from_user_id else ""

    def get_from_user_mobile(self, obj):
        return getattr(obj.from_user, "mobile", "") if obj.from_user_id else ""

    def validate_packages(self, value):
        request = self.context.get("request")
        user = request.user if request else None
        instance = getattr(self, "instance", None)

        package_ids = [package.id for package in value]
        if len(package_ids) != len(set(package_ids)):
            raise serializers.ValidationError("Duplicate packages are not allowed.")

        for package in value:
            if user and package.owner_id != user.id:
                raise serializers.ValidationError("Select only packages created by the current user.")
            if package.is_archived:
                raise serializers.ValidationError("One or more selected packages are archived.")
            if package.pickup_id and (not instance or package.pickup_id != instance.id):
                raise serializers.ValidationError("One or more selected packages are already linked to another pickup.")

        return value

    def validate(self, attrs):
        request = self.context.get("request")
        if not request:
            return attrs

        user = request.user
        instance = getattr(self, "instance", None)
        packages = attrs.get("packages")
        from_address = attrs.get("from_address") or (instance.from_address if instance else None)

        if instance is None and not packages:
            raise serializers.ValidationError({"packages": "Select at least one package."})
        if packages is not None and not packages:
            raise serializers.ValidationError({"packages": "Select at least one package."})

        admin_user, admin_address = self._resolve_destination()
        attrs["_destination_admin_user"] = admin_user
        attrs["_destination_admin_address"] = admin_address

        if from_address and admin_address.id == from_address.id:
            raise serializers.ValidationError({"from_address": "from_address and to_address should not be the same address."})

        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        user = request.user
        packages = validated_data.pop("packages", [])
        admin_user = validated_data.pop("_destination_admin_user", None)
        admin_address = validated_data.pop("_destination_admin_address", None)
        if not admin_user or not admin_address:
            admin_user, admin_address = self._resolve_destination()

        pickup = PickupRequest.objects.create(
            owner=user,
            from_user=user,
            to_user=admin_user,
            to_address=admin_address,
            no_of_packages=len(packages),
            **validated_data,
        )

        if packages:
            package_ids = [package.id for package in packages]
            Package.objects.filter(id__in=package_ids).update(pickup=pickup)
            total_weight = Package.objects.filter(id__in=package_ids).aggregate(total=Sum("weight_per_package"))["total"]
            if total_weight is not None:
                pickup.total_weight = total_weight
                pickup.save(update_fields=["total_weight", "updated_on"])

        return pickup

    def update(self, instance, validated_data):
        request = self.context["request"]
        user = request.user
        packages = validated_data.pop("packages", None)
        admin_user = validated_data.pop("_destination_admin_user", None)
        admin_address = validated_data.pop("_destination_admin_address", None)
        if not admin_user or not admin_address:
            admin_user, admin_address = self._resolve_destination()

        validated_data["from_user"] = user
        validated_data["to_user"] = admin_user
        validated_data["to_address"] = admin_address

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if packages is not None:
            previous_packages = Package.objects.filter(pickup=instance, is_archived=False)
            previous_packages.exclude(id__in=[package.id for package in packages]).update(pickup=None)
            Package.objects.filter(id__in=[package.id for package in packages]).update(pickup=instance)

            instance.no_of_packages = len(packages)
            total_weight = Package.objects.filter(id__in=[package.id for package in packages]).aggregate(
                total=Sum("weight_per_package")
            )["total"]
            if total_weight is not None:
                instance.total_weight = total_weight
            instance.save(update_fields=["no_of_packages", "total_weight", "updated_on"])

        return instance


class PackageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Package
        fields = "__all__"
        read_only_fields = ("owner",)
        extra_kwargs = {
            "pickup": {"required": False, "allow_null": True},
            "awb_number": {"required": False, "allow_blank": True},
            "package_category": {"required": False, "allow_blank": True},
            "hsn_code": {"required": False, "allow_blank": True},
        }


class AdminPackageSerializer(serializers.ModelSerializer):
    owner_uuid = serializers.SlugRelatedField(
        source="owner",
        slug_field="uuid",
        queryset=User.objects.filter(is_archived=False),
    )
    pickup_uuid = serializers.SlugRelatedField(
        source="pickup",
        slug_field="uuid",
        queryset=PickupRequest.objects.filter(is_archived=False),
        required=False,
        allow_null=True,
    )
    owner_email = serializers.SerializerMethodField()

    class Meta:
        model = Package
        fields = "__all__"
        extra_kwargs = {
            "owner": {"read_only": True},
            "pickup": {"read_only": True},
            "awb_number": {"required": False, "allow_blank": True},
            "package_category": {"required": False, "allow_blank": True},
            "hsn_code": {"required": False, "allow_blank": True},
        }

    def get_owner_email(self, obj):
        return getattr(obj.owner, "email", "") if obj.owner_id else ""


class PackageProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = PackageProfile
        fields = "__all__"
