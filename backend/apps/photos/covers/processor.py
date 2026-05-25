"""Pillow-based cover image processor.

Takes raw cover bytes (from fetcher.py) and produces multiple size+format
variants ready for Bunny upload:

    thumbnail 150x225, small 300x450, medium 600x900, large 1200x1800
    each as WebP (q=80) and JPEG (q=85 progressive)

Per PRD §5.3 / §11:
  * Maintain aspect ratio; pad with neutral (white) background.
  * Never upscale. Skip the "large" size entirely when source is < 1200px wide.
  * Strip EXIF (we don't pass `exif=` to save and we paste onto a fresh canvas).

This module is synchronous — Pillow is CPU-bound, not I/O-bound. The async
pipeline orchestrator wraps it via run_in_executor if needed.
"""

import io
import logging
from dataclasses import dataclass

from PIL import Image

logger = logging.getLogger(__name__)


@dataclass
class CoverVariant:
    size: str          # "thumbnail" | "small" | "medium" | "large"
    format: str        # "webp" | "jpeg"
    content: bytes
    width: int
    height: int
    content_type: str  # "image/webp" | "image/jpeg"


SIZE_DIMENSIONS: dict[str, tuple[int, int]] = {
    "thumbnail": (150, 225),
    "small": (300, 450),
    "medium": (600, 900),
    "large": (1200, 1800),
}

OUTPUT_FORMATS: tuple[str, ...] = ("webp", "jpeg")

WEBP_QUALITY = 80
JPEG_QUALITY = 85
BACKGROUND_COLOR = (255, 255, 255)  # neutral white canvas

# Largest size requires source width >= this to avoid upscaling.
LARGE_MIN_SOURCE_WIDTH = 1200


def _scale_to_fit(src: Image.Image, target_w: int, target_h: int) -> Image.Image:
    """Resize preserving aspect ratio. Never upscales (scale capped at 1.0)."""
    src_w, src_h = src.size
    scale = min(target_w / src_w, target_h / src_h, 1.0)
    new_w = max(1, int(round(src_w * scale)))
    new_h = max(1, int(round(src_h * scale)))
    if (new_w, new_h) == (src_w, src_h):
        return src
    return src.resize((new_w, new_h), Image.LANCZOS)


def _paste_centered(scaled: Image.Image, target_w: int, target_h: int) -> Image.Image:
    """Create a fresh RGB canvas and paste `scaled` at center. Drops EXIF."""
    canvas = Image.new("RGB", (target_w, target_h), BACKGROUND_COLOR)
    offset = ((target_w - scaled.size[0]) // 2, (target_h - scaled.size[1]) // 2)
    if scaled.mode == "RGBA":
        # Use alpha as paste mask so transparent areas show the white canvas.
        canvas.paste(scaled, offset, scaled.split()[-1])
    else:
        rgb = scaled if scaled.mode == "RGB" else scaled.convert("RGB")
        canvas.paste(rgb, offset)
    return canvas


def _encode(img: Image.Image, format_: str) -> tuple[bytes, str]:
    buf = io.BytesIO()
    if format_ == "webp":
        img.save(buf, format="WEBP", quality=WEBP_QUALITY, method=4)
        return buf.getvalue(), "image/webp"
    if format_ == "jpeg":
        img.save(
            buf,
            format="JPEG",
            quality=JPEG_QUALITY,
            progressive=True,
            optimize=True,
        )
        return buf.getvalue(), "image/jpeg"
    raise ValueError(f"Unsupported output format: {format_!r}")


def process_cover(raw: bytes) -> list[CoverVariant]:
    """Return a list of CoverVariants. Empty list if the input can't be decoded."""
    try:
        with Image.open(io.BytesIO(raw)) as src:
            src.load()
            # Convert palettes/CMYK up front so resize/paste behave predictably.
            if src.mode not in ("RGB", "RGBA"):
                src = src.convert("RGBA" if "A" in src.mode else "RGB")
            else:
                src = src.copy()  # detach from the file-backed buffer
    except Exception as exc:
        logger.warning("process_cover: failed to decode source bytes: %s", exc)
        return []

    src_w, src_h = src.size
    variants: list[CoverVariant] = []
    for size_name, (target_w, target_h) in SIZE_DIMENSIONS.items():
        if size_name == "large" and src_w < LARGE_MIN_SOURCE_WIDTH:
            continue
        scaled = _scale_to_fit(src, target_w, target_h)
        canvas = _paste_centered(scaled, target_w, target_h)
        for format_ in OUTPUT_FORMATS:
            content, content_type = _encode(canvas, format_)
            variants.append(
                CoverVariant(
                    size=size_name,
                    format=format_,
                    content=content,
                    width=target_w,
                    height=target_h,
                    content_type=content_type,
                )
            )

    logger.info(
        "process_cover: produced %d variants from %dx%d source",
        len(variants),
        src_w,
        src_h,
    )
    return variants
