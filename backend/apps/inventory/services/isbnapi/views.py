"""
Django views for the book metadata API.

Endpoints:
  GET /api/books/<isbn>/          — fetch merged metadata
  DELETE /api/books/<isbn>/cache/ — force-expire cache for manual refresh
"""

import asyncio
import logging

from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

from .service import BookMetadataService
from .cache import invalidate_book

logger = logging.getLogger(__name__)


@method_decorator(csrf_exempt, name="dispatch")
class BookMetadataView(View):
    """
    GET /api/books/<isbn>/
    Returns merged, normalized book metadata.

    Query params:
      refresh=true  — bypass cache for this request only
    """

    async def get(self, request, isbn: str):
        force_refresh = request.GET.get("refresh", "").lower() == "true"

        if force_refresh:
            invalidate_book(isbn)
            logger.info("Cache cleared for ISBN %s via ?refresh=true", isbn)

        service = BookMetadataService()
        result = await service.get(isbn)

        if result.error and not result.title:
            status = 404 if "No metadata" in (result.error or "") else 502
            return JsonResponse(result.to_dict(), status=status)

        return JsonResponse(result.to_dict(), status=200)


@method_decorator(csrf_exempt, name="dispatch")
class BookCacheInvalidateView(View):
    """
    DELETE /api/books/<isbn>/cache/
    Force-expires the cache for a given ISBN.
    """

    def delete(self, request, isbn: str):
        invalidate_book(isbn)
        return JsonResponse({"detail": f"Cache cleared for ISBN {isbn}."}, status=200)
