from botocore.exceptions import ClientError
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from rest_framework import status, viewsets
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.photos.storage import build_public_url, get_bucket_name, get_s3_client

from .serializers import S3BrowserDetailQuerySerializer, S3BrowserQuerySerializer


def _normalize_s3_prefix(value):
    prefix = str(value or "").strip().lstrip("/")
    if prefix and not prefix.endswith("/"):
        prefix = f"{prefix}/"
    return prefix


def _s3_leaf_name(value):
    raw = str(value or "").strip().rstrip("/")
    if not raw:
        return ""
    return raw.rsplit("/", 1)[-1] if "/" in raw else raw


def _s3_object_record(obj, bucket_name):
    key = str(obj.get("Key") or "").strip()
    last_modified = obj.get("LastModified")
    if last_modified and hasattr(last_modified, "isoformat"):
        last_modified = last_modified.isoformat()
    public_url = build_public_url(key) if key else ""
    return {
        "id": key,
        "type": "file",
        "name": _s3_leaf_name(key) or key,
        "full_path": key,
        "key": key,
        "is_folder": False,
        "size_bytes": int(obj.get("Size") or 0),
        "content_type": "",
        "last_modified": last_modified,
        "etag": str(obj.get("ETag") or "").strip('"'),
        "storage_class": str(obj.get("StorageClass") or ""),
        "public_url": public_url,
        "effective_url": public_url,
        "bucket": bucket_name,
    }


def _s3_detail_record(key, bucket_name, head_response):
    last_modified = head_response.get("LastModified")
    if last_modified and hasattr(last_modified, "isoformat"):
        last_modified = last_modified.isoformat()
    metadata = head_response.get("Metadata") or {}
    content_length = head_response.get("ContentLength")
    public_url = build_public_url(key)
    expires_value = head_response.get("Expires")
    return {
        "id": key,
        "type": "file",
        "name": _s3_leaf_name(key) or key,
        "full_path": key,
        "key": key,
        "is_folder": False,
        "size_bytes": int(content_length or 0),
        "content_type": str(head_response.get("ContentType") or ""),
        "last_modified": last_modified,
        "etag": str(head_response.get("ETag") or "").strip('"'),
        "storage_class": str(head_response.get("StorageClass") or ""),
        "public_url": public_url,
        "effective_url": public_url,
        "bucket": bucket_name,
        "cache_control": str(head_response.get("CacheControl") or ""),
        "content_disposition": str(head_response.get("ContentDisposition") or ""),
        "content_encoding": str(head_response.get("ContentEncoding") or ""),
        "content_language": str(head_response.get("ContentLanguage") or ""),
        "expires": expires_value.isoformat() if expires_value else None,
        "metadata": metadata,
    }


class S3BrowserViewSet(viewsets.ViewSet):
    def get_permissions(self):
        return [IsAuthenticated()]

    def list(self, request):
        if getattr(request.user, "pfs_role", "") != "ADMIN":
            return Response({"detail": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)

        serializer = S3BrowserQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        params = serializer.validated_data

        try:
            bucket_name = get_bucket_name()
        except ImproperlyConfigured as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        client = get_s3_client()
        request_kwargs = {
            "Bucket": bucket_name,
            "MaxKeys": params.get("page_size", 24),
        }
        prefix = _normalize_s3_prefix(params.get("dir", ""))
        if prefix:
            request_kwargs["Prefix"] = prefix
        if params.get("cursor"):
            request_kwargs["ContinuationToken"] = params["cursor"]

        try:
            response = client.list_objects_v2(**request_kwargs)
        except ClientError as exc:
            raise ValidationError({"detail": "Unable to read S3 bucket."}) from exc

        search = str(params.get("search") or "").strip().lower()
        results = []

        for obj in response.get("Contents", []) or []:
            key = str(obj.get("Key") or "").strip()
            if not key:
                continue
            if search and search not in key.lower() and search not in _s3_leaf_name(key).lower():
                continue
            results.append(_s3_object_record(obj, bucket_name))

        results.sort(key=lambda item: item.get("full_path") or "")

        return Response(
            {
                "results": results,
                "next_cursor": response.get("NextContinuationToken"),
                "is_truncated": bool(response.get("IsTruncated")),
                "bucket": bucket_name,
                "root_public_url": build_public_url("") if getattr(settings, "AWS_S3_PUBLIC_BASE_URL", "") else "",
            }
        )

    def detail(self, request):
        if getattr(request.user, "pfs_role", "") != "ADMIN":
            return Response({"detail": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)

        serializer = S3BrowserDetailQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        key = str(serializer.validated_data.get("key") or "").strip().lstrip("/")
        if not key:
            return Response({"detail": "key is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            bucket_name = get_bucket_name()
        except ImproperlyConfigured as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        client = get_s3_client()
        try:
            head = client.head_object(Bucket=bucket_name, Key=key)
        except ClientError as exc:
            error_code = exc.response.get("Error", {}).get("Code")
            if error_code in {"404", "NoSuchKey", "NotFound"}:
                raise NotFound("S3 object not found.")
            raise ValidationError({"detail": "Unable to read S3 object."}) from exc

        return Response({"data": _s3_detail_record(key, bucket_name, head)})
