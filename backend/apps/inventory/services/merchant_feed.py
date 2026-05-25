import hashlib
from pathlib import Path
from xml.etree.ElementTree import Element, SubElement, tostring

from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone

from apps.inventory.models import Book, Product
from apps.photos.models import PhotoAttachment

G_NS = "http://base.google.com/ns/1.0"


def _frontend_base_url() -> str:
    return str(getattr(settings, "FRONTEND_BASE_URL", "http://localhost:3000")).rstrip("/")


def _default_currency() -> str:
    return str(getattr(settings, "MERCHANT_FEED_CURRENCY", "INR")).strip() or "INR"


def _default_image_url() -> str:
    configured = str(getattr(settings, "MERCHANT_FEED_DEFAULT_IMAGE_URL", "")).strip()
    if configured:
        return configured
    return f"{_frontend_base_url()}/assets/default-book.png"


def _condition_for_product(product: Product) -> str:
    try:
        quality = str(product.book.quality or "").upper().strip()
    except Book.DoesNotExist:
        quality = ""
    if quality.startswith("NEW"):
        return "new"
    return "used"


def _availability_for_product(product: Product) -> str:
    return "in stock" if int(product.stock_quantity or 0) > 0 else "out of stock"


def _primary_image_url(product: Product) -> str:
    content_type = ContentType.objects.get_for_model(product.__class__)
    attachment = (
        PhotoAttachment.objects.filter(
            content_type=content_type,
            object_id=product.id,
            is_archived=False,
        )
        .select_related("photo")
        .order_by("-is_primary", "sort_order", "-created_on")
        .first()
    )
    if attachment and attachment.photo and attachment.photo.effective_url:
        return attachment.photo.effective_url
    return _default_image_url()


def _brand_for_product(product: Product) -> str:
    if hasattr(product, "book") and getattr(product.book, "publisher", None):
        return product.book.publisher.name or "PutForShare"
    if hasattr(product, "soap") and getattr(product.soap, "brand", ""):
        return product.soap.brand or "PutForShare"
    return "PutForShare"


def _google_product_category_for_product(product: Product) -> str:
    if hasattr(product, "book"):
        return "Media > Books"
    if hasattr(product, "soap"):
        return "Health & Beauty > Personal Care > Soap"
    return "Retail"


def _product_type_for_product(product: Product) -> str:
    category_name = getattr(getattr(product, "category", None), "name", "") or ""
    if hasattr(product, "book"):
        return f"Books > {category_name}" if category_name else "Books"
    if hasattr(product, "soap"):
        return f"Soaps > {category_name}" if category_name else "Soaps"
    return category_name or "General"


def _product_link(product: Product) -> str:
    return f"{_frontend_base_url()}/product/{product.uuid}"


def _add_g(parent: Element, tag_name: str, value: str) -> None:
    node = SubElement(parent, f"{{{G_NS}}}{tag_name}")
    node.text = value


def build_google_merchant_feed_xml() -> dict:
    products = list(
        Product.objects.filter(is_archived=False, is_active=True)
        .select_related("category", "book__publisher", "soap")
        .prefetch_related("book__authors")
        .order_by("id")
    )

    rss = Element("rss", {"version": "2.0", "xmlns:g": G_NS})
    channel = SubElement(rss, "channel")
    SubElement(channel, "title").text = "PutForShare Merchant Feed"
    SubElement(channel, "link").text = _frontend_base_url()
    SubElement(channel, "description").text = "Product catalog feed for Google Merchant Center."

    currency = _default_currency()
    now_iso = timezone.now().isoformat()
    for product in products:
        item = SubElement(channel, "item")
        _add_g(item, "id", str(product.uuid))
        _add_g(item, "title", str(product.name or "")[:150])
        _add_g(item, "description", str(product.short_description or product.description or product.name or "")[:5000])
        _add_g(item, "link", _product_link(product))
        _add_g(item, "image_link", _primary_image_url(product))
        _add_g(item, "availability", _availability_for_product(product))
        _add_g(item, "condition", _condition_for_product(product))
        _add_g(item, "price", f"{product.sale_price} {currency}")
        _add_g(item, "brand", _brand_for_product(product))
        _add_g(item, "google_product_category", _google_product_category_for_product(product))
        _add_g(item, "product_type", _product_type_for_product(product))
        _add_g(item, "mpn", str(product.sku or product.uuid))
        _add_g(item, "identifier_exists", "no")
        _add_g(item, "custom_label_0", "BOOK" if hasattr(product, "book") else ("SOAP" if hasattr(product, "soap") else "GENERAL"))
        _add_g(item, "custom_label_1", now_iso)

        if hasattr(product, "book"):
            isbn13 = str(getattr(product.book, "isbn_13", "") or "").strip()
            isbn10 = str(getattr(product.book, "isbn_10", "") or "").strip()
            if isbn13:
                _add_g(item, "gtin", isbn13)
            elif isbn10:
                _add_g(item, "gtin", isbn10)

    xml_bytes = tostring(rss, encoding="utf-8", xml_declaration=True)
    checksum = hashlib.sha256(xml_bytes).hexdigest()
    return {
        "content": xml_bytes,
        "count": len(products),
        "checksum": checksum,
    }


def write_google_merchant_feed_file() -> dict:
    payload = build_google_merchant_feed_xml()
    content = payload["content"]
    checksum = payload["checksum"]
    count = payload["count"]

    feed_relative_path = Path("feeds/google-merchant-feed.xml")
    feed_absolute_path = Path(settings.MEDIA_ROOT) / feed_relative_path
    feed_absolute_path.parent.mkdir(parents=True, exist_ok=True)
    feed_absolute_path.write_bytes(content)

    media_base = str(getattr(settings, "MEDIA_URL", "/media/")).rstrip("/")
    public_url = f"{media_base}/{feed_relative_path.as_posix()}"
    return {
        "total_items": count,
        "success_items": count,
        "failed_items": 0,
        "feed_relative_path": feed_relative_path.as_posix(),
        "feed_public_url": public_url,
        "feed_checksum": checksum,
    }
