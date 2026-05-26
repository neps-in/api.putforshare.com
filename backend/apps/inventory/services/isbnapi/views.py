"""DRF views for the ISBN metadata resolver.

Endpoints (mounted at /api/v1/books/ — see config/urls.py):

    GET    /api/v1/books/<isbn>/             — resolve + return MergedBookResponse
    DELETE /api/v1/books/<isbn>/cache/       — drop the FS cache entry (auth)
    POST   /api/v1/books/enrich/             — enqueue async enrichment (auth)
    GET    /api/v1/books/enrich/<task_id>/   — poll Celery task state
    POST   /api/v1/books/bulk/               — enqueue up to 100 at once (auth)

`list_price_usd` is NEVER serialized — see serializers.MergedBookResponseSerializer.
"""

import logging

from celery.result import AsyncResult
from drf_spectacular.utils import OpenApiParameter, OpenApiTypes, extend_schema
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .cache import invalidate_book
from .isbn import InvalidISBN, normalize
from .serializers import MergedBookResponseSerializer
from .service import get_book_metadata_sync
from .tasks import enrich_isbn_task

logger = logging.getLogger(__name__)


def _status_for(result) -> int:
    """Map a MergedBookResponse onto an HTTP status code.

    Mappings match the errors `service.get()` raises via the dataclass:
      - "Invalid ISBN: ..." / "ISBN is empty."   → 400
      - "No metadata found ..." (all-miss or suppressed) → 404
      - "No metadata sources available ..."      → 503
      - anything else with an error               → 502 (catch-all)
    """
    if not result.error:
        return status.HTTP_200_OK
    err = result.error.lower()
    if "invalid isbn" in err or "isbn is empty" in err:
        return status.HTTP_400_BAD_REQUEST
    if "no metadata found" in err:
        return status.HTTP_404_NOT_FOUND
    if "no metadata sources available" in err:
        return status.HTTP_503_SERVICE_UNAVAILABLE
    return status.HTTP_502_BAD_GATEWAY


def _truthy(value: str) -> bool:
    return value.lower() in {"1", "true", "yes", "on"}


class BookMetadataView(APIView):
    """`GET /api/v1/books/<isbn>/` — resolve book metadata by ISBN-10 or ISBN-13."""

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "book_metadata"

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="force_refresh",
                type=OpenApiTypes.BOOL,
                location=OpenApiParameter.QUERY,
                description=(
                    "Bypass both the filesystem cache and the ISBNNotFoundCache "
                    "suppression row, forcing a fresh cascade against external APIs. "
                    "Accepts 1/true/yes/on (case-insensitive)."
                ),
                required=False,
            ),
        ],
        responses={
            200: MergedBookResponseSerializer,
            400: MergedBookResponseSerializer,
            404: MergedBookResponseSerializer,
            503: MergedBookResponseSerializer,
        },
        summary="Resolve book metadata by ISBN",
        description=(
            "Returns merged metadata for a book identified by ISBN-10 or ISBN-13. "
            "Results are aggregated from Google Books, Open Library, ISBNdb, and "
            "UPCitemdb according to per-field priority rules. The filesystem cache "
            "is permanent; suppressed ISBNs follow a 1d → 7d → 30d → 90d backoff."
        ),
    )
    def get(self, request, isbn: str):
        force_refresh = _truthy(request.query_params.get("force_refresh", ""))
        result = get_book_metadata_sync(isbn, force_refresh=force_refresh)
        serializer = MergedBookResponseSerializer(result)
        return Response(serializer.data, status=_status_for(result))


class BookCacheInvalidateView(APIView):
    """`DELETE /api/v1/books/<isbn>/cache/` — force-drop the FS cache file for an ISBN.

    Idempotent. Requires authentication (project default `IsAuthenticatedOrReadOnly`
    permits read methods anonymously but requires auth for unsafe ones).
    """

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "book_metadata"

    @extend_schema(
        responses={204: None},
        summary="Invalidate the filesystem cache for an ISBN",
        description=(
            "Drops the cached merged payload for the given ISBN. Idempotent — "
            "returns 204 whether or not a cache file existed. The next GET "
            "for this ISBN will run the cascade fresh (or hit the suppression row "
            "if one is active)."
        ),
    )
    def delete(self, request, isbn: str):
        invalidate_book(isbn)
        logger.info("Cache invalidated for ISBN %s by user=%s", isbn, request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Async enrichment endpoints — Celery-backed
# ---------------------------------------------------------------------------

class EnrichRequestSerializer(serializers.Serializer):
    isbn = serializers.CharField(required=True, max_length=20)
    force_refresh = serializers.BooleanField(required=False, default=False)


class BulkEnrichRequestSerializer(serializers.Serializer):
    isbns = serializers.ListField(
        child=serializers.CharField(max_length=20),
        min_length=1,
        max_length=100,  # PRD §8.1: max 100 per request
    )
    force_refresh = serializers.BooleanField(required=False, default=False)


def _validate_isbn_or_400(raw: str) -> str | None:
    """Return the normalized ISBN-13, or None if input is malformed."""
    try:
        return normalize(raw)["isbn_13"]
    except InvalidISBN:
        return None


class BookEnrichView(APIView):
    """`POST /api/v1/books/enrich/` — enqueue an async resolve for one ISBN."""

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "book_metadata"

    @extend_schema(
        request=EnrichRequestSerializer,
        responses={202: dict, 400: dict},
        summary="Enqueue async ISBN enrichment",
        description=(
            "Hands the ISBN off to a Celery worker which resolves metadata "
            "and persists onto any matching Book row. Returns a task_id "
            "immediately; poll GET /api/v1/books/enrich/<task_id>/ for state."
        ),
    )
    def post(self, request):
        body = EnrichRequestSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        raw = body.validated_data["isbn"]
        force = body.validated_data.get("force_refresh", False)

        isbn = _validate_isbn_or_400(raw)
        if isbn is None:
            return Response(
                {"error": f"Invalid ISBN: {raw!r}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        async_result = enrich_isbn_task.delay(isbn, force_refresh=force)
        return Response(
            {
                "task_id": async_result.id,
                "isbn": isbn,
                "force_refresh": force,
                "status_url": request.build_absolute_uri(f"/api/v1/books/enrich/{async_result.id}/"),
            },
            status=status.HTTP_202_ACCEPTED,
        )


class BookEnrichStatusView(APIView):
    """`GET /api/v1/books/enrich/<task_id>/` — Celery task state for one enrichment."""

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "book_metadata"

    @extend_schema(
        responses={200: dict},
        summary="Poll Celery state for an enqueued enrichment",
        description=(
            "Returns the current state (PENDING/STARTED/SUCCESS/FAILURE) and "
            "the result dict on success. Idempotent. The task_id is the one "
            "returned by POST /api/v1/books/enrich/."
        ),
    )
    def get(self, request, task_id: str):
        result = AsyncResult(task_id)
        payload = {
            "task_id": task_id,
            "state": result.state,
            "ready": result.ready(),
            "successful": result.successful() if result.ready() else None,
            "result": None,
            "error": None,
        }
        if result.successful():
            payload["result"] = result.result
        elif result.failed():
            payload["error"] = str(result.result)  # exception representation
        return Response(payload, status=status.HTTP_200_OK)


class BookBulkEnrichView(APIView):
    """`POST /api/v1/books/bulk/` — enqueue up to 100 ISBNs at once."""

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "book_metadata"

    @extend_schema(
        request=BulkEnrichRequestSerializer,
        responses={202: dict, 400: dict},
        summary="Bulk-enqueue async ISBN enrichments",
        description=(
            "Accepts up to 100 ISBNs in a single request. Each valid ISBN is "
            "enqueued as a separate Celery task; malformed ISBNs are reported "
            "back in the 'invalid' list and skipped. Returns immediately with "
            "the list of task IDs."
        ),
    )
    def post(self, request):
        body = BulkEnrichRequestSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        force = body.validated_data.get("force_refresh", False)

        enqueued: list[dict] = []
        invalid: list[str] = []
        for raw in body.validated_data["isbns"]:
            isbn = _validate_isbn_or_400(raw)
            if isbn is None:
                invalid.append(raw)
                continue
            async_result = enrich_isbn_task.delay(isbn, force_refresh=force)
            enqueued.append({"task_id": async_result.id, "isbn": isbn})

        return Response(
            {
                "enqueued_count": len(enqueued),
                "enqueued": enqueued,
                "invalid": invalid,
                "force_refresh": force,
            },
            status=status.HTTP_202_ACCEPTED,
        )
