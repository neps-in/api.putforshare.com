# Plan: Generic Product Image Pipeline (Django + Celery + Bunny + React)

**Target audience:** AI coding agent executing step by step.
**Stack:** Django REST API, Celery + Redis, Bunny.net Storage + Pull Zone, React (Vite + pnpm) dashboard at `/dash`.
**Scope:** Upload product images (any product type — books, coins, stamps, courses, future products), store original on Bunny, generate multi-size multi-format variants asynchronously, serve via CDN.

---

## Why Celery is required

Image processing is CPU-bound and slow per upload: decode source, resize to 4 sizes, encode to 2 formats, PUT each variant to Bunny over the network. Doing this inside the Django request blocks Gunicorn workers, times out on large uploads, and freezes the dashboard. Move it to Celery so the API returns immediately with a `pending` record and the worker fans out the variants in the background. Redis as broker, on the same VPS.

## What Celery does

Primary task: `process_product_image(product_image_id)`. Loads the original from Bunny, generates all size × format variants with Pillow according to the image's `aspect_ratio`, uploads each to Bunny under a deterministic path, writes a `ProductImageVariant` row per upload, flips `ProductImage.status` to `done` (or `failed` with `error_message`). Wrapped with `bind=True`, `autoretry_for=(requests.RequestException,)`, `retry_backoff=True`, `max_retries=3` so transient Bunny 5xx don't kill the job. Secondary task `delete_product_image_assets(product_image_id)` for cleanup on delete.

## Variant strategy (aspect-aware)

Aspect ratio is a property of the image, set at upload time based on what kind of product it belongs to. Each ratio has its own size ladder. Doubling pattern preserved across all presets so `srcset` works uniformly.

| Aspect | Use case                           | thumbnail | small   | medium  | large     |
| ------ | ---------------------------------- | --------- | ------- | ------- | --------- |
| `2:3`  | Books, vertical posters            | 100×150   | 200×300 | 400×600 | 800×1200  |
| `1:1`  | Coins, stamps, square products     | 100×100   | 300×300 | 600×600 | 1200×1200 |
| `4:5`  | Apparel, social-style portraits    | 120×150   | 240×300 | 480×600 | 960×1200  |
| `4:3`  | Furniture, landscape product shots | 160×120   | 400×300 | 800×600 | 1600×1200 |
| `16:9` | Course thumbnails, banners         | 160×90    | 320×180 | 640×360 | 1280×720  |

Formats per size: **WebP** (primary, smallest) + **JPEG** (fallback). Total = 4 sizes × 2 formats = **8 files** per upload, plus the preserved original.

## Bunny storage layout

```
products/{content_type}/{object_id}/{image_id}/original.{ext}
products/{content_type}/{object_id}/{image_id}/{size}.{format}
```

Deterministic paths → idempotent re-runs (PUT overwrites). `content_type` segment makes per-product-type cache purges trivial. CDN URL = `https://{BUNNY_PULL_ZONE_HOSTNAME}/{path}`.

---

## Step-by-step build plan

### Step 1 — Project setup

1. Confirm Django project exists with PostgreSQL.
2. Create app: `python manage.py startapp productimages`.
3. Add to `INSTALLED_APPS`: `productimages`, `rest_framework`, `corsheaders`, `django_celery_results`, `django.contrib.contenttypes` (already there by default).
4. Install dependencies:
   ```
   pip install Pillow celery[redis] redis requests djangorestframework django-cors-headers python-decouple django-celery-results
   ```
5. System packages on Ubuntu VPS: `libjpeg-dev zlib1g-dev libwebp-dev` for Pillow.

### Step 2 — Environment variables

Create `.env.example`:

```
# Django
DJANGO_SECRET_KEY=
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DATABASE_URL=postgres://user:pass@host:5432/dbname

# Bunny Storage (write side)
BUNNY_STORAGE_ZONE_NAME=grandapp-products
BUNNY_STORAGE_ACCESS_KEY=                    # storage zone password from Bunny dashboard
BUNNY_STORAGE_HOSTNAME=storage.bunnycdn.com  # or regional: ny./sg./la.storage.bunnycdn.com
BUNNY_STORAGE_REGION=                        # empty for default (Falkenstein)

# Bunny Pull Zone (read side / CDN)
BUNNY_PULL_ZONE_HOSTNAME=grandapp-products.b-cdn.net

# Celery / Redis
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1
CELERY_TASK_ALWAYS_EAGER=False               # set True for local dev without worker

# Upload limits
MAX_UPLOAD_SIZE_MB=10
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/webp

# CORS (frontend)
CORS_ALLOWED_ORIGINS=http://localhost:5173,https://dash.example.com
```

Load via `decouple.config()` in `settings.py`. Commit `.env.example`, never `.env`.

### Step 3 — Models (`productimages/models.py`)

Use Django's `ContentType` framework for the generic link so any product model can attach images without schema changes.

```python
import uuid
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models


class ProductImage(models.Model):
    ASPECT_CHOICES = [
        ("2:3",  "Portrait 2:3 (books, posters)"),
        ("1:1",  "Square (coins, stamps, products)"),
        ("4:5",  "Portrait 4:5 (apparel, social)"),
        ("4:3",  "Landscape 4:3 (furniture)"),
        ("16:9", "Landscape 16:9 (banners, thumbnails)"),
    ]
    STATUS_CHOICES = [
        ("pending",    "Pending"),
        ("processing", "Processing"),
        ("done",       "Done"),
        ("failed",     "Failed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Generic link to any product model
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.CharField(max_length=64)  # supports UUID and int PKs
    product = GenericForeignKey("content_type", "object_id")

    aspect_ratio = models.CharField(max_length=8, choices=ASPECT_CHOICES, default="2:3")
    title = models.CharField(max_length=255, blank=True)        # alt-text / caption
    order = models.PositiveSmallIntegerField(default=0)         # gallery ordering
    is_primary = models.BooleanField(default=False)             # main image for product

    original_filename = models.CharField(max_length=255)
    bunny_original_path = models.CharField(max_length=500, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    error_message = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["content_type", "object_id", "order", "-created_at"]
        indexes = [models.Index(fields=["content_type", "object_id"])]


class ProductImageVariant(models.Model):
    FORMAT_CHOICES = [("webp", "WebP"), ("jpeg", "JPEG")]
    SIZE_CHOICES = [
        ("thumbnail", "Thumbnail"),
        ("small",     "Small"),
        ("medium",    "Medium"),
        ("large",     "Large"),
        ("original",  "Original"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product_image = models.ForeignKey(ProductImage, related_name="variants", on_delete=models.CASCADE)
    size = models.CharField(max_length=20, choices=SIZE_CHOICES)
    format = models.CharField(max_length=10, choices=FORMAT_CHOICES)
    width = models.PositiveIntegerField()
    height = models.PositiveIntegerField()
    file_size_bytes = models.PositiveBigIntegerField(default=0)
    bunny_path = models.CharField(max_length=500)
    cdn_url = models.URLField(max_length=600, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("product_image", "size", "format")
        ordering = ["size", "format"]
```

Add a `save()` override or DB constraint on `ProductImage` to enforce single `is_primary=True` per `(content_type, object_id)`. Run `makemigrations productimages && migrate`.

### Step 4 — Bunny client (`productimages/services/bunny.py`)

Plain `requests`-based wrapper. No SDK needed — Bunny Storage is a simple HTTP API.

```python
import requests
from django.conf import settings

class BunnyClient:
    def __init__(self):
        self.hostname = settings.BUNNY_STORAGE_HOSTNAME
        self.zone = settings.BUNNY_STORAGE_ZONE_NAME
        self.access_key = settings.BUNNY_STORAGE_ACCESS_KEY
        self.pull_zone = settings.BUNNY_PULL_ZONE_HOSTNAME

    def _url(self, path):
        return f"https://{self.hostname}/{self.zone}/{path}"

    def upload(self, path, data, content_type):
        r = requests.put(self._url(path), data=data,
                         headers={"AccessKey": self.access_key, "Content-Type": content_type},
                         timeout=30)
        r.raise_for_status()
        return self.cdn_url(path)

    def delete(self, path):
        r = requests.delete(self._url(path),
                            headers={"AccessKey": self.access_key},
                            timeout=15)
        if r.status_code not in (200, 404):
            r.raise_for_status()

    def fetch(self, path) -> bytes:
        r = requests.get(self._url(path),
                         headers={"AccessKey": self.access_key},
                         timeout=30)
        r.raise_for_status()
        return r.content

    def cdn_url(self, path):
        return f"https://{self.pull_zone}/{path}"
```

### Step 5 — Size presets (`productimages/services/presets.py`)

```python
SIZE_PRESETS = {
    "2:3": {
        "thumbnail": (100, 150),
        "small":     (200, 300),
        "medium":    (400, 600),
        "large":     (800, 1200),
    },
    "1:1": {
        "thumbnail": (100, 100),
        "small":     (300, 300),
        "medium":    (600, 600),
        "large":     (1200, 1200),
    },
    "4:5": {
        "thumbnail": (120, 150),
        "small":     (240, 300),
        "medium":    (480, 600),
        "large":     (960, 1200),
    },
    "4:3": {
        "thumbnail": (160, 120),
        "small":     (400, 300),
        "medium":    (800, 600),
        "large":     (1600, 1200),
    },
    "16:9": {
        "thumbnail": (160, 90),
        "small":     (320, 180),
        "medium":    (640, 360),
        "large":     (1280, 720),
    },
}

OUTPUT_FORMATS = ["webp", "jpeg"]
```

### Step 6 — Image processing (`productimages/services/images.py`)

Pure function, easy to unit-test in isolation from Bunny.

```python
import io
from dataclasses import dataclass
from PIL import Image, ImageOps
from .presets import SIZE_PRESETS, OUTPUT_FORMATS

@dataclass
class VariantPayload:
    size_label: str
    format: str
    width: int
    height: int
    bytes: bytes
    content_type: str

def generate_variants(source_bytes: bytes, aspect_ratio: str):
    if aspect_ratio not in SIZE_PRESETS:
        raise ValueError(f"Unsupported aspect ratio: {aspect_ratio}")

    img = Image.open(io.BytesIO(source_bytes)).convert("RGB")

    for size_label, (w, h) in SIZE_PRESETS[aspect_ratio].items():
        resized = ImageOps.fit(img, (w, h), Image.LANCZOS)
        for fmt in OUTPUT_FORMATS:
            buf = io.BytesIO()
            if fmt == "webp":
                resized.save(buf, "WEBP", quality=82, method=6)
                ctype = "image/webp"
            else:
                resized.save(buf, "JPEG", quality=85, optimize=True, progressive=True)
                ctype = "image/jpeg"
            yield VariantPayload(size_label, fmt, w, h, buf.getvalue(), ctype)
```

### Step 7 — Celery setup (`core/celery.py`)

```python
import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
app = Celery("core")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
```

In `core/__init__.py`: `from .celery import app as celery_app`. In `settings.py`: read `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`, `CELERY_TASK_ALWAYS_EAGER` from env.

### Step 8 — Celery tasks (`productimages/tasks.py`)

```python
import logging
import requests
from celery import shared_task
from .models import ProductImage, ProductImageVariant
from .services.bunny import BunnyClient
from .services.images import generate_variants

logger = logging.getLogger(__name__)

@shared_task(bind=True, autoretry_for=(requests.RequestException,),
             retry_backoff=True, max_retries=3)
def process_product_image(self, product_image_id):
    pi = ProductImage.objects.get(id=product_image_id)
    pi.status = "processing"
    pi.save(update_fields=["status", "updated_at"])

    bunny = BunnyClient()
    try:
        source_bytes = bunny.fetch(pi.bunny_original_path)
        ct_label = pi.content_type.model  # e.g. "book", "coin"

        for variant in generate_variants(source_bytes, pi.aspect_ratio):
            path = f"products/{ct_label}/{pi.object_id}/{pi.id}/{variant.size_label}.{variant.format}"
            cdn_url = bunny.upload(path, variant.bytes, variant.content_type)
            ProductImageVariant.objects.update_or_create(
                product_image=pi, size=variant.size_label, format=variant.format,
                defaults={
                    "width": variant.width, "height": variant.height,
                    "file_size_bytes": len(variant.bytes),
                    "bunny_path": path, "cdn_url": cdn_url,
                },
            )

        pi.status = "done"
        pi.error_message = ""
        pi.save(update_fields=["status", "error_message", "updated_at"])
    except Exception as e:
        logger.exception("process_product_image failed for %s", product_image_id)
        pi.status = "failed"
        pi.error_message = str(e)[:2000]
        pi.save(update_fields=["status", "error_message", "updated_at"])
        raise


@shared_task
def delete_product_image_assets(paths):
    """paths: list of bunny_path strings to delete."""
    bunny = BunnyClient()
    for p in paths:
        try:
            bunny.delete(p)
        except Exception:
            logger.exception("Failed to delete %s", p)
```

### Step 9 — DRF serializers (`productimages/serializers.py`)

```python
from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType
from .models import ProductImage, ProductImageVariant

class VariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImageVariant
        fields = ["size", "format", "width", "height", "file_size_bytes", "cdn_url"]

class ProductImageSerializer(serializers.ModelSerializer):
    variants = VariantSerializer(many=True, read_only=True)
    content_type_name = serializers.CharField(source="content_type.model", read_only=True)

    class Meta:
        model = ProductImage
        fields = ["id", "content_type_name", "object_id", "aspect_ratio",
                  "title", "order", "is_primary", "status", "error_message",
                  "variants", "created_at", "updated_at"]
        read_only_fields = ["status", "error_message", "variants"]

class ProductImageUploadSerializer(serializers.Serializer):
    content_type = serializers.CharField()  # e.g. "books.book"
    object_id = serializers.CharField()
    aspect_ratio = serializers.ChoiceField(choices=[c[0] for c in ProductImage.ASPECT_CHOICES])
    title = serializers.CharField(required=False, allow_blank=True)
    order = serializers.IntegerField(required=False, default=0)
    is_primary = serializers.BooleanField(required=False, default=False)
    file = serializers.ImageField()
```

### Step 10 — DRF views (`productimages/views.py`)

```python
from django.contrib.contenttypes.models import ContentType
from rest_framework import viewsets, status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from .models import ProductImage
from .serializers import ProductImageSerializer, ProductImageUploadSerializer
from .services.bunny import BunnyClient
from .tasks import process_product_image, delete_product_image_assets

class ProductImageViewSet(viewsets.ModelViewSet):
    queryset = ProductImage.objects.prefetch_related("variants").all()
    serializer_class = ProductImageSerializer
    parser_classes = [MultiPartParser, FormParser]

    def create(self, request):
        upload = ProductImageUploadSerializer(data=request.data)
        upload.is_valid(raise_exception=True)
        data = upload.validated_data

        app_label, model = data["content_type"].split(".")
        ct = ContentType.objects.get(app_label=app_label, model=model)
        f = data["file"]
        ext = f.name.rsplit(".", 1)[-1].lower()

        pi = ProductImage.objects.create(
            content_type=ct, object_id=data["object_id"],
            aspect_ratio=data["aspect_ratio"],
            title=data.get("title", ""),
            order=data.get("order", 0),
            is_primary=data.get("is_primary", False),
            original_filename=f.name,
        )
        bunny_path = f"products/{ct.model}/{pi.object_id}/{pi.id}/original.{ext}"
        BunnyClient().upload(bunny_path, f.read(), f.content_type)
        pi.bunny_original_path = bunny_path
        pi.save(update_fields=["bunny_original_path"])

        process_product_image.delay(str(pi.id))
        return Response(ProductImageSerializer(pi).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, pk=None):
        pi = self.get_object()
        paths = [pi.bunny_original_path] + [v.bunny_path for v in pi.variants.all()]
        delete_product_image_assets.delay(paths)
        pi.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
```

URLs in `productimages/urls.py`, included under `/api/` in `core/urls.py`.

### Step 11 — Frontend dashboard (`/dash`, Vite + React + pnpm)

Match the existing `bigtortsupport_frontend` pattern. Stack: React Query for polling, plain `fetch` with `FormData` for uploads.

Routes:

- `/dash/product-images` — list + upload

Components:

- `ProductImageDashboard.tsx` — upload form on top, grid below.
- `ImageUploadForm.tsx` — inputs:
  - **Product type** (dropdown: book, coin, stamp, course, …) → maps to `content_type`
  - **Product ID** (text input, UUID or int)
  - **Aspect ratio** (dropdown of the 5 choices) — defaults based on selected product type
  - **Title / alt text** (optional)
  - **Order**, **Is primary** (optional)
  - **File** (`<input type="file" accept="image/*">`)
  - Client-side size check against `VITE_MAX_UPLOAD_MB`
  - Preview with letterbox to chosen aspect frame so uploader sees the crop
- `ImageCard.tsx` — shows thumbnail variant, title, status badge, product reference. Polls detail endpoint until `status === "done"`.
- `ImageDetailDrawer.tsx` — lists every variant with size, format, file size, CDN URL, copy-link button. Includes `<picture>` demo with `srcset`.

Polling:

```js
useQuery(["image", id], fetcher, {
  refetchInterval: (d) =>
    d?.status === "done" || d?.status === "failed" ? false : 2000,
});
```

Frontend env:

```
VITE_API_BASE_URL=https://api.example.com
VITE_MAX_UPLOAD_MB=10
```

### Step 12 — Auth & CORS

If `/dash` is staff-only: protect endpoints with `IsAuthenticated` + a staff check. Reuse existing session/JWT setup from other GrandAppStudio projects. Configure `CORS_ALLOWED_ORIGINS` from env.

### Step 13 — Deployment

1. Add systemd unit `celery-productimages.service`:
   ```
   ExecStart=/path/to/venv/bin/celery -A core worker -l info --concurrency=2 -Q celery
   ```
   Concurrency 2 — image work is RAM-heavy on a small VPS.
2. Redis on the same box, bind to `127.0.0.1`, no exposed port.
3. Existing Gunicorn service unchanged.
4. Logrotate `/var/log/celery-productimages.log`.
5. Bunny pull zone: set `Cache-Control: public, max-age=31536000, immutable` since paths are content-stable per image ID. Optimizer off (Pillow already optimized).

### Step 14 — Testing checklist

1. **Unit:** `generate_variants` against fixtures for each aspect ratio — assert 8 outputs per call, correct dimensions, non-empty bytes.
2. **Unit:** `BunnyClient` with `requests` mocked — verify URL, headers, error handling.
3. **Integration:** task with `CELERY_TASK_ALWAYS_EAGER=True` and mocked Bunny — assert 8 `ProductImageVariant` rows, `status=done`, correct paths.
4. **Manual:** upload 5MB JPEG as `2:3` book cover via dash → status flips `pending → processing → done` within ~5s, all 8 CDN URLs resolve, dimensions correct.
5. **Manual:** upload as `1:1` square (e.g. for a stamp record) → confirm 100×100, 300×300, 600×600, 1200×1200 variants.
6. **Manual:** upload as `16:9` (course thumbnail) → confirm 160×90, 320×180, 640×360, 1280×720 variants.
7. **Failure path:** set bad `BUNNY_STORAGE_ACCESS_KEY` → confirm `status=failed` after retries, `error_message` populated, no orphan variants.
8. **Cleanup:** DELETE an image → confirm Bunny paths gone and DB row removed.

### Step 15 — Out of scope (note in README)

- AVIF encoding (`pillow-avif-plugin`)
- Signed URLs via Bunny Token Auth (if any product type becomes private)
- Per-user/tenant upload quota
- Dedupe by source SHA-256 hash
- Background re-encoding job for adding new sizes/formats to existing images

---

**File structure summary:**

```
core/
  settings.py
  celery.py
  urls.py
productimages/
  models.py
  serializers.py
  views.py
  urls.py
  tasks.py
  services/
    __init__.py
    bunny.py
    presets.py
    images.py
  tests/
    test_images.py
    test_bunny.py
    test_tasks.py
.env.example
```

```
frontend/
  src/
    pages/ProductImageDashboard.tsx
    components/
      ImageUploadForm.tsx
      ImageCard.tsx
      ImageDetailDrawer.tsx
    lib/api.ts
  .env.example
```
