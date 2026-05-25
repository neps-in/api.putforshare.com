"""Static default-book-cover fallback.

Strategy: a single placeholder image lives at `covers/default-book-cover.jpg`
on Bunny Storage / CDN, uploaded once out-of-band. When the cover pipeline
finds no usable image from any source, it returns this URL instead of writing
new objects.

Use `default_cover_url()` from the pipeline orchestrator and serializer code.
"""

from .storage import build_cdn_url

DEFAULT_COVER_STORAGE_KEY: str = "covers/default-book-cover.jpg"


def default_cover_url() -> str:
    """Return the public CDN URL of the static placeholder cover."""
    return build_cdn_url(DEFAULT_COVER_STORAGE_KEY)
