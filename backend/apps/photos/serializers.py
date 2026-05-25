from django.core.files.images import get_image_dimensions
from django.utils import timezone
from django.contrib.contenttypes.models import ContentType
from rest_framework import serializers
from taggit.models import Tag

from apps.inventory.models import Author, Book, Category, Product, Publisher, Soap
from apps.users.models import User

from .models import Photo, PhotoAttachment
from .storage import PhotoStorageError, store_uploaded_file

TARGET_MODEL_MAP = {
    "user": (User, "uuid"),
    "product": (Product, "uuid"),
    "book": (Book, "uuid"),
    "soap": (Soap, "uuid"),
    "author": (Author, "uuid"),
    "publisher": (Publisher, "uuid"),
    "category": (Category, "uuid"),
    "tag": (Tag, "slug"),
}

DEFAULT_RELATION_BY_TARGET = {
    "user": "profile",
    "author": "profile",
    "publisher": "profile",
    "category": "profile",
    "tag": "profile",
    "product": "gallery",
    "book": "gallery",
    "soap": "gallery",
}

SINGLE_RELATION_TYPES = {"profile", "cover", "thumbnail"}


def resolve_target_instance(target_type, target_uuid=None, target_slug=None):
    model_tuple = TARGET_MODEL_MAP.get(target_type)
    if not model_tuple:
        raise serializers.ValidationError({"target_type": ["Unsupported target type."]})

    model_class, lookup_field = model_tuple
    queryset = model_class.objects.all()
    if "is_archived" in [field.name for field in model_class._meta.fields]:
        queryset = queryset.filter(is_archived=False)

    if lookup_field == "uuid":
        if not target_uuid:
            raise serializers.ValidationError({"target_uuid": ["This field is required for this target_type."]})
        lookup_value = target_uuid
    else:
        if not target_slug:
            raise serializers.ValidationError({"target_slug": ["This field is required for this target_type."]})
        lookup_value = target_slug

    instance = queryset.filter(**{lookup_field: lookup_value}).first()
    if not instance:
        raise serializers.ValidationError({"target": ["Target object not found."]})

    content_type = ContentType.objects.get_for_model(model_class)
    return instance, content_type


class PhotoSerializer(serializers.ModelSerializer):
    effective_url = serializers.CharField(read_only=True)
    file = serializers.FileField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Photo
        fields = [
            "uuid",
            "file_name",
            "alt_tag",
            "cdn_url",
            "effective_url",
            "storage_key",
            "content_type",
            "file_size_bytes",
            "height",
            "width",
            "upload_status",
            "uploaded_on",
            "is_active",
            "created_on",
            "updated_on",
            "file",
        ]
        read_only_fields = [
            "uuid",
            "created_on",
            "updated_on",
        ]
        extra_kwargs = {
            "storage_key": {"required": False, "allow_blank": True},
            "cdn_url": {"required": False, "allow_blank": True},
            "content_type": {"required": False, "allow_blank": True},
            "upload_status": {"required": False},
            "uploaded_on": {"required": False, "allow_null": True},
        }

    def create(self, validated_data):
        uploaded_file = validated_data.pop("file", None)
        if uploaded_file:
            if hasattr(uploaded_file, "seek"):
                uploaded_file.seek(0)
            width, height = get_image_dimensions(uploaded_file)
            if hasattr(uploaded_file, "seek"):
                uploaded_file.seek(0)
            try:
                saved_key, public_url = store_uploaded_file(uploaded_file)
            except PhotoStorageError as exc:
                raise serializers.ValidationError({"file": [str(exc)]}) from exc
            validated_data["storage_key"] = saved_key
            validated_data["cdn_url"] = public_url
            validated_data["content_type"] = str(getattr(uploaded_file, "content_type", "") or "")
            validated_data["file_size_bytes"] = int(getattr(uploaded_file, "size", 0) or 0) or None
            validated_data["width"] = int(width) if width else None
            validated_data["height"] = int(height) if height else None
            validated_data["upload_status"] = Photo.UploadStatus.UPLOADED
            validated_data["uploaded_on"] = timezone.now()
            if not validated_data.get("file_name"):
                validated_data["file_name"] = str(getattr(uploaded_file, "name", "") or "")
        elif not validated_data.get("storage_key"):
            raise serializers.ValidationError({"file": ["Upload an image file or provide storage_key."]})
        return super().create(validated_data)

    def update(self, instance, validated_data):
        uploaded_file = validated_data.pop("file", None)
        if uploaded_file:
            if hasattr(uploaded_file, "seek"):
                uploaded_file.seek(0)
            width, height = get_image_dimensions(uploaded_file)
            if hasattr(uploaded_file, "seek"):
                uploaded_file.seek(0)
            try:
                saved_key, public_url = store_uploaded_file(uploaded_file)
            except PhotoStorageError as exc:
                raise serializers.ValidationError({"file": [str(exc)]}) from exc
            validated_data["storage_key"] = saved_key
            validated_data["cdn_url"] = public_url
            validated_data["content_type"] = str(getattr(uploaded_file, "content_type", "") or "")
            validated_data["file_size_bytes"] = int(getattr(uploaded_file, "size", 0) or 0) or None
            validated_data["width"] = int(width) if width else None
            validated_data["height"] = int(height) if height else None
            validated_data["upload_status"] = Photo.UploadStatus.UPLOADED
            validated_data["uploaded_on"] = timezone.now()
            if not validated_data.get("file_name"):
                validated_data["file_name"] = str(getattr(uploaded_file, "name", "") or "")
        return super().update(instance, validated_data)


class PresignUploadSerializer(serializers.Serializer):
    file_name = serializers.CharField(max_length=255)
    content_type = serializers.CharField(max_length=120)
    file_size_bytes = serializers.IntegerField(min_value=1, required=False)
    alt_tag = serializers.CharField(max_length=200, required=False, allow_blank=True)

    def validate_content_type(self, value):
        normalized = value.strip().lower()
        if not normalized.startswith("image/"):
            raise serializers.ValidationError("Only image uploads are supported.")

        allowed_types = self.context.get("allowed_types") or []
        if allowed_types and normalized not in allowed_types:
            raise serializers.ValidationError("This image type is not allowed.")
        return normalized

    def validate_file_size_bytes(self, value):
        max_bytes = self.context.get("max_upload_bytes")
        if max_bytes and value > max_bytes:
            raise serializers.ValidationError(f"File size exceeds the allowed limit of {max_bytes} bytes.")
        return value


class MarkUploadedSerializer(serializers.Serializer):
    alt_tag = serializers.CharField(max_length=200, required=False, allow_blank=True)
    content_type = serializers.CharField(max_length=120, required=False, allow_blank=True)
    file_size_bytes = serializers.IntegerField(min_value=1, required=False)
    width = serializers.IntegerField(min_value=1, required=False)
    height = serializers.IntegerField(min_value=1, required=False)
    cdn_url = serializers.URLField(max_length=500, required=False, allow_blank=True)


class PhotoAttachmentSerializer(serializers.ModelSerializer):
    photo = PhotoSerializer(read_only=True)
    target_type = serializers.CharField(source="content_type.model", read_only=True)

    class Meta:
        model = PhotoAttachment
        fields = [
            "uuid",
            "photo",
            "target_type",
            "object_id",
            "relation_type",
            "is_primary",
            "sort_order",
            "created_on",
            "updated_on",
        ]
        read_only_fields = ["uuid", "created_on", "updated_on"]


class AttachPhotoSerializer(serializers.Serializer):
    target_type = serializers.ChoiceField(choices=sorted(TARGET_MODEL_MAP.keys()))
    target_uuid = serializers.UUIDField(required=False)
    target_slug = serializers.SlugField(required=False)
    relation_type = serializers.CharField(max_length=50, required=False, allow_blank=True)
    sort_order = serializers.IntegerField(min_value=0, required=False, default=0)
    is_primary = serializers.BooleanField(required=False, default=False)
    replace_existing = serializers.BooleanField(required=False, default=False)

    def validate(self, attrs):
        target_type = attrs["target_type"]
        relation_type = attrs.get("relation_type", "").strip().lower()
        if not relation_type:
            relation_type = DEFAULT_RELATION_BY_TARGET[target_type]
            attrs["relation_type"] = relation_type
        return attrs


class TargetPhotosQuerySerializer(serializers.Serializer):
    target_type = serializers.ChoiceField(choices=sorted(TARGET_MODEL_MAP.keys()))
    target_uuid = serializers.UUIDField(required=False)
    target_slug = serializers.SlugField(required=False)
    relation_type = serializers.CharField(max_length=50, required=False, allow_blank=True)
