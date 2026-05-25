# Merged content — prd/todo/

_9 file(s) combined on this page._


---

# complete-plan.todo : todo

_Source: `prd/todo/complete-plan.todo`_

Email content:
    1. Onboarding email - Welcome
    2. Forgotpass
    3. 


Order Processing:
    Smart Sell:
        1. Order Placed - to admin , buyer
        2. Order Dispatched - to buyer, bcc admin
    
    Self Sell:
        1. Order Placed - to admin , seller, buyer
        2. Order Dispatched - to buyer, bcc admin

Help System:

    1. Search - add algolia search
    2. Self Sell Preparation
    3. Smart Sell Preparation
    4. How to create Pickup Request
    5. How to donate books ?
    6. How to sell books at PutForShare.com 

Dash:
    Notify admin  someone signs up, 
    when someone create a pickup request.
    changes status for pickup request

    For Admin:
    Add Book Data 
    We need to cache on the file system so that the next successive search can be made just by reading at it, the cache.

NStore :
    1. Add products via crawling 
        Google, 
        Open Library API
        ISBNdb

    2. APIFY as fallback - v2
    3. Upload the image to bunny cdn


---

# image-upload-be.md : todo

_Source: `prd/todo/image-upload/image-upload-be.md`_

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


---

# image-upload-fe.md : todo

_Source: `prd/todo/image-upload/image-upload-fe.md`_

# Frontend Implementation Plan: Mobile Camera + Client-Side Image Pipeline

**Target audience:** AI coding agent.
**Scope:** Build the React upload wizard with phone camera capture, client-side compression, and aspect-locked cropping. Integrates with the Django backend from the previous plan.
**Project conventions:** Vite + React + pnpm (matches `bigtortsupport_frontend`). TypeScript. Tailwind for styling (substitute existing CSS approach if project doesn't use Tailwind).

---

## Pre-flight checks (agent must do first)

Before writing any code, the agent verifies the following. If any check fails, stop and report — do not improvise.

1. **Confirm project root.** The frontend lives in a directory with `package.json` containing `"vite"` in `devDependencies` and `"react"` in `dependencies`. If unsure which directory, ask.
2. **Confirm package manager.** Look for `pnpm-lock.yaml`. If `package-lock.json` or `yarn.lock` exists instead, use that package manager — do not switch.
3. **Confirm React version.** Must be React 18+. If React 17 or lower, stop and report (`react-image-crop@11` requires React 16.13+ but the hook patterns below assume 18).
4. **Confirm TypeScript.** Look for `tsconfig.json`. If JavaScript-only, drop type annotations from the code but keep all logic identical.
5. **Confirm the backend endpoint.** The dashboard expects `POST /api/product-images/` accepting `multipart/form-data`. If the backend from the prior plan is not deployed yet, the agent builds the frontend in isolation and stubs the upload call.

---

## Step 1 — Install dependencies

Run from the frontend project root:

```bash
pnpm add browser-image-compression@^2.0.2 react-image-crop@^11.0.5
```

Verify both appear in `package.json` `dependencies` after install. Do not add anything else. Do not upgrade other packages.

If the project does not have `@tanstack/react-query` and the agent needs polling, add it:

```bash
pnpm add @tanstack/react-query@^5
```

Otherwise reuse whatever data-fetching the project already has.

---

## Step 2 — Environment variables

Append to existing `frontend/.env.example` (create the file if it doesn't exist; never overwrite an existing `.env`):

```
VITE_API_BASE_URL=http://localhost:8000
VITE_MAX_UPLOAD_MB=10
VITE_MAX_DIMENSION=2400
VITE_COMPRESSION_TARGET_MB=2
```

Document in the same file (as comments):

- `VITE_MAX_UPLOAD_MB` — hard upper limit on the raw file the user picks. Bigger than `VITE_COMPRESSION_TARGET_MB` because we accept big phone shots and compress them down.
- `VITE_MAX_DIMENSION` — longest edge after compression. 2400px = 2× retina headroom for the 1200px backend `large` variant.
- `VITE_COMPRESSION_TARGET_MB` — target size after browser-side compression.

---

## Step 3 — Directory structure

Create exactly these files under `src/`. Do not create extras. Do not nest deeper.

```
src/
├── components/
│   └── upload/
│       ├── ImageUploadForm.tsx       # Step 9 — wizard orchestrator
│       ├── FileSourcePicker.tsx      # Step 4 — camera + file buttons
│       ├── ImageCompressor.ts        # Step 5 — compression helper (no JSX)
│       ├── CropStep.tsx              # Step 6 — react-image-crop wrapper
│       ├── PreviewCard.tsx           # Step 7 — final preview before upload
│       └── useImageUpload.ts         # Step 8 — upload hook
├── lib/
│   ├── aspectRatios.ts               # Step 3a — shared aspect ratio map
│   └── api.ts                        # Step 3b — fetch wrapper (skip if exists)
└── pages/
    └── ProductImageDashboard.tsx     # Step 10 — page that uses the form
```

### Step 3a — `src/lib/aspectRatios.ts`

Single source of truth for aspect ratios across the frontend. Backend defines the same 5 values; keep them in sync.

```typescript
export type AspectRatio = "2:3" | "1:1" | "4:5" | "4:3" | "16:9";

export const ASPECT_RATIOS: Record<
  AspectRatio,
  { value: number; label: string; usage: string }
> = {
  "2:3": { value: 2 / 3, label: "Portrait 2:3", usage: "Books, posters" },
  "1:1": { value: 1, label: "Square 1:1", usage: "Coins, stamps, products" },
  "4:5": { value: 4 / 5, label: "Portrait 4:5", usage: "Apparel, social" },
  "4:3": {
    value: 4 / 3,
    label: "Landscape 4:3",
    usage: "Furniture, product shots",
  },
  "16:9": {
    value: 16 / 9,
    label: "Landscape 16:9",
    usage: "Course thumbnails, banners",
  },
};

export const ASPECT_RATIO_KEYS = Object.keys(ASPECT_RATIOS) as AspectRatio[];
```

### Step 3b — `src/lib/api.ts`

If the project already has an API wrapper, skip this file and use the existing one. Otherwise create:

```typescript
const BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export async function apiPost(path: string, body: FormData) {
  const res = await fetch(`${BASE}${path}`, { method: "POST", body });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json();
}

export async function apiGet(path: string) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return res.json();
}
```

---

## Step 4 — `FileSourcePicker.tsx`

**Purpose:** Two buttons. Camera button uses `capture="environment"` (rear camera on mobile, file picker on desktop). File button is a plain file input.

**Props:**

- `onFileSelected: (file: File) => void`
- `disabled?: boolean`

**Implementation contract:**

- Two hidden `<input type="file" accept="image/*">` elements, refs forwarded to two visible buttons.
- Camera input has `capture="environment"`. File input does not.
- After `onChange` fires, reset `e.target.value = ""` so picking the same file twice still triggers the handler.
- Buttons receive an inline SVG icon (camera, folder). Do not pull an icon library — keep deps minimal.
- Styling: flex row, two equal-width buttons with border, padding `px-4 py-3`, rounded corners. Match existing dashboard button styling if the project has one; otherwise use Tailwind utility classes.

**Output to disk:** one file, ~60 lines.

---

## Step 5 — `ImageCompressor.ts`

**Purpose:** Pure helper module. No JSX. No component. Wraps `browser-image-compression` so the rest of the code calls one function.

**Exports:**

```typescript
export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

export async function compressImage(file: File): Promise<CompressionResult>;
export function formatBytes(bytes: number): string;
```

**Implementation contract:**

- Read `VITE_COMPRESSION_TARGET_MB` and `VITE_MAX_DIMENSION` from `import.meta.env` with numeric defaults (2 and 2400).
- Call `imageCompression(file, { maxSizeMB, maxWidthOrHeight, useWebWorker: true, fileType: "image/jpeg", initialQuality: 0.85 })`.
- The library returns a `Blob`. Wrap it back into a `File` with the original name (extension swapped to `.jpg`), `type: "image/jpeg"`, fresh `lastModified`. This is necessary because `FormData` uses the `File.name` as the filename sent to the server.
- HEIC handling: setting `fileType: "image/jpeg"` makes the library decode HEIC and re-encode as JPEG automatically. No conditional logic needed.
- `formatBytes` returns "B" / "KB" / "MB" depending on magnitude. Used for UI display only.

**Output to disk:** one file, ~50 lines.

---

## Step 6 — `CropStep.tsx`

**Purpose:** Aspect-locked crop UI using `react-image-crop`. Returns a JPEG `Blob` of the cropped region.

**Props:**

- `src: string` — object URL of the compressed image (created via `URL.createObjectURL`)
- `aspectRatio: AspectRatio` — one of the 5 keys from `aspectRatios.ts`
- `onCropComplete: (blob: Blob) => void`
- `onCancel: () => void`

**Implementation contract:**

1. Import:

   ```typescript
   import ReactCrop, {
     centerCrop,
     makeAspectCrop,
     type Crop,
     type PixelCrop,
   } from "react-image-crop";
   import "react-image-crop/dist/ReactCrop.css";
   ```

2. State: `crop: Crop | undefined`, `completedCrop: PixelCrop | undefined`. Ref to the `<img>` element.

3. On image load, initialise a centred crop covering 90% of the image at the chosen aspect:

   ```typescript
   function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
     const { width, height } = e.currentTarget;
     const aspect = ASPECT_RATIOS[aspectRatio].value;
     const initial = centerCrop(
       makeAspectCrop({ unit: "%", width: 90 }, aspect, width, height),
       width,
       height
     );
     setCrop(initial);
   }
   ```

4. On "Use this crop" click, draw the cropped region to a canvas and export as JPEG blob:

   ```typescript
   async function exportCrop(): Promise<Blob> {
     const image = imgRef.current!;
     const canvas = document.createElement("canvas");
     const scaleX = image.naturalWidth / image.width;
     const scaleY = image.naturalHeight / image.height;
     const px = completedCrop!;
     canvas.width = Math.round(px.width * scaleX);
     canvas.height = Math.round(px.height * scaleY);
     const ctx = canvas.getContext("2d")!;
     ctx.drawImage(
       image,
       px.x * scaleX,
       px.y * scaleY,
       px.width * scaleX,
       px.height * scaleY,
       0,
       0,
       canvas.width,
       canvas.height
     );
     return new Promise((resolve) => {
       canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.9);
     });
   }
   ```

5. JSX structure:
   - `<ReactCrop crop={crop} onChange={setCrop} onComplete={setCompletedCrop} aspect={aspect} keepSelection>`
     - inside: `<img ref={imgRef} src={src} onLoad={onImageLoad} alt="Crop source" style={{ maxHeight: "70vh" }} />`
   - Two buttons below: "Cancel" → calls `onCancel`, "Use this crop" → calls `exportCrop` then `onCompete(blob)`.
   - Disable "Use this crop" until `completedCrop` is set.

**Critical detail the agent must not miss:** `ReactCrop` requires the import of the CSS file. Forgetting this gives an invisible crop overlay.

**Output to disk:** one file, ~80 lines.

---

## Step 7 — `PreviewCard.tsx`

**Purpose:** Show the final cropped blob before upload. Display thumbnail, dimensions, file size. Offer "Re-crop" and "Start over" actions.

**Props:**

- `blob: Blob`
- `originalSize: number` — raw file size before compression, for the savings display
- `onUpload: () => void`
- `onRecrop: () => void`
- `onReset: () => void`
- `uploading?: boolean`
- `uploadProgress?: number` — 0-100

**Implementation contract:**

- Generate object URL with `URL.createObjectURL(blob)`. Revoke in cleanup `useEffect` return.
- Read image dimensions by setting `img.onload` and reading `naturalWidth/Height`. Store in state.
- Display: thumbnail (max 200px), filename, dimensions ("400 × 600"), final size (use `formatBytes` from Step 5), compression savings ("saved 78% from 8.2 MB → 1.8 MB").
- Three buttons: "Upload" (primary), "Re-crop", "Start over". Disable all three when `uploading` is true; show progress bar when `uploadProgress > 0`.

**Output to disk:** one file, ~80 lines.

---

## Step 8 — `useImageUpload.ts`

**Purpose:** Custom hook handling the actual upload. Wraps `fetch` with `FormData`, exposes progress via `XMLHttpRequest` (fetch can't report upload progress).

**Signature:**

```typescript
interface UploadParams {
  blob: Blob;
  contentType: string; // e.g. "books.book"
  objectId: string;
  aspectRatio: AspectRatio;
  title?: string;
  isPrimary?: boolean;
  order?: number;
}

interface UploadState {
  upload: (params: UploadParams) => Promise<unknown>;
  uploading: boolean;
  progress: number; // 0-100
  error: string | null;
  result: unknown | null; // parsed JSON response
}

export function useImageUpload(): UploadState;
```

**Implementation contract:**

1. State: `uploading`, `progress`, `error`, `result`.
2. The `upload` function creates a `FormData`:
   ```typescript
   const form = new FormData();
   form.append("file", params.blob, "upload.jpg");
   form.append("content_type", params.contentType);
   form.append("object_id", params.objectId);
   form.append("aspect_ratio", params.aspectRatio);
   if (params.title) form.append("title", params.title);
   if (params.isPrimary !== undefined)
     form.append("is_primary", String(params.isPrimary));
   if (params.order !== undefined) form.append("order", String(params.order));
   ```
3. Use `XMLHttpRequest` (not `fetch`) so upload progress events fire:
   ```typescript
   const xhr = new XMLHttpRequest();
   xhr.upload.onprogress = (e) => {
     if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
   };
   xhr.onload = () => { ... resolve(JSON.parse(xhr.responseText)) ... };
   xhr.onerror = () => reject(new Error("Network error"));
   xhr.open("POST", `${import.meta.env.VITE_API_BASE_URL}/api/product-images/`);
   xhr.send(form);
   ```
4. Wrap the XHR in a `Promise` and return it. Set `uploading = false` in both success and error paths (use `try/finally`).
5. Reset `progress` to 0 at the start of each upload.

**Output to disk:** one file, ~70 lines.

---

## Step 9 — `ImageUploadForm.tsx` (the wizard)

**Purpose:** Orchestrates the whole flow. Owns the wizard state machine.

**Props:** none (page-level component, or accepts `defaultContentType` / `defaultObjectId` if embedded into a product detail page later).

**State shape:**

```typescript
type Stage =
  | "form"
  | "compressing"
  | "cropping"
  | "preview"
  | "uploading"
  | "done";

interface WizardState {
  stage: Stage;
  // Form fields
  contentType: string; // "books.book"
  objectId: string;
  aspectRatio: AspectRatio; // default "2:3"
  title: string;
  isPrimary: boolean;
  order: number;
  // File flow
  rawFile: File | null;
  compressed: CompressionResult | null;
  croppedBlob: Blob | null;
  // UI
  error: string | null;
}
```

**Stage transitions:**

1. **`form`** — User fills product type, object ID, aspect ratio. Bottom of form renders `<FileSourcePicker onFileSelected={handleFileSelected} disabled={!objectId || !contentType} />`.
2. **`compressing`** — Triggered by `handleFileSelected`. Validate file size against `VITE_MAX_UPLOAD_MB`. Show spinner with "Compressing image…". Call `compressImage(file)`. On success, store result, move to `cropping`. On failure, show error and return to `form`.
3. **`cropping`** — Render `<CropStep src={URL.createObjectURL(compressed.file)} aspectRatio={aspectRatio} onCropComplete={handleCropped} onCancel={resetToForm} />`.
4. **`preview`** — Render `<PreviewCard blob={croppedBlob} originalSize={compressed.originalSize} onUpload={handleUpload} onRecrop={() => setStage("cropping")} onReset={resetToForm} />`.
5. **`uploading`** — Same `PreviewCard` but with `uploading={true}` and `uploadProgress` from the hook.
6. **`done`** — Success message with the returned image ID. Button "Upload another" resets to `form` (keeps product type / object ID for convenience, clears file state).

**Form field UI contract:**

- **Content type** — dropdown. For now, hard-code these options matching backend models: `books.book`, `books.coin`, `books.stamp`, `courses.course`. Document in a comment that this list grows as new product types are added.
- **Object ID** — text input. Placeholder: "UUID or numeric ID of the product".
- **Aspect ratio** — dropdown built from `ASPECT_RATIO_KEYS`, showing `label` + `usage` from the map. Default-selects an aspect based on `contentType`:
  - `books.book` → `2:3`
  - `books.coin`, `books.stamp` → `1:1`
  - `courses.course` → `16:9`
  - everything else → `2:3`
- **Title** — text input (optional, used as alt text).
- **Order** — number input (default 0).
- **Is primary** — checkbox.

**Validation before allowing file pick:**

- `contentType` and `objectId` must be non-empty. If not, the `FileSourcePicker` is disabled.
- Display the chosen aspect ratio with a small visual preview rectangle (a div sized 60 × `60/aspect` px with a border) so the user sees what they're committing to before opening their camera.

**Cleanup:** Use `useEffect` cleanup to revoke any `URL.createObjectURL` URLs when the component unmounts or the wizard resets.

**Output to disk:** one file, ~250 lines (this is the biggest file in the set).

---

## Step 10 — `ProductImageDashboard.tsx`

**Purpose:** The `/dash/product-images` page. Hosts the upload form and (eventually) a grid of existing images. For this plan, the agent builds the upload section. The grid section is a stub with a TODO comment — it will be built in a follow-up task.

**Implementation contract:**

```tsx
export default function ProductImageDashboard() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-medium">Product images</h1>
        <p className="text-sm text-gray-600 mt-1">
          Upload product photos. Variants and CDN URLs are generated
          automatically.
        </p>
      </header>

      <section className="mb-12">
        <h2 className="text-lg font-medium mb-4">Upload new image</h2>
        <ImageUploadForm />
      </section>

      <section>
        <h2 className="text-lg font-medium mb-4">Recent uploads</h2>
        {/* TODO: render grid of ProductImage records, poll until status=done */}
        <div className="text-sm text-gray-500">
          Grid coming in next iteration.
        </div>
      </section>
    </div>
  );
}
```

**Routing:** Add the route to whatever router the project uses (React Router, TanStack Router, etc.). The agent does NOT modify routing config without first viewing the existing router file and reporting the change.

---

## Step 11 — Wire-up checklist (agent runs through these in order)

After all files are written, the agent verifies each item:

1. `pnpm install` completed without errors. `browser-image-compression` and `react-image-crop` appear in `node_modules`.
2. `pnpm tsc --noEmit` (or equivalent) reports zero type errors across the new files.
3. `pnpm build` succeeds.
4. Run `pnpm dev` and open the dashboard route. The form renders. Both buttons appear.
5. On desktop browser: click "Take photo" → file picker opens (capture attribute ignored, no error).
6. On desktop browser: pick a 5MB JPEG → spinner appears → crop UI appears → crop → preview shows → upload (stubbed if no backend).

If any check fails, the agent reports the specific failure and stops. Does not attempt to fix unrelated issues.

---

## Step 12 — Testing checklist (manual, post-build)

Same as Step 14 in the backend plan, plus:

1. **Mobile iPhone, Safari:** open `/dash/product-images`. Tap "Take photo" → native camera opens. Shoot a portrait photo (HEIC by default).
   - Verify: spinner appears, then crop UI. File arrived as JPEG (check network tab — `multipart/form-data` boundary shows `filename=*.jpg`).
   - Verify: crop frame is locked to chosen aspect ratio.
   - Verify: uploaded payload is under 2 MB.
2. **Mobile Android, Chrome:** same as above. Verify rear camera opens (not selfie).
3. **Mobile, "Choose file":** verify it opens photo library, not camera.
4. **Desktop, both buttons:** verify both fall back to file picker. No console errors.
5. **Re-crop button:** click after first crop, verify the same source image reopens (don't re-compress).
6. **Cancel during crop:** returns to form with file state cleared.
7. **Aspect ratio change:** changing the dropdown after selecting a file does NOT silently re-crop. Either the agent locks the dropdown after file selection, OR adds a confirmation "Changing aspect will discard your crop. Continue?" — agent picks one and documents the choice in a comment.
8. **Upload failure:** simulate 500 from backend → error appears in `PreviewCard`, "Upload" button re-enabled, no stuck state.

---

## Step 13 — What the agent must NOT do

These are common failure modes. Each is listed as a hard rule.

1. **Do not switch package managers.** If the project uses pnpm, do not run `npm install`. If it uses npm, do not run `pnpm add`.
2. **Do not upgrade React, Vite, TypeScript, or other existing dependencies.** Only install the two new packages.
3. **Do not invent new aspect ratios.** The 5 in `aspectRatios.ts` match the backend exactly. Adding a 6th here will break server-side validation.
4. **Do not skip the `react-image-crop` CSS import.** Without it the crop overlay is invisible. Triple-check this in `CropStep.tsx`.
5. **Do not use `fetch` for the upload if progress reporting matters.** Use `XMLHttpRequest`. The hook contract depends on this.
6. **Do not omit `useWebWorker: true`** in the compression call. Without it the UI freezes for several seconds on large phone photos.
7. **Do not handle HEIC server-side as well.** The whole point of client compression is to keep the Django stack simple. If the agent feels the urge to add `pillow-heif` to the backend, stop and re-read the previous plan.
8. **Do not store `File` objects in React state for long-lived components.** Memory pressure on mobile is real. Once `compressed.file` exists, the original `rawFile` can be dropped from state.
9. **Do not `URL.createObjectURL` without `URL.revokeObjectURL` in cleanup.** Each unrevoked URL pins the blob in memory until tab close.
10. **Do not add a backend HEIC handler "just in case".** That contradicts the previous plan and adds a libheif system dependency to the VPS.

---

## Step 14 — Files the agent will create

Summary table for the agent to tick off:

| #   | Path                                         | Approx lines | Purpose                      |
| --- | -------------------------------------------- | ------------ | ---------------------------- |
| 1   | `src/lib/aspectRatios.ts`                    | 20           | Aspect ratio constants       |
| 2   | `src/lib/api.ts`                             | 20           | API wrapper (skip if exists) |
| 3   | `src/components/upload/FileSourcePicker.tsx` | 60           | Camera + file buttons        |
| 4   | `src/components/upload/ImageCompressor.ts`   | 50           | Compression helper           |
| 5   | `src/components/upload/CropStep.tsx`         | 80           | Crop UI                      |
| 6   | `src/components/upload/PreviewCard.tsx`      | 80           | Final preview                |
| 7   | `src/components/upload/useImageUpload.ts`    | 70           | Upload hook (XHR + progress) |
| 8   | `src/components/upload/ImageUploadForm.tsx`  | 250          | Wizard orchestrator          |
| 9   | `src/pages/ProductImageDashboard.tsx`        | 40           | Page route                   |
| -   | `.env.example` (append only)                 | +4 lines     | Env documentation            |
| -   | `package.json`                               | +2 deps      | Via `pnpm add`               |

Total new code: ~670 lines across 9 files.

---

## Step 15 — Reporting back

After completing the plan, the agent reports:

1. List of files created with line counts.
2. `pnpm tsc` output (must be clean).
3. `pnpm build` output (must succeed).
4. Screenshots or descriptions of the wizard at each stage (form, cropping, preview).
5. Any deviations from this plan, with justification. Examples of acceptable deviations: project uses styled-components instead of Tailwind, project uses zustand instead of useState, project has its own `api.ts` wrapper. Examples of unacceptable deviations: adding a new dependency, changing the aspect ratio list, skipping the compression step.

If any step is unclear, the agent stops and asks before improvising.

---

**This concludes the frontend implementation plan. Combined with the previous backend plan, the agent now has end-to-end instructions for: Django models + Celery pipeline + Bunny storage (backend) and Vite/React wizard with camera + compression + cropping (frontend).**


---

# image-upload_combined_output.txt : todo

_Source: `prd/todo/image-upload/image-upload_combined_output.txt`_

==================================================
FILE: image-upload-be.md
==================================================

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


==================================================
FILE: image-upload-fe.md
==================================================

# Frontend Implementation Plan: Mobile Camera + Client-Side Image Pipeline

**Target audience:** AI coding agent.
**Scope:** Build the React upload wizard with phone camera capture, client-side compression, and aspect-locked cropping. Integrates with the Django backend from the previous plan.
**Project conventions:** Vite + React + pnpm (matches `bigtortsupport_frontend`). TypeScript. Tailwind for styling (substitute existing CSS approach if project doesn't use Tailwind).

---

## Pre-flight checks (agent must do first)

Before writing any code, the agent verifies the following. If any check fails, stop and report — do not improvise.

1. **Confirm project root.** The frontend lives in a directory with `package.json` containing `"vite"` in `devDependencies` and `"react"` in `dependencies`. If unsure which directory, ask.
2. **Confirm package manager.** Look for `pnpm-lock.yaml`. If `package-lock.json` or `yarn.lock` exists instead, use that package manager — do not switch.
3. **Confirm React version.** Must be React 18+. If React 17 or lower, stop and report (`react-image-crop@11` requires React 16.13+ but the hook patterns below assume 18).
4. **Confirm TypeScript.** Look for `tsconfig.json`. If JavaScript-only, drop type annotations from the code but keep all logic identical.
5. **Confirm the backend endpoint.** The dashboard expects `POST /api/product-images/` accepting `multipart/form-data`. If the backend from the prior plan is not deployed yet, the agent builds the frontend in isolation and stubs the upload call.

---

## Step 1 — Install dependencies

Run from the frontend project root:

```bash
pnpm add browser-image-compression@^2.0.2 react-image-crop@^11.0.5
```

Verify both appear in `package.json` `dependencies` after install. Do not add anything else. Do not upgrade other packages.

If the project does not have `@tanstack/react-query` and the agent needs polling, add it:

```bash
pnpm add @tanstack/react-query@^5
```

Otherwise reuse whatever data-fetching the project already has.

---

## Step 2 — Environment variables

Append to existing `frontend/.env.example` (create the file if it doesn't exist; never overwrite an existing `.env`):

```
VITE_API_BASE_URL=http://localhost:8000
VITE_MAX_UPLOAD_MB=10
VITE_MAX_DIMENSION=2400
VITE_COMPRESSION_TARGET_MB=2
```

Document in the same file (as comments):

- `VITE_MAX_UPLOAD_MB` — hard upper limit on the raw file the user picks. Bigger than `VITE_COMPRESSION_TARGET_MB` because we accept big phone shots and compress them down.
- `VITE_MAX_DIMENSION` — longest edge after compression. 2400px = 2× retina headroom for the 1200px backend `large` variant.
- `VITE_COMPRESSION_TARGET_MB` — target size after browser-side compression.

---

## Step 3 — Directory structure

Create exactly these files under `src/`. Do not create extras. Do not nest deeper.

```
src/
├── components/
│   └── upload/
│       ├── ImageUploadForm.tsx       # Step 9 — wizard orchestrator
│       ├── FileSourcePicker.tsx      # Step 4 — camera + file buttons
│       ├── ImageCompressor.ts        # Step 5 — compression helper (no JSX)
│       ├── CropStep.tsx              # Step 6 — react-image-crop wrapper
│       ├── PreviewCard.tsx           # Step 7 — final preview before upload
│       └── useImageUpload.ts         # Step 8 — upload hook
├── lib/
│   ├── aspectRatios.ts               # Step 3a — shared aspect ratio map
│   └── api.ts                        # Step 3b — fetch wrapper (skip if exists)
└── pages/
    └── ProductImageDashboard.tsx     # Step 10 — page that uses the form
```

### Step 3a — `src/lib/aspectRatios.ts`

Single source of truth for aspect ratios across the frontend. Backend defines the same 5 values; keep them in sync.

```typescript
export type AspectRatio = "2:3" | "1:1" | "4:5" | "4:3" | "16:9";

export const ASPECT_RATIOS: Record<
  AspectRatio,
  { value: number; label: string; usage: string }
> = {
  "2:3": { value: 2 / 3, label: "Portrait 2:3", usage: "Books, posters" },
  "1:1": { value: 1, label: "Square 1:1", usage: "Coins, stamps, products" },
  "4:5": { value: 4 / 5, label: "Portrait 4:5", usage: "Apparel, social" },
  "4:3": {
    value: 4 / 3,
    label: "Landscape 4:3",
    usage: "Furniture, product shots",
  },
  "16:9": {
    value: 16 / 9,
    label: "Landscape 16:9",
    usage: "Course thumbnails, banners",
  },
};

export const ASPECT_RATIO_KEYS = Object.keys(ASPECT_RATIOS) as AspectRatio[];
```

### Step 3b — `src/lib/api.ts`

If the project already has an API wrapper, skip this file and use the existing one. Otherwise create:

```typescript
const BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export async function apiPost(path: string, body: FormData) {
  const res = await fetch(`${BASE}${path}`, { method: "POST", body });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json();
}

export async function apiGet(path: string) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return res.json();
}
```

---

## Step 4 — `FileSourcePicker.tsx`

**Purpose:** Two buttons. Camera button uses `capture="environment"` (rear camera on mobile, file picker on desktop). File button is a plain file input.

**Props:**

- `onFileSelected: (file: File) => void`
- `disabled?: boolean`

**Implementation contract:**

- Two hidden `<input type="file" accept="image/*">` elements, refs forwarded to two visible buttons.
- Camera input has `capture="environment"`. File input does not.
- After `onChange` fires, reset `e.target.value = ""` so picking the same file twice still triggers the handler.
- Buttons receive an inline SVG icon (camera, folder). Do not pull an icon library — keep deps minimal.
- Styling: flex row, two equal-width buttons with border, padding `px-4 py-3`, rounded corners. Match existing dashboard button styling if the project has one; otherwise use Tailwind utility classes.

**Output to disk:** one file, ~60 lines.

---

## Step 5 — `ImageCompressor.ts`

**Purpose:** Pure helper module. No JSX. No component. Wraps `browser-image-compression` so the rest of the code calls one function.

**Exports:**

```typescript
export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

export async function compressImage(file: File): Promise<CompressionResult>;
export function formatBytes(bytes: number): string;
```

**Implementation contract:**

- Read `VITE_COMPRESSION_TARGET_MB` and `VITE_MAX_DIMENSION` from `import.meta.env` with numeric defaults (2 and 2400).
- Call `imageCompression(file, { maxSizeMB, maxWidthOrHeight, useWebWorker: true, fileType: "image/jpeg", initialQuality: 0.85 })`.
- The library returns a `Blob`. Wrap it back into a `File` with the original name (extension swapped to `.jpg`), `type: "image/jpeg"`, fresh `lastModified`. This is necessary because `FormData` uses the `File.name` as the filename sent to the server.
- HEIC handling: setting `fileType: "image/jpeg"` makes the library decode HEIC and re-encode as JPEG automatically. No conditional logic needed.
- `formatBytes` returns "B" / "KB" / "MB" depending on magnitude. Used for UI display only.

**Output to disk:** one file, ~50 lines.

---

## Step 6 — `CropStep.tsx`

**Purpose:** Aspect-locked crop UI using `react-image-crop`. Returns a JPEG `Blob` of the cropped region.

**Props:**

- `src: string` — object URL of the compressed image (created via `URL.createObjectURL`)
- `aspectRatio: AspectRatio` — one of the 5 keys from `aspectRatios.ts`
- `onCropComplete: (blob: Blob) => void`
- `onCancel: () => void`

**Implementation contract:**

1. Import:

   ```typescript
   import ReactCrop, {
     centerCrop,
     makeAspectCrop,
     type Crop,
     type PixelCrop,
   } from "react-image-crop";
   import "react-image-crop/dist/ReactCrop.css";
   ```

2. State: `crop: Crop | undefined`, `completedCrop: PixelCrop | undefined`. Ref to the `<img>` element.

3. On image load, initialise a centred crop covering 90% of the image at the chosen aspect:

   ```typescript
   function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
     const { width, height } = e.currentTarget;
     const aspect = ASPECT_RATIOS[aspectRatio].value;
     const initial = centerCrop(
       makeAspectCrop({ unit: "%", width: 90 }, aspect, width, height),
       width,
       height
     );
     setCrop(initial);
   }
   ```

4. On "Use this crop" click, draw the cropped region to a canvas and export as JPEG blob:

   ```typescript
   async function exportCrop(): Promise<Blob> {
     const image = imgRef.current!;
     const canvas = document.createElement("canvas");
     const scaleX = image.naturalWidth / image.width;
     const scaleY = image.naturalHeight / image.height;
     const px = completedCrop!;
     canvas.width = Math.round(px.width * scaleX);
     canvas.height = Math.round(px.height * scaleY);
     const ctx = canvas.getContext("2d")!;
     ctx.drawImage(
       image,
       px.x * scaleX,
       px.y * scaleY,
       px.width * scaleX,
       px.height * scaleY,
       0,
       0,
       canvas.width,
       canvas.height
     );
     return new Promise((resolve) => {
       canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.9);
     });
   }
   ```

5. JSX structure:
   - `<ReactCrop crop={crop} onChange={setCrop} onComplete={setCompletedCrop} aspect={aspect} keepSelection>`
     - inside: `<img ref={imgRef} src={src} onLoad={onImageLoad} alt="Crop source" style={{ maxHeight: "70vh" }} />`
   - Two buttons below: "Cancel" → calls `onCancel`, "Use this crop" → calls `exportCrop` then `onCompete(blob)`.
   - Disable "Use this crop" until `completedCrop` is set.

**Critical detail the agent must not miss:** `ReactCrop` requires the import of the CSS file. Forgetting this gives an invisible crop overlay.

**Output to disk:** one file, ~80 lines.

---

## Step 7 — `PreviewCard.tsx`

**Purpose:** Show the final cropped blob before upload. Display thumbnail, dimensions, file size. Offer "Re-crop" and "Start over" actions.

**Props:**

- `blob: Blob`
- `originalSize: number` — raw file size before compression, for the savings display
- `onUpload: () => void`
- `onRecrop: () => void`
- `onReset: () => void`
- `uploading?: boolean`
- `uploadProgress?: number` — 0-100

**Implementation contract:**

- Generate object URL with `URL.createObjectURL(blob)`. Revoke in cleanup `useEffect` return.
- Read image dimensions by setting `img.onload` and reading `naturalWidth/Height`. Store in state.
- Display: thumbnail (max 200px), filename, dimensions ("400 × 600"), final size (use `formatBytes` from Step 5), compression savings ("saved 78% from 8.2 MB → 1.8 MB").
- Three buttons: "Upload" (primary), "Re-crop", "Start over". Disable all three when `uploading` is true; show progress bar when `uploadProgress > 0`.

**Output to disk:** one file, ~80 lines.

---

## Step 8 — `useImageUpload.ts`

**Purpose:** Custom hook handling the actual upload. Wraps `fetch` with `FormData`, exposes progress via `XMLHttpRequest` (fetch can't report upload progress).

**Signature:**

```typescript
interface UploadParams {
  blob: Blob;
  contentType: string; // e.g. "books.book"
  objectId: string;
  aspectRatio: AspectRatio;
  title?: string;
  isPrimary?: boolean;
  order?: number;
}

interface UploadState {
  upload: (params: UploadParams) => Promise<unknown>;
  uploading: boolean;
  progress: number; // 0-100
  error: string | null;
  result: unknown | null; // parsed JSON response
}

export function useImageUpload(): UploadState;
```

**Implementation contract:**

1. State: `uploading`, `progress`, `error`, `result`.
2. The `upload` function creates a `FormData`:
   ```typescript
   const form = new FormData();
   form.append("file", params.blob, "upload.jpg");
   form.append("content_type", params.contentType);
   form.append("object_id", params.objectId);
   form.append("aspect_ratio", params.aspectRatio);
   if (params.title) form.append("title", params.title);
   if (params.isPrimary !== undefined)
     form.append("is_primary", String(params.isPrimary));
   if (params.order !== undefined) form.append("order", String(params.order));
   ```
3. Use `XMLHttpRequest` (not `fetch`) so upload progress events fire:
   ```typescript
   const xhr = new XMLHttpRequest();
   xhr.upload.onprogress = (e) => {
     if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
   };
   xhr.onload = () => { ... resolve(JSON.parse(xhr.responseText)) ... };
   xhr.onerror = () => reject(new Error("Network error"));
   xhr.open("POST", `${import.meta.env.VITE_API_BASE_URL}/api/product-images/`);
   xhr.send(form);
   ```
4. Wrap the XHR in a `Promise` and return it. Set `uploading = false` in both success and error paths (use `try/finally`).
5. Reset `progress` to 0 at the start of each upload.

**Output to disk:** one file, ~70 lines.

---

## Step 9 — `ImageUploadForm.tsx` (the wizard)

**Purpose:** Orchestrates the whole flow. Owns the wizard state machine.

**Props:** none (page-level component, or accepts `defaultContentType` / `defaultObjectId` if embedded into a product detail page later).

**State shape:**

```typescript
type Stage =
  | "form"
  | "compressing"
  | "cropping"
  | "preview"
  | "uploading"
  | "done";

interface WizardState {
  stage: Stage;
  // Form fields
  contentType: string; // "books.book"
  objectId: string;
  aspectRatio: AspectRatio; // default "2:3"
  title: string;
  isPrimary: boolean;
  order: number;
  // File flow
  rawFile: File | null;
  compressed: CompressionResult | null;
  croppedBlob: Blob | null;
  // UI
  error: string | null;
}
```

**Stage transitions:**

1. **`form`** — User fills product type, object ID, aspect ratio. Bottom of form renders `<FileSourcePicker onFileSelected={handleFileSelected} disabled={!objectId || !contentType} />`.
2. **`compressing`** — Triggered by `handleFileSelected`. Validate file size against `VITE_MAX_UPLOAD_MB`. Show spinner with "Compressing image…". Call `compressImage(file)`. On success, store result, move to `cropping`. On failure, show error and return to `form`.
3. **`cropping`** — Render `<CropStep src={URL.createObjectURL(compressed.file)} aspectRatio={aspectRatio} onCropComplete={handleCropped} onCancel={resetToForm} />`.
4. **`preview`** — Render `<PreviewCard blob={croppedBlob} originalSize={compressed.originalSize} onUpload={handleUpload} onRecrop={() => setStage("cropping")} onReset={resetToForm} />`.
5. **`uploading`** — Same `PreviewCard` but with `uploading={true}` and `uploadProgress` from the hook.
6. **`done`** — Success message with the returned image ID. Button "Upload another" resets to `form` (keeps product type / object ID for convenience, clears file state).

**Form field UI contract:**

- **Content type** — dropdown. For now, hard-code these options matching backend models: `books.book`, `books.coin`, `books.stamp`, `courses.course`. Document in a comment that this list grows as new product types are added.
- **Object ID** — text input. Placeholder: "UUID or numeric ID of the product".
- **Aspect ratio** — dropdown built from `ASPECT_RATIO_KEYS`, showing `label` + `usage` from the map. Default-selects an aspect based on `contentType`:
  - `books.book` → `2:3`
  - `books.coin`, `books.stamp` → `1:1`
  - `courses.course` → `16:9`
  - everything else → `2:3`
- **Title** — text input (optional, used as alt text).
- **Order** — number input (default 0).
- **Is primary** — checkbox.

**Validation before allowing file pick:**

- `contentType` and `objectId` must be non-empty. If not, the `FileSourcePicker` is disabled.
- Display the chosen aspect ratio with a small visual preview rectangle (a div sized 60 × `60/aspect` px with a border) so the user sees what they're committing to before opening their camera.

**Cleanup:** Use `useEffect` cleanup to revoke any `URL.createObjectURL` URLs when the component unmounts or the wizard resets.

**Output to disk:** one file, ~250 lines (this is the biggest file in the set).

---

## Step 10 — `ProductImageDashboard.tsx`

**Purpose:** The `/dash/product-images` page. Hosts the upload form and (eventually) a grid of existing images. For this plan, the agent builds the upload section. The grid section is a stub with a TODO comment — it will be built in a follow-up task.

**Implementation contract:**

```tsx
export default function ProductImageDashboard() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-medium">Product images</h1>
        <p className="text-sm text-gray-600 mt-1">
          Upload product photos. Variants and CDN URLs are generated
          automatically.
        </p>
      </header>

      <section className="mb-12">
        <h2 className="text-lg font-medium mb-4">Upload new image</h2>
        <ImageUploadForm />
      </section>

      <section>
        <h2 className="text-lg font-medium mb-4">Recent uploads</h2>
        {/* TODO: render grid of ProductImage records, poll until status=done */}
        <div className="text-sm text-gray-500">
          Grid coming in next iteration.
        </div>
      </section>
    </div>
  );
}
```

**Routing:** Add the route to whatever router the project uses (React Router, TanStack Router, etc.). The agent does NOT modify routing config without first viewing the existing router file and reporting the change.

---

## Step 11 — Wire-up checklist (agent runs through these in order)

After all files are written, the agent verifies each item:

1. `pnpm install` completed without errors. `browser-image-compression` and `react-image-crop` appear in `node_modules`.
2. `pnpm tsc --noEmit` (or equivalent) reports zero type errors across the new files.
3. `pnpm build` succeeds.
4. Run `pnpm dev` and open the dashboard route. The form renders. Both buttons appear.
5. On desktop browser: click "Take photo" → file picker opens (capture attribute ignored, no error).
6. On desktop browser: pick a 5MB JPEG → spinner appears → crop UI appears → crop → preview shows → upload (stubbed if no backend).

If any check fails, the agent reports the specific failure and stops. Does not attempt to fix unrelated issues.

---

## Step 12 — Testing checklist (manual, post-build)

Same as Step 14 in the backend plan, plus:

1. **Mobile iPhone, Safari:** open `/dash/product-images`. Tap "Take photo" → native camera opens. Shoot a portrait photo (HEIC by default).
   - Verify: spinner appears, then crop UI. File arrived as JPEG (check network tab — `multipart/form-data` boundary shows `filename=*.jpg`).
   - Verify: crop frame is locked to chosen aspect ratio.
   - Verify: uploaded payload is under 2 MB.
2. **Mobile Android, Chrome:** same as above. Verify rear camera opens (not selfie).
3. **Mobile, "Choose file":** verify it opens photo library, not camera.
4. **Desktop, both buttons:** verify both fall back to file picker. No console errors.
5. **Re-crop button:** click after first crop, verify the same source image reopens (don't re-compress).
6. **Cancel during crop:** returns to form with file state cleared.
7. **Aspect ratio change:** changing the dropdown after selecting a file does NOT silently re-crop. Either the agent locks the dropdown after file selection, OR adds a confirmation "Changing aspect will discard your crop. Continue?" — agent picks one and documents the choice in a comment.
8. **Upload failure:** simulate 500 from backend → error appears in `PreviewCard`, "Upload" button re-enabled, no stuck state.

---

## Step 13 — What the agent must NOT do

These are common failure modes. Each is listed as a hard rule.

1. **Do not switch package managers.** If the project uses pnpm, do not run `npm install`. If it uses npm, do not run `pnpm add`.
2. **Do not upgrade React, Vite, TypeScript, or other existing dependencies.** Only install the two new packages.
3. **Do not invent new aspect ratios.** The 5 in `aspectRatios.ts` match the backend exactly. Adding a 6th here will break server-side validation.
4. **Do not skip the `react-image-crop` CSS import.** Without it the crop overlay is invisible. Triple-check this in `CropStep.tsx`.
5. **Do not use `fetch` for the upload if progress reporting matters.** Use `XMLHttpRequest`. The hook contract depends on this.
6. **Do not omit `useWebWorker: true`** in the compression call. Without it the UI freezes for several seconds on large phone photos.
7. **Do not handle HEIC server-side as well.** The whole point of client compression is to keep the Django stack simple. If the agent feels the urge to add `pillow-heif` to the backend, stop and re-read the previous plan.
8. **Do not store `File` objects in React state for long-lived components.** Memory pressure on mobile is real. Once `compressed.file` exists, the original `rawFile` can be dropped from state.
9. **Do not `URL.createObjectURL` without `URL.revokeObjectURL` in cleanup.** Each unrevoked URL pins the blob in memory until tab close.
10. **Do not add a backend HEIC handler "just in case".** That contradicts the previous plan and adds a libheif system dependency to the VPS.

---

## Step 14 — Files the agent will create

Summary table for the agent to tick off:

| #   | Path                                         | Approx lines | Purpose                      |
| --- | -------------------------------------------- | ------------ | ---------------------------- |
| 1   | `src/lib/aspectRatios.ts`                    | 20           | Aspect ratio constants       |
| 2   | `src/lib/api.ts`                             | 20           | API wrapper (skip if exists) |
| 3   | `src/components/upload/FileSourcePicker.tsx` | 60           | Camera + file buttons        |
| 4   | `src/components/upload/ImageCompressor.ts`   | 50           | Compression helper           |
| 5   | `src/components/upload/CropStep.tsx`         | 80           | Crop UI                      |
| 6   | `src/components/upload/PreviewCard.tsx`      | 80           | Final preview                |
| 7   | `src/components/upload/useImageUpload.ts`    | 70           | Upload hook (XHR + progress) |
| 8   | `src/components/upload/ImageUploadForm.tsx`  | 250          | Wizard orchestrator          |
| 9   | `src/pages/ProductImageDashboard.tsx`        | 40           | Page route                   |
| -   | `.env.example` (append only)                 | +4 lines     | Env documentation            |
| -   | `package.json`                               | +2 deps      | Via `pnpm add`               |

Total new code: ~670 lines across 9 files.

---

## Step 15 — Reporting back

After completing the plan, the agent reports:

1. List of files created with line counts.
2. `pnpm tsc` output (must be clean).
3. `pnpm build` output (must succeed).
4. Screenshots or descriptions of the wizard at each stage (form, cropping, preview).
5. Any deviations from this plan, with justification. Examples of acceptable deviations: project uses styled-components instead of Tailwind, project uses zustand instead of useState, project has its own `api.ts` wrapper. Examples of unacceptable deviations: adding a new dependency, changing the aspect ratio list, skipping the compression step.

If any step is unclear, the agent stops and asks before improvising.

---

**This concludes the frontend implementation plan. Combined with the previous backend plan, the agent now has end-to-end instructions for: Django models + Celery pipeline + Bunny storage (backend) and Vite/React wizard with camera + compression + cropping (frontend).**


---

# google-books-api-key.txt : todo

_Source: `prd/todo/isbn-meta-data-extraction/google-books-api-key.txt`_


# Use this key in your application by passing it with the key=API_KEY parameter.
GOOGLE_BOOKS_API_KEY="AIzaSyB7PHsiqb8mTe_K5-gTxYCz1sf8awFFYVE"


---

# isbn-meta-data-extraction.md : todo

_Source: `prd/todo/isbn-meta-data-extraction/isbn-meta-data-extraction.md`_

# PRD: ISBN Metadata Resolver Service

**Audience:** AI coding agents and human developers implementing this system
**Author:** GrandAppStudio (Napoleon Arouldas)
**Status:** Draft v1.0
**Stack:** Django + Python, Celery + Redis, Bunny Storage/CDN, AWS Lightsail VPS

---

## 1. Purpose

Build a Django service that, given an ISBN-10 or ISBN-13, returns enriched book metadata (title, authors, description, edition, cover type, publisher, year, page count, pricing) along with normalized, self-hosted cover images in multiple sizes and formats. The system must achieve **95–97% coverage at near-zero cost**, with a documented upgrade path to ~99% via paid sources and crowdsourced fallback.

This PRD is the single source of truth for implementation. Every section is a build task. Follow them in order.

---

## 2. Non-Goals

- Not a public-facing book search engine. Lookup is by ISBN only.
- Not real-time price tracking. Pricing is snapshot-at-fetch.
- Not a reviews/ratings aggregator.
- Not OCR/barcode scanning (caller is responsible for providing a clean ISBN string).

---

## 3. Success Criteria

| Metric                                                    | Target        |
| --------------------------------------------------------- | ------------- |
| Coverage (any valid ISBN returns ≥title + author + cover) | ≥95%          |
| P50 latency, cache hit                                    | <50 ms        |
| P50 latency, cache miss (full cascade)                    | <4 s          |
| P95 latency, cache miss                                   | <10 s         |
| Cost per 1,000 lookups (steady state)                     | <₹10 (~$0.12) |
| Image storage per book (all sizes, both formats)          | <250 KB       |

---

## 4. External Services & APIs

### 4.1 Free, no-auth (Tier 1)

| Service                | Endpoint                                                                       | Limits                                | Used for                                                                           |
| ---------------------- | ------------------------------------------------------------------------------ | ------------------------------------- | ---------------------------------------------------------------------------------- |
| Google Books API       | `https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn}`                    | 1K/day no key, 100K/day with free key | title, authors, description, publisher, year, pages, categories, covers (S/M/L/XL) |
| Open Library Books API | `https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}&format=json&jscmd=data` | ~100 req/min polite cap               | metadata, editions, physical format                                                |
| Open Library Covers    | `https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg`                           | Same polite cap                       | cover images (S/M/L)                                                               |

### 4.2 Free with registration (Tier 2)

| Service              | Notes                                                             |
| -------------------- | ----------------------------------------------------------------- |
| Google Books API Key | Free, raises quota to 100K/day. Register at Google Cloud Console. |
| WorldCat Search API  | Free with OCLC key, slow approval. Optional.                      |

### 4.3 Paid (Tier 3, optional)

| Service | Pricing               | Used for                                                                        |
| ------- | --------------------- | ------------------------------------------------------------------------------- |
| ISBNdb  | ~$15/mo (10K queries) | binding type (paperback/hardcover), dimensions, MSRP — fields free sources miss |

### 4.4 India-specific fallback (Tier 4)

Manual / crowdsourced. Donor or seller submits a phone photo + form. No external API.

---

## 5. External Libraries Required

### 5.1 System-level (apt / OS packages)

```bash
apt-get install -y \
    libjpeg-dev \
    zlib1g-dev \
    libwebp-dev \
    libtiff-dev \
    libfreetype6-dev \
    libpq-dev \
    redis-server
```

- `libjpeg-dev`, `libwebp-dev`, `libtiff-dev`, `zlib1g-dev` — Pillow image format support
- `libfreetype6-dev` — Pillow font rendering (for placeholder covers)
- `libpq-dev` — psycopg2 build dependency
- `redis-server` — Celery broker + result backend + ISBN cache layer

### 5.2 External CLI tools (optional but recommended)

- **ImageMagick** (`apt install imagemagick`) — fallback image processor if Pillow chokes on a malformed JPEG
- **exiftool** (`apt install libimage-exiftool-perl`) — strip metadata from downloaded covers

---

## 6. Python / Django Packages Required

Pin versions at install time; the list below is for `requirements.txt`.

### 6.1 Core framework

```
Django>=5.0,<5.2
djangorestframework>=3.15
django-environ>=0.11
psycopg2-binary>=2.9
```

### 6.2 Async tasks & caching

```
celery>=5.4
redis>=5.0
django-redis>=5.4
django-celery-beat>=2.6        # periodic refresh jobs
django-celery-results>=2.5      # task result persistence (optional)
```

### 6.3 HTTP & resilience

```
httpx>=0.27                     # async HTTP, preferred over requests
requests>=2.32                  # sync fallback
tenacity>=8.5                   # retry decorators with exponential backoff
ratelimit>=2.2                  # per-source rate limiting
```

### 6.4 ISBN handling

```
python-stdnum>=1.20             # ISBN validation, 10↔13 conversion, checksum
```

### 6.5 Image processing

```
Pillow>=10.4                    # primary image lib (JPEG, PNG, WebP)
pillow-heif>=0.18               # HEIC support if donors upload iPhone photos
```

### 6.6 Storage (Bunny)

```
boto3>=1.34                     # Bunny Storage exposes S3-compatible API; or use raw httpx
```

### 6.7 Observability & ops

```
sentry-sdk>=2.10                # error tracking
structlog>=24.1                 # structured logging
django-extensions>=3.2          # shell_plus, runserver_plus
```

### 6.8 Dev / test

```
pytest>=8.3
pytest-django>=4.8
pytest-asyncio>=0.23
responses>=0.25                 # mock requests
respx>=0.21                     # mock httpx
factory-boy>=3.3
freezegun>=1.5
```

---

## 7. Architecture Overview

```
                       ┌──────────────────────┐
   ISBN ─────────────▶ │  resolve_isbn(isbn)  │
                       └──────────┬───────────┘
                                  │
                  ┌───────────────┴────────────────┐
                  ▼                                ▼
        ┌─────────────────┐              ┌──────────────────┐
        │ ISBN Normalize  │              │  DB Cache Check  │ ── hit ──▶ return
        │ (stdnum)        │              │  (Book by 10/13) │
        └────────┬────────┘              └────────┬─────────┘
                 │                                │ miss
                 ▼                                ▼
                       ┌──────────────────────────┐
                       │  Source Cascade (Celery) │
                       │  ┌────────┐ ┌─────────┐  │
                       │  │ Google │ │ OpenLib │  │  parallel
                       │  └────┬───┘ └────┬────┘  │
                       │       └────┬─────┘       │
                       │            ▼             │
                       │   Field-priority merge   │
                       │            │             │
                       │   Completeness check     │
                       │            │             │
                       │   Tier 2/3 if incomplete │
                       └────────────┬─────────────┘
                                    ▼
                       ┌──────────────────────────┐
                       │  Cover pipeline          │
                       │  download → resize →     │
                       │  WebP+JPEG → Bunny CDN   │
                       └────────────┬─────────────┘
                                    ▼
                       ┌──────────────────────────┐
                       │  Persist Book + Covers   │
                       │  Cache in Redis (30d)    │
                       └────────────┬─────────────┘
                                    ▼
                              Return payload
```

---

## 8. Data Model

Implement these as Django models. SQL types are PostgreSQL.

### 8.1 `Book`

| Field                    | Type                                     | Notes                                                                         |
| ------------------------ | ---------------------------------------- | ----------------------------------------------------------------------------- |
| `id`                     | BigAutoField PK                          |                                                                               |
| `isbn_10`                | CharField(10), unique, nullable, indexed |                                                                               |
| `isbn_13`                | CharField(13), unique, indexed           | always populated when derivable                                               |
| `title`                  | CharField(500)                           |                                                                               |
| `subtitle`               | CharField(500), blank                    |                                                                               |
| `description`            | TextField, blank                         |                                                                               |
| `publisher`              | CharField(255), blank                    |                                                                               |
| `published_date`         | CharField(20), blank                     | raw string; APIs return "2019", "2019-03", "2019-03-15"                       |
| `published_year`         | IntegerField, nullable, indexed          | parsed from above                                                             |
| `page_count`             | IntegerField, nullable                   |                                                                               |
| `language`               | CharField(10), blank                     | ISO 639-1                                                                     |
| `binding`                | CharField(50), blank                     | "paperback", "hardcover", "ebook", "unknown"                                  |
| `edition`                | CharField(100), blank                    |                                                                               |
| `categories`             | JSONField, default=list                  | list of strings                                                               |
| `list_price_inr`         | DecimalField(10,2), nullable             |                                                                               |
| `list_price_usd`         | DecimalField(10,2), nullable             |                                                                               |
| `metadata_quality_score` | IntegerField, default=0                  | 0–100; see §10                                                                |
| `sources`                | JSONField, default=dict                  | `{"google": {...raw}, "openlibrary": {...raw}}` for audit                     |
| `field_origins`          | JSONField, default=dict                  | `{"title": "google", "binding": "isbndb"}` — which source provided each value |
| `last_fetched_at`        | DateTimeField                            |                                                                               |
| `last_refreshed_at`      | DateTimeField, nullable                  |                                                                               |
| `is_stale`               | BooleanField, default=False              | flagged after 12 months                                                       |
| `manual_review_needed`   | BooleanField, default=False              |                                                                               |
| `created_at`             | auto                                     |                                                                               |
| `updated_at`             | auto                                     |                                                                               |

Indexes: `isbn_10`, `isbn_13`, `published_year`, `metadata_quality_score`, `(is_stale, last_fetched_at)`.

### 8.2 `Author`

| Field             | Type                    |
| ----------------- | ----------------------- | -------------------------------------- |
| `id`              | PK                      |
| `name`            | CharField(255), indexed |
| `normalized_name` | CharField(255), indexed | lowercase, accent-stripped, for dedupe |

### 8.3 `BookAuthor` (M2M through)

| Field    | Type          |
| -------- | ------------- | ----------------------------------------------- |
| `book`   | FK Book       |
| `author` | FK Author     |
| `order`  | IntegerField  | preserve author order                           |
| `role`   | CharField(50) | "author", "editor", "translator", "illustrator" |

Unique constraint on `(book, author, role)`.

### 8.4 `BookCover`

| Field         | Type           | Notes                                               |
| ------------- | -------------- | --------------------------------------------------- |
| `book`        | FK Book        |                                                     |
| `size`        | CharField(20)  | "thumbnail", "small", "medium", "large", "original" |
| `format`      | CharField(10)  | "webp", "jpeg"                                      |
| `width`       | IntegerField   |                                                     |
| `height`      | IntegerField   |                                                     |
| `bytes`       | IntegerField   |                                                     |
| `cdn_url`     | URLField(500)  | Bunny CDN URL                                       |
| `storage_key` | CharField(500) | path in Bunny Storage                               |
| `source`      | CharField(50)  | "google", "openlibrary", "manual"                   |
| `created_at`  | auto           |                                                     |

Unique constraint on `(book, size, format)`.

### 8.5 `ISBNLookupLog`

For analytics, debugging, and quota tracking.

| Field         | Type                   |
| ------------- | ---------------------- | -------------------------------------- |
| `isbn`        | CharField(13), indexed |
| `source`      | CharField(50)          |
| `status`      | CharField(20)          | "hit", "miss", "error", "rate_limited" |
| `latency_ms`  | IntegerField           |
| `http_status` | IntegerField, nullable |
| `error`       | TextField, blank       |
| `created_at`  | auto, indexed          |

### 8.6 `ISBNNotFoundCache`

Track ISBNs that returned nothing, so we don't retry constantly.

| Field             | Type                  |
| ----------------- | --------------------- | -------------------------------- |
| `isbn_13`         | CharField(13), unique |
| `attempts`        | IntegerField          |                                  |
| `last_attempt_at` | DateTimeField         |
| `retry_after`     | DateTimeField         | exponential: 1d → 7d → 30d → 90d |

---

## 9. Step-by-Step Implementation Tasks

Execute in this order. Each step is independently testable.

### Phase 0 — Project setup

- [ ] **0.1** Create new Django app: `python manage.py startapp isbn_resolver`
- [ ] **0.2** Add to `INSTALLED_APPS`: `'isbn_resolver'`, `'rest_framework'`, `'django_celery_beat'`
- [ ] **0.3** Configure environment via `django-environ`. Required env vars:
  - `DATABASE_URL`
  - `REDIS_URL`
  - `GOOGLE_BOOKS_API_KEY` (optional, raises quota)
  - `ISBNDB_API_KEY` (optional, Tier 3)
  - `BUNNY_STORAGE_ZONE`
  - `BUNNY_STORAGE_ACCESS_KEY`
  - `BUNNY_CDN_HOSTNAME`
  - `SENTRY_DSN`
- [ ] **0.4** Configure Celery (`celery.py` at project root) with Redis broker and result backend. Define queues: `default`, `enrichment`, `images`.
- [ ] **0.5** Configure structlog for JSON logs in production, pretty logs in dev.
- [ ] **0.6** Add Sentry init in `settings.py`.

### Phase 1 — ISBN normalization

- [ ] **1.1** Create `isbn_resolver/utils/isbn.py` with:
  - `clean(raw: str) -> str` — strip whitespace, hyphens, "ISBN:" prefix, uppercase any 'X' check digit
  - `validate(isbn: str) -> bool` — uses `stdnum.isbn.is_valid`
  - `to_isbn13(isbn: str) -> str` — uses `stdnum.isbn.to_isbn13`
  - `to_isbn10(isbn: str) -> str | None` — `stdnum.isbn.to_isbn10`; None if ISBN-13 starts with 979
  - `normalize(raw: str) -> dict` — returns `{"isbn_10": ..., "isbn_13": ...}`, raises `InvalidISBN` if bad checksum
- [ ] **1.2** Unit tests covering: valid 10, valid 13, invalid checksum, hyphenated input, lowercase 'x', empty string, 979-prefix (no ISBN-10 form).

### Phase 2 — Source adapter framework

- [ ] **2.1** Define `isbn_resolver/sources/base.py`:

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass, field

@dataclass
class SourceResult:
    found: bool
    raw: dict = field(default_factory=dict)
    normalized: dict = field(default_factory=dict)  # canonical schema
    cover_urls: list[dict] = field(default_factory=list)  # [{"url": ..., "size_hint": "large"}]
    source: str = ""
    latency_ms: int = 0
    error: str | None = None

class BookSource(ABC):
    name: str = ""
    priority: int = 100  # lower = higher priority
    enabled: bool = True

    @abstractmethod
    async def fetch(self, isbn_13: str) -> SourceResult: ...
```

- [ ] **2.2** Define canonical normalized schema (`isbn_resolver/sources/schema.py`) — same field names as `Book` model. Every adapter must map to this.
- [ ] **2.3** Add `tenacity` retry decorator with exponential backoff (2s, 4s, 8s) on transient HTTP errors (5xx, timeouts). Do NOT retry on 404.
- [ ] **2.4** Add per-source rate limiter using `ratelimit` (Open Library: 100/min; Google: 100/100s default).
- [ ] **2.5** Wrap every fetch in a `try/except` that logs to `ISBNLookupLog`.

### Phase 3 — Source adapters

- [ ] **3.1** `GoogleBooksSource` (`sources/google_books.py`)
  - Fetch `https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn_13}&key={key}`
  - Map fields: `volumeInfo.title`, `subtitle`, `authors[]`, `publisher`, `publishedDate`, `description`, `pageCount`, `categories[]`, `language`, `imageLinks.{smallThumbnail, thumbnail, small, medium, large, extraLarge}`
  - Handle missing volumeInfo gracefully
- [ ] **3.2** `OpenLibrarySource` (`sources/open_library.py`)
  - Fetch `https://openlibrary.org/api/books?bibkeys=ISBN:{isbn_13}&format=json&jscmd=data`
  - Map fields: `title`, `subtitle`, `authors[].name`, `publishers[].name`, `publish_date`, `number_of_pages`, `physical_format` → `binding`, `subjects[].name` → `categories`, `cover.{small,medium,large}`
- [ ] **3.3** `ISBNdbSource` (`sources/isbndb.py`) — only if `ISBNDB_API_KEY` is set
  - Fetch `https://api2.isbndb.com/book/{isbn}` with `Authorization: {key}` header
  - Map fields, including `binding`, `dimensions`, `msrp`
- [ ] **3.4** Per adapter, write tests using `respx` to mock responses. Include real fixtures captured from each API (one popular book, one Indian book, one missing book).

### Phase 4 — Cascade orchestrator

- [ ] **4.1** Create `isbn_resolver/orchestrator.py` with `async def cascade(isbn_13: str) -> dict`
- [ ] **4.2** Logic:
  1. Run Tier 1 sources (Google + Open Library) **in parallel** with `asyncio.gather`.
  2. Merge results using field-priority map (see 4.3).
  3. Compute completeness score (see §10). If ≥80, stop. Else escalate.
  4. If Tier 3 configured, call ISBNdb. Re-merge.
  5. Return merged dict.
- [ ] **4.3** Field priority map in `settings.py`:

```python
FIELD_SOURCE_PRIORITY = {
    "title":           ["google", "isbndb", "openlibrary"],
    "subtitle":        ["google", "isbndb", "openlibrary"],
    "description":     ["google", "openlibrary", "isbndb"],
    "authors":         ["google", "openlibrary", "isbndb"],
    "publisher":       ["openlibrary", "google", "isbndb"],
    "published_date":  ["google", "openlibrary", "isbndb"],
    "page_count":      ["google", "openlibrary", "isbndb"],
    "categories":      ["google", "openlibrary"],
    "language":        ["google", "openlibrary"],
    "binding":         ["isbndb", "openlibrary"],
    "list_price_usd":  ["isbndb", "google"],
    "cover":           ["openlibrary", "google", "isbndb"],
}
```

- [ ] **4.4** Merger: for each field, walk priority list, take first non-null value, record origin in `field_origins`.
- [ ] **4.5** Tests: cascade with all sources hit, cascade with Tier 1 sufficient, cascade with all sources missing, source-disagreement scenarios.

### Phase 5 — Cover image pipeline

- [ ] **5.1** Create `isbn_resolver/covers/fetcher.py`
  - `async fetch_best_cover(cover_candidates: list[dict]) -> tuple[bytes, str]`
  - Try candidates in order (largest first). Validate it's a real image (min 100×150, not the "no cover" placeholder Google returns).
  - Return raw bytes + MIME type.
- [ ] **5.2** Detect Google's "no image" placeholder by hashing known placeholder bytes; reject.
- [ ] **5.3** Create `isbn_resolver/covers/processor.py`
  - `process_cover(raw: bytes, isbn_13: str) -> list[CoverVariant]`
  - Strip EXIF on load.
  - Generate sizes: thumbnail (150×225), small (300×450), medium (600×900), large (1200×1800).
  - Maintain aspect ratio; pad with neutral background if source aspect is off.
  - For each size, emit WebP (q=80) and JPEG (q=85, progressive).
  - Skip "large" if source is smaller than 1200px wide (don't upscale).
- [ ] **5.4** Create `isbn_resolver/covers/storage.py`
  - Upload to Bunny Storage at key `covers/{isbn_13[:3]}/{isbn_13}/{size}.{format}`. The `[:3]` prefix shards across folders for large catalogues.
  - Return public CDN URL: `https://{BUNNY_CDN_HOSTNAME}/{storage_key}`
- [ ] **5.5** Placeholder cover generator: if no cover found from any source, render a Pillow-generated placeholder showing title + author in neutral colors. Store as `source="generated"`.
- [ ] **5.6** Tests: process real JPEG, process malformed image (should not crash), process tiny image (no upscale), Bunny upload mocked.

### Phase 6 — Resolver service + persistence

- [ ] **6.1** Create `isbn_resolver/service.py` with `resolve_isbn(raw_isbn: str, force_refresh: bool = False) -> Book`
- [ ] **6.2** Flow:
  1. Normalize ISBN (Phase 1).
  2. If `not force_refresh`: check DB for existing `Book` by `isbn_13` or `isbn_10`. If found and not `is_stale`, return.
  3. Check `ISBNNotFoundCache`. If `retry_after > now()`, raise `BookNotFound`.
  4. Check Redis short-cache (`isbn_resolver:miss:{isbn}`, 24h TTL).
  5. Run cascade (Phase 4) — call via `asyncio.run` inside Celery task, or expose sync wrapper.
  6. If no data: increment `ISBNNotFoundCache.attempts`, set `retry_after` via backoff schedule, raise `BookNotFound`.
  7. Run cover pipeline (Phase 5).
  8. Persist `Book`, `Author`s, `BookAuthor`s, `BookCover`s in a transaction.
  9. Set Redis cache for the full payload (30 day TTL).
  10. Return `Book` instance.
- [ ] **6.3** Author deduplication: normalize name (lowercase, strip accents via `unicodedata.normalize('NFKD', ...).encode('ascii', 'ignore')`), match on `normalized_name`. Create if missing.

### Phase 7 — Async tasks (Celery)

- [ ] **7.1** Create `isbn_resolver/tasks.py`:
  - `@shared_task def enrich_isbn_task(isbn: str, force_refresh: bool = False)`
  - `@shared_task def refresh_stale_books_task()` — finds books with `last_fetched_at < now - 1y`, enqueues re-enrichment in batches of 50
  - `@shared_task def cleanup_not_found_cache_task()` — purges entries older than 6 months
- [ ] **7.2** Configure Celery Beat schedules in `settings.py`:
  - `refresh_stale_books_task`: daily at 2 AM
  - `cleanup_not_found_cache_task`: weekly Sunday 3 AM
- [ ] **7.3** Set task `max_retries=3`, `default_retry_delay=60`, `acks_late=True`.

### Phase 8 — REST API

- [ ] **8.1** DRF endpoints (`isbn_resolver/api.py`):
  - `GET /api/v1/books/{isbn}/` — sync lookup, returns book or 404 (`?force_refresh=true` bypasses cache)
  - `POST /api/v1/books/enrich/` — body `{"isbn": "..."}` — enqueues async, returns task ID
  - `GET /api/v1/books/enrich/{task_id}/` — task status
  - `POST /api/v1/books/bulk/` — body `{"isbns": ["...", "..."]}` — bulk enqueue (max 100 per request)
- [ ] **8.2** Serializers: `BookSerializer` (with nested authors, covers as dict of `{size: {webp: url, jpeg: url}}`).
- [ ] **8.3** Throttle: `100/hour` for unauthenticated, `10000/hour` for authenticated. Use DRF's throttle classes.
- [ ] **8.4** OpenAPI schema via `drf-spectacular` (add to packages if you want this).

### Phase 9 — Admin

- [ ] **9.1** Register `Book`, `Author`, `BookCover`, `ISBNLookupLog`, `ISBNNotFoundCache` in Django admin.
- [ ] **9.2** `BookAdmin` list display: `isbn_13`, `title`, primary author, `binding`, `metadata_quality_score`, `last_fetched_at`, cover thumbnail.
- [ ] **9.3** Admin actions:
  - "Re-enrich selected books" (triggers `enrich_isbn_task` with `force_refresh=True`)
  - "Mark as manual review needed"
  - "Regenerate covers" (re-run Phase 5 with stored original)

### Phase 10 — Manual fallback workflow

- [ ] **10.1** When `metadata_quality_score < 50` after cascade, set `manual_review_needed=True`.
- [ ] **10.2** Admin filter "Needs review" surfaces these.
- [ ] **10.3** Admin form allows manual upload of cover image + correction of fields. Manual cover uploads bypass cascade, go directly to Phase 5 processing.
- [ ] **10.4** (Optional) Public-facing form for sellers/donors to submit corrections, tied to your PutForShare flow.

### Phase 11 — Observability

- [ ] **11.1** Structlog event for every lookup: `isbn`, `source`, `cache_hit`, `latency_ms`, `quality_score`.
- [ ] **11.2** Daily metrics rollup task: emits to logs:
  - Lookups today (total, hit, miss)
  - Per-source success rate
  - Per-source avg latency
  - New books enriched
  - Covers downloaded (count, total bytes)
- [ ] **11.3** Sentry: all unhandled exceptions in tasks and API.
- [ ] **11.4** Health check endpoint `GET /healthz/` validates: DB, Redis, Bunny reachability.

### Phase 12 — Tests & CI

- [ ] **12.1** pytest config (`pytest.ini`), with `DJANGO_SETTINGS_MODULE=config.settings.test`.
- [ ] **12.2** Factories (`factory-boy`) for `Book`, `Author`, `BookCover`.
- [ ] **12.3** Fixture set: 20 captured real API responses across `tests/fixtures/`.
- [ ] **12.4** Integration test: end-to-end resolve with all external HTTP mocked via `respx`.
- [ ] **12.5** GitHub Actions workflow:
  - Lint (ruff)
  - Type check (mypy, optional)
  - Test (pytest, with PostgreSQL + Redis services)
  - Coverage threshold ≥80%
- [ ] **12.6** Coverage acceptance test: against a known fixture set of 100 ISBNs, assert cascade returns acceptable metadata for ≥95.

### Phase 13 — Deployment

- [ ] **13.1** Dockerfile (multi-stage: builder installs deps, runtime is slim).
- [ ] **13.2** `docker-compose.yml` for local dev: web, celery worker, celery beat, redis, postgres.
- [ ] **13.3** Hetzner VPS deploy:
  - Nginx → Gunicorn (web)
  - Systemd units for `celery worker`, `celery beat`
  - Symlink-swap zero-downtime deploy script (you have this pattern already)
- [ ] **13.4** Bunny CDN pull zone configured to point at Bunny Storage zone. Cache TTL: 30 days for images.
- [ ] **13.5** Cloudflare in front of API (DDoS, rate limiting at edge).

---

## 10. Quality Scoring

`metadata_quality_score` is computed at persist time. Each present field contributes points:

| Field                    | Points  |
| ------------------------ | ------- |
| title                    | 15      |
| ≥1 author                | 15      |
| description (≥100 chars) | 15      |
| cover (any size)         | 15      |
| publisher                | 8       |
| published_year           | 8       |
| page_count               | 8       |
| binding                  | 8       |
| categories (≥1)          | 4       |
| language                 | 2       |
| list price               | 2       |
| **Total possible**       | **100** |

Thresholds:

- ≥80 — sufficient, stop cascade
- 50–79 — usable, but try Tier 3 if available
- <50 — flag `manual_review_needed=True`

---

## 11. Image Strategy Decisions

These decisions are final. Do not deviate.

| Decision                       | Choice                                                            | Reason                                                     |
| ------------------------------ | ----------------------------------------------------------------- | ---------------------------------------------------------- |
| Download 1 image or all sizes? | **Download largest available, resize ourselves**                  | Consistent UX, control over quality, no hot-link fragility |
| Output formats                 | **WebP (primary) + JPEG (fallback)**                              | WebP ~30% smaller at same quality; JPEG for legacy clients |
| Skip AVIF?                     | **Yes for v1**                                                    | Encoding slow; gains marginal for low-detail book covers   |
| Sizes generated                | thumbnail 150×225, small 300×450, medium 600×900, large 1200×1800 | Covers ~all UI needs from grid to zoom                     |
| Upscale beyond source?         | **No**                                                            | Skip "large" size if source <1200px wide                   |
| Strip EXIF?                    | **Yes**                                                           | Smaller files, privacy                                     |
| Store original?                | **Yes**                                                           | Regenerate sizes/formats later without re-fetching         |
| Hot-link from APIs?            | **Never in production**                                           | URLs expire; rate limits apply; offline-fragile            |
| Quality settings               | WebP q=80, JPEG q=85 progressive                                  | Sweet spot for cover-style imagery                         |
| Storage path scheme            | `covers/{isbn_13[:3]}/{isbn_13}/{size}.{format}`                  | Shards across folders, predictable                         |

---

## 12. Caching Strategy

| Layer                                  | TTL                                              | Purpose                               |
| -------------------------------------- | ------------------------------------------------ | ------------------------------------- |
| Redis hot cache (book payload by ISBN) | 30 days                                          | Sub-50ms reads                        |
| Redis miss cache                       | 24 hours                                         | Avoid retry storms on known-bad ISBNs |
| `ISBNNotFoundCache` (DB)               | Exponential backoff: 1d → 7d → 30d → 90d → never | Long-term suppression                 |
| `Book.is_stale` flag                   | 12 months                                        | Periodic refresh                      |
| Bunny CDN edge                         | 30 days                                          | Image delivery                        |

Invalidate Redis book cache on: manual admin edit, force_refresh, re-enrichment task completion.

---

## 13. Rate Limiting & Quota Management

| Source                  | Limit               | Implementation                              |
| ----------------------- | ------------------- | ------------------------------------------- |
| Google Books (no key)   | 1K/day              | Don't deploy without key                    |
| Google Books (with key) | 100K/day            | Token bucket; alert at 80% daily quota      |
| Open Library            | ~100 req/min polite | `ratelimit` decorator: 100/60s              |
| ISBNdb                  | per-plan            | Check headers, respect 429 with Retry-After |

If any source hits rate limit, mark it `temporarily_disabled` for 5 minutes in Redis; cascade skips it gracefully.

---

## 14. Security & Compliance

- API keys in env vars only, never committed.
- Rate-limit public API endpoints (DRF throttling).
- Validate ISBN before any external call (prevents injection via crafted ISBN).
- Strip all metadata from stored images.
- Google Books TOS: technically prohibits long-term storage of their data. Mitigation: prefer Open Library (CC0) when both have equivalent data; document `field_origins` so we can scrub Google-sourced data if ever required.
- GDPR/DPDP: this system stores no personal data, only public book metadata.

---

## 15. Out of Scope (v1)

- Multilingual metadata enrichment beyond what APIs return natively
- Audiobook / ebook format variants
- Live pricing feeds (Flipkart/Amazon scrapers)
- Reviews, ratings, recommendations
- Public search UI (lookup by ISBN only)
- ML-based cover deduplication across editions

---

## 16. Open Questions (resolve before Phase 6)

1. **Manual-review workflow UX**: standalone Django admin only, or also a public-facing donor form embedded in PutForShare?
2. **Pricing source for India**: skip entirely, use ISBNdb MSRP (USD-only), or build a Flipkart scraper as a separate Tier 4 service?
3. **Multi-tenant**: is ISBN data shared across all PutForShare sellers, or namespaced per seller? (Recommendation: shared. Book metadata is not seller-specific.)
4. **Refresh cadence**: is 12 months for stale flag correct, or should high-value (frequently-viewed) books refresh more often?

---

## 17. Definition of Done

- [ ] All 13 phases completed and merged.
- [ ] Coverage acceptance test passes on 100-ISBN fixture set (≥95 successful).
- [ ] P50 cache-hit latency <50 ms on staging.
- [ ] P50 cache-miss latency <4 s on staging.
- [ ] Documentation: README with setup, env vars, API examples.
- [ ] Runbook: how to handle quota exhaustion, how to re-enrich a book, how to add a new source.
- [ ] Deployed to staging on Hetzner, sanity-tested with 1,000 real ISBNs from PutForShare donor data.

---

_End of PRD._


---

# isbn-meta-data-extraction_combined_output.txt : todo

_Source: `prd/todo/isbn-meta-data-extraction/isbn-meta-data-extraction_combined_output.txt`_

==================================================
FILE: google-books-api-key.txt
==================================================


# Use this key in your application by passing it with the key=API_KEY parameter.
GOOGLE_BOOKS_API_KEY="AIzaSyB7PHsiqb8mTe_K5-gTxYCz1sf8awFFYVE"

==================================================
FILE: isbn-meta-data-extraction.md
==================================================

# PRD: ISBN Metadata Resolver Service

**Audience:** AI coding agents and human developers implementing this system
**Author:** GrandAppStudio (Napoleon Arouldas)
**Status:** Draft v1.0
**Stack:** Django + Python, Celery + Redis, Bunny Storage/CDN, AWS Lightsail VPS

---

## 1. Purpose

Build a Django service that, given an ISBN-10 or ISBN-13, returns enriched book metadata (title, authors, description, edition, cover type, publisher, year, page count, pricing) along with normalized, self-hosted cover images in multiple sizes and formats. The system must achieve **95–97% coverage at near-zero cost**, with a documented upgrade path to ~99% via paid sources and crowdsourced fallback.

This PRD is the single source of truth for implementation. Every section is a build task. Follow them in order.

---

## 2. Non-Goals

- Not a public-facing book search engine. Lookup is by ISBN only.
- Not real-time price tracking. Pricing is snapshot-at-fetch.
- Not a reviews/ratings aggregator.
- Not OCR/barcode scanning (caller is responsible for providing a clean ISBN string).

---

## 3. Success Criteria

| Metric                                                    | Target        |
| --------------------------------------------------------- | ------------- |
| Coverage (any valid ISBN returns ≥title + author + cover) | ≥95%          |
| P50 latency, cache hit                                    | <50 ms        |
| P50 latency, cache miss (full cascade)                    | <4 s          |
| P95 latency, cache miss                                   | <10 s         |
| Cost per 1,000 lookups (steady state)                     | <₹10 (~$0.12) |
| Image storage per book (all sizes, both formats)          | <250 KB       |

---

## 4. External Services & APIs

### 4.1 Free, no-auth (Tier 1)

| Service                | Endpoint                                                                       | Limits                                | Used for                                                                           |
| ---------------------- | ------------------------------------------------------------------------------ | ------------------------------------- | ---------------------------------------------------------------------------------- |
| Google Books API       | `https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn}`                    | 1K/day no key, 100K/day with free key | title, authors, description, publisher, year, pages, categories, covers (S/M/L/XL) |
| Open Library Books API | `https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}&format=json&jscmd=data` | ~100 req/min polite cap               | metadata, editions, physical format                                                |
| Open Library Covers    | `https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg`                           | Same polite cap                       | cover images (S/M/L)                                                               |

### 4.2 Free with registration (Tier 2)

| Service              | Notes                                                             |
| -------------------- | ----------------------------------------------------------------- |
| Google Books API Key | Free, raises quota to 100K/day. Register at Google Cloud Console. |
| WorldCat Search API  | Free with OCLC key, slow approval. Optional.                      |

### 4.3 Paid (Tier 3, optional)

| Service | Pricing               | Used for                                                                        |
| ------- | --------------------- | ------------------------------------------------------------------------------- |
| ISBNdb  | ~$15/mo (10K queries) | binding type (paperback/hardcover), dimensions, MSRP — fields free sources miss |

### 4.4 India-specific fallback (Tier 4)

Manual / crowdsourced. Donor or seller submits a phone photo + form. No external API.

---

## 5. External Libraries Required

### 5.1 System-level (apt / OS packages)

```bash
apt-get install -y \
    libjpeg-dev \
    zlib1g-dev \
    libwebp-dev \
    libtiff-dev \
    libfreetype6-dev \
    libpq-dev \
    redis-server
```

- `libjpeg-dev`, `libwebp-dev`, `libtiff-dev`, `zlib1g-dev` — Pillow image format support
- `libfreetype6-dev` — Pillow font rendering (for placeholder covers)
- `libpq-dev` — psycopg2 build dependency
- `redis-server` — Celery broker + result backend + ISBN cache layer

### 5.2 External CLI tools (optional but recommended)

- **ImageMagick** (`apt install imagemagick`) — fallback image processor if Pillow chokes on a malformed JPEG
- **exiftool** (`apt install libimage-exiftool-perl`) — strip metadata from downloaded covers

---

## 6. Python / Django Packages Required

Pin versions at install time; the list below is for `requirements.txt`.

### 6.1 Core framework

```
Django>=5.0,<5.2
djangorestframework>=3.15
django-environ>=0.11
psycopg2-binary>=2.9
```

### 6.2 Async tasks & caching

```
celery>=5.4
redis>=5.0
django-redis>=5.4
django-celery-beat>=2.6        # periodic refresh jobs
django-celery-results>=2.5      # task result persistence (optional)
```

### 6.3 HTTP & resilience

```
httpx>=0.27                     # async HTTP, preferred over requests
requests>=2.32                  # sync fallback
tenacity>=8.5                   # retry decorators with exponential backoff
ratelimit>=2.2                  # per-source rate limiting
```

### 6.4 ISBN handling

```
python-stdnum>=1.20             # ISBN validation, 10↔13 conversion, checksum
```

### 6.5 Image processing

```
Pillow>=10.4                    # primary image lib (JPEG, PNG, WebP)
pillow-heif>=0.18               # HEIC support if donors upload iPhone photos
```

### 6.6 Storage (Bunny)

```
boto3>=1.34                     # Bunny Storage exposes S3-compatible API; or use raw httpx
```

### 6.7 Observability & ops

```
sentry-sdk>=2.10                # error tracking
structlog>=24.1                 # structured logging
django-extensions>=3.2          # shell_plus, runserver_plus
```

### 6.8 Dev / test

```
pytest>=8.3
pytest-django>=4.8
pytest-asyncio>=0.23
responses>=0.25                 # mock requests
respx>=0.21                     # mock httpx
factory-boy>=3.3
freezegun>=1.5
```

---

## 7. Architecture Overview

```
                       ┌──────────────────────┐
   ISBN ─────────────▶ │  resolve_isbn(isbn)  │
                       └──────────┬───────────┘
                                  │
                  ┌───────────────┴────────────────┐
                  ▼                                ▼
        ┌─────────────────┐              ┌──────────────────┐
        │ ISBN Normalize  │              │  DB Cache Check  │ ── hit ──▶ return
        │ (stdnum)        │              │  (Book by 10/13) │
        └────────┬────────┘              └────────┬─────────┘
                 │                                │ miss
                 ▼                                ▼
                       ┌──────────────────────────┐
                       │  Source Cascade (Celery) │
                       │  ┌────────┐ ┌─────────┐  │
                       │  │ Google │ │ OpenLib │  │  parallel
                       │  └────┬───┘ └────┬────┘  │
                       │       └────┬─────┘       │
                       │            ▼             │
                       │   Field-priority merge   │
                       │            │             │
                       │   Completeness check     │
                       │            │             │
                       │   Tier 2/3 if incomplete │
                       └────────────┬─────────────┘
                                    ▼
                       ┌──────────────────────────┐
                       │  Cover pipeline          │
                       │  download → resize →     │
                       │  WebP+JPEG → Bunny CDN   │
                       └────────────┬─────────────┘
                                    ▼
                       ┌──────────────────────────┐
                       │  Persist Book + Covers   │
                       │  Cache in Redis (30d)    │
                       └────────────┬─────────────┘
                                    ▼
                              Return payload
```

---

## 8. Data Model

Implement these as Django models. SQL types are PostgreSQL.

### 8.1 `Book`

| Field                    | Type                                     | Notes                                                                         |
| ------------------------ | ---------------------------------------- | ----------------------------------------------------------------------------- |
| `id`                     | BigAutoField PK                          |                                                                               |
| `isbn_10`                | CharField(10), unique, nullable, indexed |                                                                               |
| `isbn_13`                | CharField(13), unique, indexed           | always populated when derivable                                               |
| `title`                  | CharField(500)                           |                                                                               |
| `subtitle`               | CharField(500), blank                    |                                                                               |
| `description`            | TextField, blank                         |                                                                               |
| `publisher`              | CharField(255), blank                    |                                                                               |
| `published_date`         | CharField(20), blank                     | raw string; APIs return "2019", "2019-03", "2019-03-15"                       |
| `published_year`         | IntegerField, nullable, indexed          | parsed from above                                                             |
| `page_count`             | IntegerField, nullable                   |                                                                               |
| `language`               | CharField(10), blank                     | ISO 639-1                                                                     |
| `binding`                | CharField(50), blank                     | "paperback", "hardcover", "ebook", "unknown"                                  |
| `edition`                | CharField(100), blank                    |                                                                               |
| `categories`             | JSONField, default=list                  | list of strings                                                               |
| `list_price_inr`         | DecimalField(10,2), nullable             |                                                                               |
| `list_price_usd`         | DecimalField(10,2), nullable             |                                                                               |
| `metadata_quality_score` | IntegerField, default=0                  | 0–100; see §10                                                                |
| `sources`                | JSONField, default=dict                  | `{"google": {...raw}, "openlibrary": {...raw}}` for audit                     |
| `field_origins`          | JSONField, default=dict                  | `{"title": "google", "binding": "isbndb"}` — which source provided each value |
| `last_fetched_at`        | DateTimeField                            |                                                                               |
| `last_refreshed_at`      | DateTimeField, nullable                  |                                                                               |
| `is_stale`               | BooleanField, default=False              | flagged after 12 months                                                       |
| `manual_review_needed`   | BooleanField, default=False              |                                                                               |
| `created_at`             | auto                                     |                                                                               |
| `updated_at`             | auto                                     |                                                                               |

Indexes: `isbn_10`, `isbn_13`, `published_year`, `metadata_quality_score`, `(is_stale, last_fetched_at)`.

### 8.2 `Author`

| Field             | Type                    |
| ----------------- | ----------------------- | -------------------------------------- |
| `id`              | PK                      |
| `name`            | CharField(255), indexed |
| `normalized_name` | CharField(255), indexed | lowercase, accent-stripped, for dedupe |

### 8.3 `BookAuthor` (M2M through)

| Field    | Type          |
| -------- | ------------- | ----------------------------------------------- |
| `book`   | FK Book       |
| `author` | FK Author     |
| `order`  | IntegerField  | preserve author order                           |
| `role`   | CharField(50) | "author", "editor", "translator", "illustrator" |

Unique constraint on `(book, author, role)`.

### 8.4 `BookCover`

| Field         | Type           | Notes                                               |
| ------------- | -------------- | --------------------------------------------------- |
| `book`        | FK Book        |                                                     |
| `size`        | CharField(20)  | "thumbnail", "small", "medium", "large", "original" |
| `format`      | CharField(10)  | "webp", "jpeg"                                      |
| `width`       | IntegerField   |                                                     |
| `height`      | IntegerField   |                                                     |
| `bytes`       | IntegerField   |                                                     |
| `cdn_url`     | URLField(500)  | Bunny CDN URL                                       |
| `storage_key` | CharField(500) | path in Bunny Storage                               |
| `source`      | CharField(50)  | "google", "openlibrary", "manual"                   |
| `created_at`  | auto           |                                                     |

Unique constraint on `(book, size, format)`.

### 8.5 `ISBNLookupLog`

For analytics, debugging, and quota tracking.

| Field         | Type                   |
| ------------- | ---------------------- | -------------------------------------- |
| `isbn`        | CharField(13), indexed |
| `source`      | CharField(50)          |
| `status`      | CharField(20)          | "hit", "miss", "error", "rate_limited" |
| `latency_ms`  | IntegerField           |
| `http_status` | IntegerField, nullable |
| `error`       | TextField, blank       |
| `created_at`  | auto, indexed          |

### 8.6 `ISBNNotFoundCache`

Track ISBNs that returned nothing, so we don't retry constantly.

| Field             | Type                  |
| ----------------- | --------------------- | -------------------------------- |
| `isbn_13`         | CharField(13), unique |
| `attempts`        | IntegerField          |                                  |
| `last_attempt_at` | DateTimeField         |
| `retry_after`     | DateTimeField         | exponential: 1d → 7d → 30d → 90d |

---

## 9. Step-by-Step Implementation Tasks

Execute in this order. Each step is independently testable.

### Phase 0 — Project setup

- [ ] **0.1** Create new Django app: `python manage.py startapp isbn_resolver`
- [ ] **0.2** Add to `INSTALLED_APPS`: `'isbn_resolver'`, `'rest_framework'`, `'django_celery_beat'`
- [ ] **0.3** Configure environment via `django-environ`. Required env vars:
  - `DATABASE_URL`
  - `REDIS_URL`
  - `GOOGLE_BOOKS_API_KEY` (optional, raises quota)
  - `ISBNDB_API_KEY` (optional, Tier 3)
  - `BUNNY_STORAGE_ZONE`
  - `BUNNY_STORAGE_ACCESS_KEY`
  - `BUNNY_CDN_HOSTNAME`
  - `SENTRY_DSN`
- [ ] **0.4** Configure Celery (`celery.py` at project root) with Redis broker and result backend. Define queues: `default`, `enrichment`, `images`.
- [ ] **0.5** Configure structlog for JSON logs in production, pretty logs in dev.
- [ ] **0.6** Add Sentry init in `settings.py`.

### Phase 1 — ISBN normalization

- [ ] **1.1** Create `isbn_resolver/utils/isbn.py` with:
  - `clean(raw: str) -> str` — strip whitespace, hyphens, "ISBN:" prefix, uppercase any 'X' check digit
  - `validate(isbn: str) -> bool` — uses `stdnum.isbn.is_valid`
  - `to_isbn13(isbn: str) -> str` — uses `stdnum.isbn.to_isbn13`
  - `to_isbn10(isbn: str) -> str | None` — `stdnum.isbn.to_isbn10`; None if ISBN-13 starts with 979
  - `normalize(raw: str) -> dict` — returns `{"isbn_10": ..., "isbn_13": ...}`, raises `InvalidISBN` if bad checksum
- [ ] **1.2** Unit tests covering: valid 10, valid 13, invalid checksum, hyphenated input, lowercase 'x', empty string, 979-prefix (no ISBN-10 form).

### Phase 2 — Source adapter framework

- [ ] **2.1** Define `isbn_resolver/sources/base.py`:

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass, field

@dataclass
class SourceResult:
    found: bool
    raw: dict = field(default_factory=dict)
    normalized: dict = field(default_factory=dict)  # canonical schema
    cover_urls: list[dict] = field(default_factory=list)  # [{"url": ..., "size_hint": "large"}]
    source: str = ""
    latency_ms: int = 0
    error: str | None = None

class BookSource(ABC):
    name: str = ""
    priority: int = 100  # lower = higher priority
    enabled: bool = True

    @abstractmethod
    async def fetch(self, isbn_13: str) -> SourceResult: ...
```

- [ ] **2.2** Define canonical normalized schema (`isbn_resolver/sources/schema.py`) — same field names as `Book` model. Every adapter must map to this.
- [ ] **2.3** Add `tenacity` retry decorator with exponential backoff (2s, 4s, 8s) on transient HTTP errors (5xx, timeouts). Do NOT retry on 404.
- [ ] **2.4** Add per-source rate limiter using `ratelimit` (Open Library: 100/min; Google: 100/100s default).
- [ ] **2.5** Wrap every fetch in a `try/except` that logs to `ISBNLookupLog`.

### Phase 3 — Source adapters

- [ ] **3.1** `GoogleBooksSource` (`sources/google_books.py`)
  - Fetch `https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn_13}&key={key}`
  - Map fields: `volumeInfo.title`, `subtitle`, `authors[]`, `publisher`, `publishedDate`, `description`, `pageCount`, `categories[]`, `language`, `imageLinks.{smallThumbnail, thumbnail, small, medium, large, extraLarge}`
  - Handle missing volumeInfo gracefully
- [ ] **3.2** `OpenLibrarySource` (`sources/open_library.py`)
  - Fetch `https://openlibrary.org/api/books?bibkeys=ISBN:{isbn_13}&format=json&jscmd=data`
  - Map fields: `title`, `subtitle`, `authors[].name`, `publishers[].name`, `publish_date`, `number_of_pages`, `physical_format` → `binding`, `subjects[].name` → `categories`, `cover.{small,medium,large}`
- [ ] **3.3** `ISBNdbSource` (`sources/isbndb.py`) — only if `ISBNDB_API_KEY` is set
  - Fetch `https://api2.isbndb.com/book/{isbn}` with `Authorization: {key}` header
  - Map fields, including `binding`, `dimensions`, `msrp`
- [ ] **3.4** Per adapter, write tests using `respx` to mock responses. Include real fixtures captured from each API (one popular book, one Indian book, one missing book).

### Phase 4 — Cascade orchestrator

- [ ] **4.1** Create `isbn_resolver/orchestrator.py` with `async def cascade(isbn_13: str) -> dict`
- [ ] **4.2** Logic:
  1. Run Tier 1 sources (Google + Open Library) **in parallel** with `asyncio.gather`.
  2. Merge results using field-priority map (see 4.3).
  3. Compute completeness score (see §10). If ≥80, stop. Else escalate.
  4. If Tier 3 configured, call ISBNdb. Re-merge.
  5. Return merged dict.
- [ ] **4.3** Field priority map in `settings.py`:

```python
FIELD_SOURCE_PRIORITY = {
    "title":           ["google", "isbndb", "openlibrary"],
    "subtitle":        ["google", "isbndb", "openlibrary"],
    "description":     ["google", "openlibrary", "isbndb"],
    "authors":         ["google", "openlibrary", "isbndb"],
    "publisher":       ["openlibrary", "google", "isbndb"],
    "published_date":  ["google", "openlibrary", "isbndb"],
    "page_count":      ["google", "openlibrary", "isbndb"],
    "categories":      ["google", "openlibrary"],
    "language":        ["google", "openlibrary"],
    "binding":         ["isbndb", "openlibrary"],
    "list_price_usd":  ["isbndb", "google"],
    "cover":           ["openlibrary", "google", "isbndb"],
}
```

- [ ] **4.4** Merger: for each field, walk priority list, take first non-null value, record origin in `field_origins`.
- [ ] **4.5** Tests: cascade with all sources hit, cascade with Tier 1 sufficient, cascade with all sources missing, source-disagreement scenarios.

### Phase 5 — Cover image pipeline

- [ ] **5.1** Create `isbn_resolver/covers/fetcher.py`
  - `async fetch_best_cover(cover_candidates: list[dict]) -> tuple[bytes, str]`
  - Try candidates in order (largest first). Validate it's a real image (min 100×150, not the "no cover" placeholder Google returns).
  - Return raw bytes + MIME type.
- [ ] **5.2** Detect Google's "no image" placeholder by hashing known placeholder bytes; reject.
- [ ] **5.3** Create `isbn_resolver/covers/processor.py`
  - `process_cover(raw: bytes, isbn_13: str) -> list[CoverVariant]`
  - Strip EXIF on load.
  - Generate sizes: thumbnail (150×225), small (300×450), medium (600×900), large (1200×1800).
  - Maintain aspect ratio; pad with neutral background if source aspect is off.
  - For each size, emit WebP (q=80) and JPEG (q=85, progressive).
  - Skip "large" if source is smaller than 1200px wide (don't upscale).
- [ ] **5.4** Create `isbn_resolver/covers/storage.py`
  - Upload to Bunny Storage at key `covers/{isbn_13[:3]}/{isbn_13}/{size}.{format}`. The `[:3]` prefix shards across folders for large catalogues.
  - Return public CDN URL: `https://{BUNNY_CDN_HOSTNAME}/{storage_key}`
- [ ] **5.5** Placeholder cover generator: if no cover found from any source, render a Pillow-generated placeholder showing title + author in neutral colors. Store as `source="generated"`.
- [ ] **5.6** Tests: process real JPEG, process malformed image (should not crash), process tiny image (no upscale), Bunny upload mocked.

### Phase 6 — Resolver service + persistence

- [ ] **6.1** Create `isbn_resolver/service.py` with `resolve_isbn(raw_isbn: str, force_refresh: bool = False) -> Book`
- [ ] **6.2** Flow:
  1. Normalize ISBN (Phase 1).
  2. If `not force_refresh`: check DB for existing `Book` by `isbn_13` or `isbn_10`. If found and not `is_stale`, return.
  3. Check `ISBNNotFoundCache`. If `retry_after > now()`, raise `BookNotFound`.
  4. Check Redis short-cache (`isbn_resolver:miss:{isbn}`, 24h TTL).
  5. Run cascade (Phase 4) — call via `asyncio.run` inside Celery task, or expose sync wrapper.
  6. If no data: increment `ISBNNotFoundCache.attempts`, set `retry_after` via backoff schedule, raise `BookNotFound`.
  7. Run cover pipeline (Phase 5).
  8. Persist `Book`, `Author`s, `BookAuthor`s, `BookCover`s in a transaction.
  9. Set Redis cache for the full payload (30 day TTL).
  10. Return `Book` instance.
- [ ] **6.3** Author deduplication: normalize name (lowercase, strip accents via `unicodedata.normalize('NFKD', ...).encode('ascii', 'ignore')`), match on `normalized_name`. Create if missing.

### Phase 7 — Async tasks (Celery)

- [ ] **7.1** Create `isbn_resolver/tasks.py`:
  - `@shared_task def enrich_isbn_task(isbn: str, force_refresh: bool = False)`
  - `@shared_task def refresh_stale_books_task()` — finds books with `last_fetched_at < now - 1y`, enqueues re-enrichment in batches of 50
  - `@shared_task def cleanup_not_found_cache_task()` — purges entries older than 6 months
- [ ] **7.2** Configure Celery Beat schedules in `settings.py`:
  - `refresh_stale_books_task`: daily at 2 AM
  - `cleanup_not_found_cache_task`: weekly Sunday 3 AM
- [ ] **7.3** Set task `max_retries=3`, `default_retry_delay=60`, `acks_late=True`.

### Phase 8 — REST API

- [ ] **8.1** DRF endpoints (`isbn_resolver/api.py`):
  - `GET /api/v1/books/{isbn}/` — sync lookup, returns book or 404 (`?force_refresh=true` bypasses cache)
  - `POST /api/v1/books/enrich/` — body `{"isbn": "..."}` — enqueues async, returns task ID
  - `GET /api/v1/books/enrich/{task_id}/` — task status
  - `POST /api/v1/books/bulk/` — body `{"isbns": ["...", "..."]}` — bulk enqueue (max 100 per request)
- [ ] **8.2** Serializers: `BookSerializer` (with nested authors, covers as dict of `{size: {webp: url, jpeg: url}}`).
- [ ] **8.3** Throttle: `100/hour` for unauthenticated, `10000/hour` for authenticated. Use DRF's throttle classes.
- [ ] **8.4** OpenAPI schema via `drf-spectacular` (add to packages if you want this).

### Phase 9 — Admin

- [ ] **9.1** Register `Book`, `Author`, `BookCover`, `ISBNLookupLog`, `ISBNNotFoundCache` in Django admin.
- [ ] **9.2** `BookAdmin` list display: `isbn_13`, `title`, primary author, `binding`, `metadata_quality_score`, `last_fetched_at`, cover thumbnail.
- [ ] **9.3** Admin actions:
  - "Re-enrich selected books" (triggers `enrich_isbn_task` with `force_refresh=True`)
  - "Mark as manual review needed"
  - "Regenerate covers" (re-run Phase 5 with stored original)

### Phase 10 — Manual fallback workflow

- [ ] **10.1** When `metadata_quality_score < 50` after cascade, set `manual_review_needed=True`.
- [ ] **10.2** Admin filter "Needs review" surfaces these.
- [ ] **10.3** Admin form allows manual upload of cover image + correction of fields. Manual cover uploads bypass cascade, go directly to Phase 5 processing.
- [ ] **10.4** (Optional) Public-facing form for sellers/donors to submit corrections, tied to your PutForShare flow.

### Phase 11 — Observability

- [ ] **11.1** Structlog event for every lookup: `isbn`, `source`, `cache_hit`, `latency_ms`, `quality_score`.
- [ ] **11.2** Daily metrics rollup task: emits to logs:
  - Lookups today (total, hit, miss)
  - Per-source success rate
  - Per-source avg latency
  - New books enriched
  - Covers downloaded (count, total bytes)
- [ ] **11.3** Sentry: all unhandled exceptions in tasks and API.
- [ ] **11.4** Health check endpoint `GET /healthz/` validates: DB, Redis, Bunny reachability.

### Phase 12 — Tests & CI

- [ ] **12.1** pytest config (`pytest.ini`), with `DJANGO_SETTINGS_MODULE=config.settings.test`.
- [ ] **12.2** Factories (`factory-boy`) for `Book`, `Author`, `BookCover`.
- [ ] **12.3** Fixture set: 20 captured real API responses across `tests/fixtures/`.
- [ ] **12.4** Integration test: end-to-end resolve with all external HTTP mocked via `respx`.
- [ ] **12.5** GitHub Actions workflow:
  - Lint (ruff)
  - Type check (mypy, optional)
  - Test (pytest, with PostgreSQL + Redis services)
  - Coverage threshold ≥80%
- [ ] **12.6** Coverage acceptance test: against a known fixture set of 100 ISBNs, assert cascade returns acceptable metadata for ≥95.

### Phase 13 — Deployment

- [ ] **13.1** Dockerfile (multi-stage: builder installs deps, runtime is slim).
- [ ] **13.2** `docker-compose.yml` for local dev: web, celery worker, celery beat, redis, postgres.
- [ ] **13.3** Hetzner VPS deploy:
  - Nginx → Gunicorn (web)
  - Systemd units for `celery worker`, `celery beat`
  - Symlink-swap zero-downtime deploy script (you have this pattern already)
- [ ] **13.4** Bunny CDN pull zone configured to point at Bunny Storage zone. Cache TTL: 30 days for images.
- [ ] **13.5** Cloudflare in front of API (DDoS, rate limiting at edge).

---

## 10. Quality Scoring

`metadata_quality_score` is computed at persist time. Each present field contributes points:

| Field                    | Points  |
| ------------------------ | ------- |
| title                    | 15      |
| ≥1 author                | 15      |
| description (≥100 chars) | 15      |
| cover (any size)         | 15      |
| publisher                | 8       |
| published_year           | 8       |
| page_count               | 8       |
| binding                  | 8       |
| categories (≥1)          | 4       |
| language                 | 2       |
| list price               | 2       |
| **Total possible**       | **100** |

Thresholds:

- ≥80 — sufficient, stop cascade
- 50–79 — usable, but try Tier 3 if available
- <50 — flag `manual_review_needed=True`

---

## 11. Image Strategy Decisions

These decisions are final. Do not deviate.

| Decision                       | Choice                                                            | Reason                                                     |
| ------------------------------ | ----------------------------------------------------------------- | ---------------------------------------------------------- |
| Download 1 image or all sizes? | **Download largest available, resize ourselves**                  | Consistent UX, control over quality, no hot-link fragility |
| Output formats                 | **WebP (primary) + JPEG (fallback)**                              | WebP ~30% smaller at same quality; JPEG for legacy clients |
| Skip AVIF?                     | **Yes for v1**                                                    | Encoding slow; gains marginal for low-detail book covers   |
| Sizes generated                | thumbnail 150×225, small 300×450, medium 600×900, large 1200×1800 | Covers ~all UI needs from grid to zoom                     |
| Upscale beyond source?         | **No**                                                            | Skip "large" size if source <1200px wide                   |
| Strip EXIF?                    | **Yes**                                                           | Smaller files, privacy                                     |
| Store original?                | **Yes**                                                           | Regenerate sizes/formats later without re-fetching         |
| Hot-link from APIs?            | **Never in production**                                           | URLs expire; rate limits apply; offline-fragile            |
| Quality settings               | WebP q=80, JPEG q=85 progressive                                  | Sweet spot for cover-style imagery                         |
| Storage path scheme            | `covers/{isbn_13[:3]}/{isbn_13}/{size}.{format}`                  | Shards across folders, predictable                         |

---

## 12. Caching Strategy

| Layer                                  | TTL                                              | Purpose                               |
| -------------------------------------- | ------------------------------------------------ | ------------------------------------- |
| Redis hot cache (book payload by ISBN) | 30 days                                          | Sub-50ms reads                        |
| Redis miss cache                       | 24 hours                                         | Avoid retry storms on known-bad ISBNs |
| `ISBNNotFoundCache` (DB)               | Exponential backoff: 1d → 7d → 30d → 90d → never | Long-term suppression                 |
| `Book.is_stale` flag                   | 12 months                                        | Periodic refresh                      |
| Bunny CDN edge                         | 30 days                                          | Image delivery                        |

Invalidate Redis book cache on: manual admin edit, force_refresh, re-enrichment task completion.

---

## 13. Rate Limiting & Quota Management

| Source                  | Limit               | Implementation                              |
| ----------------------- | ------------------- | ------------------------------------------- |
| Google Books (no key)   | 1K/day              | Don't deploy without key                    |
| Google Books (with key) | 100K/day            | Token bucket; alert at 80% daily quota      |
| Open Library            | ~100 req/min polite | `ratelimit` decorator: 100/60s              |
| ISBNdb                  | per-plan            | Check headers, respect 429 with Retry-After |

If any source hits rate limit, mark it `temporarily_disabled` for 5 minutes in Redis; cascade skips it gracefully.

---

## 14. Security & Compliance

- API keys in env vars only, never committed.
- Rate-limit public API endpoints (DRF throttling).
- Validate ISBN before any external call (prevents injection via crafted ISBN).
- Strip all metadata from stored images.
- Google Books TOS: technically prohibits long-term storage of their data. Mitigation: prefer Open Library (CC0) when both have equivalent data; document `field_origins` so we can scrub Google-sourced data if ever required.
- GDPR/DPDP: this system stores no personal data, only public book metadata.

---

## 15. Out of Scope (v1)

- Multilingual metadata enrichment beyond what APIs return natively
- Audiobook / ebook format variants
- Live pricing feeds (Flipkart/Amazon scrapers)
- Reviews, ratings, recommendations
- Public search UI (lookup by ISBN only)
- ML-based cover deduplication across editions

---

## 16. Open Questions (resolve before Phase 6)

1. **Manual-review workflow UX**: standalone Django admin only, or also a public-facing donor form embedded in PutForShare?
2. **Pricing source for India**: skip entirely, use ISBNdb MSRP (USD-only), or build a Flipkart scraper as a separate Tier 4 service?
3. **Multi-tenant**: is ISBN data shared across all PutForShare sellers, or namespaced per seller? (Recommendation: shared. Book metadata is not seller-specific.)
4. **Refresh cadence**: is 12 months for stale flag correct, or should high-value (frequently-viewed) books refresh more often?

---

## 17. Definition of Done

- [ ] All 13 phases completed and merged.
- [ ] Coverage acceptance test passes on 100-ISBN fixture set (≥95 successful).
- [ ] P50 cache-hit latency <50 ms on staging.
- [ ] P50 cache-miss latency <4 s on staging.
- [ ] Documentation: README with setup, env vars, API examples.
- [ ] Runbook: how to handle quota exhaustion, how to re-enrich a book, how to add a new source.
- [ ] Deployed to staging on Hetzner, sanity-tested with 1,000 real ISBNs from PutForShare donor data.

---

_End of PRD._


---

# plan.todo : todo

_Source: `prd/todo/plan.todo`_

1. Barcode Scanner to Scan ISBN
2. Photo model can be linked to any model like user , product or any other model. It should work seamlessly

3. Every product should have plan = SELF_SELL or SMART_SELL or DONATE if it is not there check the seller 

1. For Book Seller

Self Sell Plan

1. Prerequesite for self seller


dash/backlog/backlog.md
plan/
plan/email-sending.todo
plan/highlevel-plan-v2.todo
plan/highlevel-plan.todo


---

# todo_combined_output.txt : todo

_Source: `prd/todo/todo_combined_output.txt`_


