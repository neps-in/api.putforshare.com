from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models
from django.db.models import Q

from apps.common.models import UUIDModel

from .manager import ActivePhotoManager


class Photo(UUIDModel):
    class UploadStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        UPLOADED = "UPLOADED", "Uploaded"

    id = models.BigAutoField(primary_key=True)
    file_name = models.CharField(max_length=200, blank=True, default="")
    alt_tag = models.CharField(max_length=200, blank=True, default="")
    cdn_url = models.URLField(max_length=500, blank=True, default="")  # Bunny CDN URL
    storage_key = models.CharField(max_length=500, unique=True)  # path in Bunny Storage
    source = models.CharField(max_length=50, blank=True, default="")  # "google", "openlibrary", "manual"
    content_type = models.CharField(max_length=120, blank=True, default="")
    size = models.CharField(max_length=20, blank=True, default="")  # "thumbnail", "small", "medium", "large", "original"
    format = models.CharField(max_length=10, blank=True, default="")  # "webp", "jpeg"
    file_size_bytes = models.PositiveBigIntegerField(null=True, blank=True)
    height = models.PositiveIntegerField(null=True, blank=True)
    width = models.PositiveIntegerField(null=True, blank=True)
    upload_status = models.CharField(max_length=16, choices=UploadStatus.choices, default=UploadStatus.PENDING)
    uploaded_on = models.DateTimeField(null=True, blank=True)
    uploaded_by = models.ForeignKey(
        "users.User",
        related_name="uploaded_photos",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        default=None,
    )

    objects = ActivePhotoManager()
    all_objects = models.Manager()

    class Meta:
        ordering = ("-created_on",)

    def __str__(self):
        return f"Photo {self.uuid}"

    @property
    def effective_url(self):
        return self.cdn_url


class PhotoAttachment(UUIDModel):
    id = models.BigAutoField(primary_key=True)
    photo = models.ForeignKey(Photo, related_name="attachments", on_delete=models.CASCADE)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveBigIntegerField(db_index=True)
    content_object = GenericForeignKey("content_type", "object_id")

    relation_type = models.CharField(max_length=50, default="gallery")
    is_primary = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)

    objects = ActivePhotoManager()
    all_objects = models.Manager()

    class Meta:
        ordering = ("sort_order", "-created_on")
        indexes = [
            models.Index(fields=["content_type", "object_id", "relation_type"]),
            models.Index(fields=["photo", "relation_type"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["photo", "content_type", "object_id", "relation_type"],
                name="photo_attachment_unique_photo_target_relation",
            ),
            models.UniqueConstraint(
                fields=["content_type", "object_id", "relation_type"],
                condition=Q(is_primary=True, is_archived=False),
                name="photo_attachment_one_primary_per_target_relation",
            ),
        ]

    def __str__(self):
        return f"{self.content_type.model}:{self.object_id} -> {self.photo.uuid}"
