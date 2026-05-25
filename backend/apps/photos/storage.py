import os
from datetime import datetime, timezone
from urllib.parse import quote

import requests
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.utils.text import slugify


class PhotoStorageError(Exception):
    pass


def _get_setting(name, default=None):
    return getattr(settings, name, default)


def get_photo_storage_backend():
    backend = str(_get_setting("PHOTO_STORAGE_BACKEND", "")).strip().lower()
    if backend:
        return backend
    if _get_setting("BUNNY_STORAGE_ZONE", "") and (
        _get_setting("BUNNY_STORAGE_PASSWORD", "") or _get_setting("BUNNY_ACCESS_KEY", "")
    ):
        return "bunny"
    if _get_setting("AWS_S3_BUCKET_NAME", "") or _get_setting("AWS_STORAGE_BUCKET_NAME", ""):
        return "s3"
    return "local"


def get_bucket_name():
    bucket = _get_setting("AWS_S3_BUCKET_NAME", "") or _get_setting("AWS_STORAGE_BUCKET_NAME", "")
    if not bucket:
        raise ImproperlyConfigured("AWS_S3_BUCKET_NAME must be configured for direct S3 uploads.")
    return bucket


def get_s3_client():
    try:
        import boto3
    except ImportError as exc:
        raise ImproperlyConfigured("boto3 is required for S3 presigned uploads.") from exc

    kwargs = {}
    region_name = _get_setting("AWS_S3_REGION_NAME", "") or _get_setting("AWS_REGION", "")
    endpoint_url = _get_setting("AWS_S3_ENDPOINT_URL", "")

    if region_name:
        kwargs["region_name"] = region_name
    if endpoint_url:
        kwargs["endpoint_url"] = endpoint_url

    access_key = _get_setting("AWS_ACCESS_KEY_ID", "")
    secret_key = _get_setting("AWS_SECRET_ACCESS_KEY", "")
    session_token = _get_setting("AWS_SESSION_TOKEN", "")

    if access_key and secret_key:
        kwargs["aws_access_key_id"] = access_key
        kwargs["aws_secret_access_key"] = secret_key
    if session_token:
        kwargs["aws_session_token"] = session_token

    return boto3.client("s3", **kwargs)


def sanitize_file_name(file_name):
    base_name = os.path.basename(str(file_name or ""))
    stem, ext = os.path.splitext(base_name)
    safe_stem = slugify(stem) or "image"
    safe_ext = ext.lower()
    return f"{safe_stem}{safe_ext}"


def build_object_key(file_name):
    safe_name = sanitize_file_name(file_name)
    prefix = str(_get_setting("PHOTO_S3_UPLOAD_PREFIX", "uploads/photos")).strip().strip("/")
    date_part = datetime.now(tz=timezone.utc).strftime("%Y/%m/%d")
    random_part = os.urandom(8).hex()
    if prefix:
        return f"{prefix}/{date_part}/{random_part}-{safe_name}"
    return f"{date_part}/{random_part}-{safe_name}"


def build_public_url(object_key):
    if get_photo_storage_backend() == "bunny":
        base_url = str(
            _get_setting("BUNNY_CDN_BASE_URL", "") or _get_setting("BUNNY_CDN_URL", "")
        ).strip().rstrip("/")
        if not base_url:
            raise ImproperlyConfigured("BUNNY_CDN_BASE_URL must be configured for Bunny uploads.")
        return f"{base_url}/{quote(object_key, safe='/')}"

    base_url = str(_get_setting("AWS_S3_PUBLIC_BASE_URL", "")).strip().rstrip("/")
    if base_url:
        return f"{base_url}/{quote(object_key, safe='/')}"

    bucket_name = get_bucket_name()
    region_name = _get_setting("AWS_S3_REGION_NAME", "") or _get_setting("AWS_REGION", "")
    if region_name:
        return f"https://{bucket_name}.s3.{region_name}.amazonaws.com/{quote(object_key, safe='/')}"
    return f"https://{bucket_name}.s3.amazonaws.com/{quote(object_key, safe='/')}"


def _get_bunny_endpoint():
    raw_value = str(
        _get_setting("BUNNY_STORAGE_ENDPOINT", "")
        or _get_setting("BUNNY_REGION", "")
        or "storage.bunnycdn.com"
    ).strip()
    return raw_value.replace("https://", "").replace("http://", "").strip("/")


def _get_bunny_access_key():
    access_key = str(
        _get_setting("BUNNY_STORAGE_PASSWORD", "") or _get_setting("BUNNY_ACCESS_KEY", "")
    ).strip()
    if not access_key:
        raise ImproperlyConfigured("BUNNY_STORAGE_PASSWORD must be configured for Bunny uploads.")
    return access_key


def store_uploaded_file(uploaded_file):
    backend = get_photo_storage_backend()
    if backend == "bunny":
        return store_uploaded_file_to_bunny(uploaded_file)
    if backend == "s3":
        return store_uploaded_file_to_s3(uploaded_file)
    return store_uploaded_file_local(uploaded_file)


def store_uploaded_file_local(uploaded_file):
    from django.core.files.storage import default_storage

    ext = os.path.splitext(getattr(uploaded_file, "name", ""))[1].lower()
    safe_ext = ext if ext else ".bin"
    key = f"uploads/photos/{os.urandom(8).hex()}{safe_ext}"
    saved_path = default_storage.save(key, uploaded_file)
    return saved_path, default_storage.url(saved_path)


def store_uploaded_file_to_s3(uploaded_file):
    client = get_s3_client()
    bucket_name = get_bucket_name()
    object_key = build_object_key(getattr(uploaded_file, "name", "upload.bin"))
    extra_args = {}
    content_type = str(getattr(uploaded_file, "content_type", "") or "").strip()
    if content_type:
        extra_args["ContentType"] = content_type

    if hasattr(uploaded_file, "seek"):
        uploaded_file.seek(0)

    if extra_args:
        client.upload_fileobj(uploaded_file, bucket_name, object_key, ExtraArgs=extra_args)
    else:
        client.upload_fileobj(uploaded_file, bucket_name, object_key)
    return object_key, build_public_url(object_key)


def store_uploaded_file_to_bunny(uploaded_file):
    storage_zone = str(_get_setting("BUNNY_STORAGE_ZONE", "")).strip()
    if not storage_zone:
        raise ImproperlyConfigured("BUNNY_STORAGE_ZONE must be configured for Bunny uploads.")

    object_key = build_object_key(getattr(uploaded_file, "name", "upload.bin"))
    upload_url = f"https://{_get_bunny_endpoint()}/{storage_zone}/{quote(object_key, safe='/')}"
    headers = {
        "AccessKey": _get_bunny_access_key(),
        "Content-Type": str(getattr(uploaded_file, "content_type", "") or "application/octet-stream"),
    }

    if hasattr(uploaded_file, "seek"):
        uploaded_file.seek(0)

    request_body = uploaded_file.file if hasattr(uploaded_file, "file") else uploaded_file
    response = requests.put(upload_url, headers=headers, data=request_body, timeout=(10, 120))
    if response.status_code not in {200, 201}:
        raise PhotoStorageError(
            f"Bunny upload failed with status {response.status_code}: {response.text[:200]}"
        )

    return object_key, build_public_url(object_key)


def generate_presigned_upload(file_name, content_type):
    if get_photo_storage_backend() != "s3":
        raise ImproperlyConfigured("Presigned uploads are only available for the S3 storage backend.")

    client = get_s3_client()
    bucket_name = get_bucket_name()
    object_key = build_object_key(file_name)
    expires_in = int(_get_setting("PHOTO_S3_PRESIGNED_EXPIRES", 900))

    upload_url = client.generate_presigned_url(
        ClientMethod="put_object",
        Params={
            "Bucket": bucket_name,
            "Key": object_key,
            "ContentType": content_type,
        },
        ExpiresIn=expires_in,
    )

    return {
        "bucket": bucket_name,
        "key": object_key,
        "upload_url": upload_url,
        "headers": {"Content-Type": content_type},
        "method": "PUT",
        "expires_in": expires_in,
        "public_url": build_public_url(object_key),
    }
