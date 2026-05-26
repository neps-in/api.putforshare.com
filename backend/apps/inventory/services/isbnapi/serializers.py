"""DRF serializers for the ISBN resolver API.

The single public-facing serializer is `MergedBookResponseSerializer`. It
shapes a `MergedBookResponse` dataclass into the JSON returned by
`GET /api/v1/books/{isbn}/`.

**Critical invariant**: `list_price_usd` must never appear in the serialized
output. It exists on the dataclass and is persisted to `Book.list_price_usd`
for internal use (source-priority merging, FX conversion, analytics) but the
public API only exposes `list_price_inr`. See PRD §8.1 / §8.2. A regression
test asserts the field is absent from the serialized representation; do not
add it back without updating that test and the project conventions.
"""

from rest_framework import serializers


class MergedBookResponseSerializer(serializers.Serializer):
    """Serialize a MergedBookResponse for public API consumption.

    Fields are listed explicitly (not via `__all__` or `fields=...`) so that
    adding a new field to the dataclass requires a deliberate decision about
    whether it should be exposed publicly.
    """

    title = serializers.CharField(allow_null=True)
    subtitle = serializers.CharField(allow_null=True)
    authors = serializers.ListField(child=serializers.CharField(), allow_empty=True)
    isbn10 = serializers.CharField(allow_null=True)
    isbn13 = serializers.CharField(allow_null=True)
    publisher = serializers.CharField(allow_null=True)
    published_date = serializers.CharField(allow_null=True)
    description = serializers.CharField(allow_null=True)
    page_count = serializers.IntegerField(allow_null=True)
    categories = serializers.ListField(child=serializers.CharField(), allow_empty=True)
    language = serializers.CharField(allow_null=True)
    thumbnail = serializers.CharField(allow_null=True)
    preview_link = serializers.CharField(allow_null=True)
    # list_price_usd: INTENTIONALLY OMITTED — internal-only, never exposed.
    # See module docstring.
    confidence = serializers.IntegerField()
    sources = serializers.ListField(child=serializers.CharField(), allow_empty=True)
    field_origins = serializers.DictField(child=serializers.CharField())
    missing_fields = serializers.ListField(child=serializers.CharField(), allow_empty=True)
    error = serializers.CharField(allow_null=True)
    retryable = serializers.BooleanField()
    fetched_at = serializers.CharField(allow_null=True)
    cached = serializers.BooleanField()

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Defensive scrub: `field_origins` is a freeform dict whose keys
        # mirror the schema fields. If a source contributed list_price_usd,
        # the merger records `{"list_price_usd": "upcitemdb"}` in the dict —
        # that key would leak the internal field's existence even though the
        # value itself isn't exposed. Drop it.
        origins = data.get("field_origins")
        if origins and "list_price_usd" in origins:
            data["field_origins"] = {
                k: v for k, v in origins.items() if k != "list_price_usd"
            }
        return data
