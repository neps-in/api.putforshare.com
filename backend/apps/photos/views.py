from django.conf import settings
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Photo, PhotoAttachment
from .serializers import (
    AttachPhotoSerializer,
    MarkUploadedSerializer,
    PhotoAttachmentSerializer,
    PhotoSerializer,
    PresignUploadSerializer,
    SINGLE_RELATION_TYPES,
    TargetPhotosQuerySerializer,
    resolve_target_instance,
)
from .storage import (
    generate_presigned_upload,
    get_photo_storage_backend,
)


class PhotoViewSet(viewsets.ModelViewSet):
    serializer_class = PhotoSerializer
    lookup_field = "uuid"
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["file_name", "alt_tag", "storage_key", "content_type", "cdn_url"]
    ordering_fields = ["file_name", "upload_status", "created_on", "updated_on", "uploaded_on", "file_size_bytes"]
    ordering = ["-created_on"]

    def get_queryset(self):
        queryset = Photo.objects.all().order_by("-created_on")
        user = self.request.user
        if not user or not user.is_authenticated:
            return queryset.none()
        if getattr(user, "pfs_role", "") == "ADMIN":
            return queryset
        return queryset.filter(uploaded_by=user)

    def get_permissions(self):
        if self.action in {"list", "retrieve", "by_target"}:
            return [AllowAny()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(uploaded_by=user if user and user.is_authenticated else None)

    @action(detail=False, methods=["post"], url_path="presign-upload")
    def presign_upload(self, request):
        if get_photo_storage_backend() != "s3":
            return Response(
                {"detail": "Presigned uploads are only available when PHOTO_STORAGE_BACKEND is set to s3."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        allowed_types = [item.strip().lower() for item in getattr(settings, "PHOTO_ALLOWED_CONTENT_TYPES", []) if item.strip()]
        serializer = PresignUploadSerializer(
            data=request.data,
            context={
                "allowed_types": allowed_types,
                "max_upload_bytes": int(getattr(settings, "PHOTO_MAX_UPLOAD_BYTES", 10 * 1024 * 1024)),
            },
        )
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data

        upload_data = generate_presigned_upload(validated["file_name"], validated["content_type"])
        photo = Photo.objects.create(
            file_name=validated["file_name"],
            alt_tag=validated.get("alt_tag", ""),
            storage_key=upload_data["key"],
            cdn_url=upload_data["public_url"],
            content_type=validated["content_type"],
            file_size_bytes=validated.get("file_size_bytes"),
            uploaded_by=request.user,
        )

        return Response(
            {
                "photo": PhotoSerializer(photo).data,
                "upload": {
                    "url": upload_data["upload_url"],
                    "method": upload_data["method"],
                    "headers": upload_data["headers"],
                    "expires_in": upload_data["expires_in"],
                },
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="mark-uploaded")
    def mark_uploaded(self, request, uuid=None):
        photo = self.get_object()
        user = request.user
        if getattr(user, "pfs_role", "") != "ADMIN" and photo.uploaded_by_id and photo.uploaded_by_id != user.id:
            return Response({"detail": "You do not have permission to update this photo."}, status=status.HTTP_403_FORBIDDEN)

        serializer = MarkUploadedSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        updates = serializer.validated_data

        for field_name, field_value in updates.items():
            setattr(photo, field_name, field_value)
        photo.upload_status = Photo.UploadStatus.UPLOADED
        photo.uploaded_on = timezone.now()
        photo.save()

        return Response({"photo": PhotoSerializer(photo).data})

    @action(detail=True, methods=["post"], url_path="attach")
    def attach(self, request, uuid=None):
        photo = self.get_object()
        serializer = AttachPhotoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        target_instance, target_content_type = resolve_target_instance(
            payload["target_type"],
            target_uuid=payload.get("target_uuid"),
            target_slug=payload.get("target_slug"),
        )

        relation_type = payload["relation_type"].strip().lower()
        replace_existing = payload.get("replace_existing", False) or relation_type in SINGLE_RELATION_TYPES
        if replace_existing:
            PhotoAttachment.objects.filter(
                content_type=target_content_type,
                object_id=target_instance.pk,
                relation_type=relation_type,
            ).update(is_archived=True, updated_on=timezone.now())

        attachment, _ = PhotoAttachment.all_objects.get_or_create(
            photo=photo,
            content_type=target_content_type,
            object_id=target_instance.pk,
            relation_type=relation_type,
            defaults={
                "is_primary": payload.get("is_primary", False),
                "sort_order": payload.get("sort_order", 0),
                "is_archived": False,
            },
        )

        if attachment.is_archived:
            attachment.is_archived = False
        attachment.is_primary = payload.get("is_primary", False)
        attachment.sort_order = payload.get("sort_order", 0)
        attachment.save()

        if attachment.is_primary:
            PhotoAttachment.objects.filter(
                content_type=target_content_type,
                object_id=target_instance.pk,
                relation_type=relation_type,
                is_primary=True,
            ).exclude(pk=attachment.pk).update(is_primary=False, updated_on=timezone.now())

        return Response({"attachment": PhotoAttachmentSerializer(attachment).data}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="detach")
    def detach(self, request, uuid=None):
        photo = self.get_object()
        serializer = AttachPhotoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        target_instance, target_content_type = resolve_target_instance(
            payload["target_type"],
            target_uuid=payload.get("target_uuid"),
            target_slug=payload.get("target_slug"),
        )

        relation_type = payload["relation_type"].strip().lower()
        queryset = PhotoAttachment.objects.filter(
            photo=photo,
            content_type=target_content_type,
            object_id=target_instance.pk,
        )
        if relation_type:
            queryset = queryset.filter(relation_type=relation_type)

        detached = 0
        for attachment in queryset:
            attachment.delete()
            detached += 1

        return Response({"detail": f"Detached {detached} link(s)."})

    @action(detail=False, methods=["get"], url_path="by-target")
    def by_target(self, request):
        query_serializer = TargetPhotosQuerySerializer(data=request.query_params)
        query_serializer.is_valid(raise_exception=True)
        payload = query_serializer.validated_data

        target_instance, target_content_type = resolve_target_instance(
            payload["target_type"],
            target_uuid=payload.get("target_uuid"),
            target_slug=payload.get("target_slug"),
        )

        relation_type = (payload.get("relation_type") or "").strip().lower()
        attachments = PhotoAttachment.objects.select_related("photo").filter(
            content_type=target_content_type,
            object_id=target_instance.pk,
            photo__upload_status=Photo.UploadStatus.UPLOADED,
        )
        if relation_type:
            attachments = attachments.filter(relation_type=relation_type)
        attachments = attachments.order_by("-is_primary", "sort_order", "-created_on")

        return Response({"results": PhotoAttachmentSerializer(attachments, many=True).data})
