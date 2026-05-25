from django.contrib import admin

from .models import Photo, PhotoAttachment


@admin.register(Photo)
class PhotoAdmin(admin.ModelAdmin):
    list_display = ("uuid", "file_name", "upload_status", "uploaded_by", "created_on", "is_archived")
    search_fields = ("uuid", "file_name", "alt_tag", "storage_key")
    list_filter = ("upload_status", "is_archived", "is_active")


@admin.register(PhotoAttachment)
class PhotoAttachmentAdmin(admin.ModelAdmin):
    list_display = ("uuid", "photo", "content_type", "object_id", "relation_type", "is_primary", "is_archived")
    search_fields = ("uuid", "photo__uuid", "relation_type", "object_id")
    list_filter = ("content_type", "relation_type", "is_primary", "is_archived")
