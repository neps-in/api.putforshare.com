from django.db.models import Q
from django.http import HttpResponse
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated

from apps.api.permissions import IsAdminRole

from .labels import render_shipping_labels_html
from .models import Package, PackageProfile, PickupRequest, Pincode, Shipper
from .serializers import (
    PackageProfileSerializer,
    PackageSerializer,
    PickupRequestSerializer,
    PincodeSerializer,
    ShipperSerializer,
)


class PincodeViewSet(viewsets.ModelViewSet):
    serializer_class = PincodeSerializer
    lookup_field = "uuid"
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = (
        "pincode",
        "office_name",
        "office_type",
        "division_name",
        "region_name",
        "circle_name",
        "taluk",
        "district_name",
        "state_name",
        "region",
        "metro",
        "state_short_name",
        "related_suboffice",
        "related_headoffice",
    )
    ordering_fields = ("updated_on", "office_name", "pincode", "region", "metro")

    def get_queryset(self):
        queryset = Pincode.objects.filter(is_archived=False)

        region = (self.request.query_params.get("region") or "").strip()
        if region:
            queryset = queryset.filter(region__iexact=region)

        metro_raw = (self.request.query_params.get("metro") or "").strip().lower()
        if metro_raw in {"1", "true", "yes", "y"}:
            queryset = queryset.filter(metro=True)
        elif metro_raw in {"0", "false", "no", "n"}:
            queryset = queryset.filter(metro=False)

        return queryset

    def get_permissions(self):
        if self.request.method in {"GET", "HEAD", "OPTIONS"}:
            return [AllowAny()]
        return [IsAdminRole()]


class ShipperViewSet(viewsets.ModelViewSet):
    serializer_class = ShipperSerializer
    lookup_field = "uuid"
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Shipper.objects.filter(is_archived=False)
        user = self.request.user
        if user.pfs_role == "ADMIN":
            return queryset
        return queryset.filter(owner=user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class PickupRequestViewSet(viewsets.ModelViewSet):
    serializer_class = PickupRequestSerializer
    lookup_field = "uuid"
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = PickupRequest.objects.filter(is_archived=False)
        user = self.request.user
        if user.pfs_role == "ADMIN":
            return queryset
        return queryset.filter(Q(owner=user) | Q(from_user=user) | Q(to_user=user)).distinct()

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=True, methods=["get"], url_path="shipping-labels")
    def shipping_labels(self, request, uuid=None):
        pickup = self.get_object()
        label_type = (request.query_params.get("type") or "all").strip().lower()
        paper_size = (request.query_params.get("paper") or "a4").strip().lower()
        valid_types = {"all", "summary", "individual"}
        valid_paper_sizes = {"a4", "4x6"}
        if label_type not in valid_types:
            raise ValidationError({"type": "Invalid type. Allowed values: all, summary, individual."})
        if paper_size not in valid_paper_sizes:
            raise ValidationError({"paper": "Invalid paper size. Allowed values: a4, 4x6."})

        packages = list(
            pickup.packages.filter(is_archived=False)
            .select_related("owner", "pickup")
            .order_by("id")
        )
        html = render_shipping_labels_html(
            pickup=pickup,
            packages=packages,
            label_type=label_type,
            paper_size=paper_size,
        )

        response = HttpResponse(html, content_type="text/html; charset=utf-8")
        response["Content-Disposition"] = (
            f'inline; filename="pickup-{pickup.id}-shipping-labels-{label_type}-{paper_size}.html"'
        )
        return response


class PackageViewSet(viewsets.ModelViewSet):
    serializer_class = PackageSerializer
    lookup_field = "uuid"
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Package.objects.filter(is_archived=False, owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class PackageProfileViewSet(viewsets.ModelViewSet):
    serializer_class = PackageProfileSerializer
    lookup_field = "uuid"
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = PackageProfile.objects.filter(is_archived=False)
        user = self.request.user
        if user.pfs_role == "ADMIN":
            return queryset
        return queryset.filter(inventory__seller=user)
