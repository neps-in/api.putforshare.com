"""URL configuration for the ISBN metadata resolver API.

Mounted at `/api/v1/books/` — see `config/urls.py`.

    POST   /api/v1/books/enrich/             → BookEnrichView (async enqueue)
    GET    /api/v1/books/enrich/<task_id>/   → BookEnrichStatusView (poll)
    POST   /api/v1/books/bulk/               → BookBulkEnrichView (up to 100)
    GET    /api/v1/books/<isbn>/             → BookMetadataView (sync resolve)
    DELETE /api/v1/books/<isbn>/cache/       → BookCacheInvalidateView (drop FS cache)

The literal `enrich/` and `bulk/` patterns MUST be declared before the
`<str:isbn>/` pattern — Django evaluates patterns in order and `enrich` /
`bulk` would otherwise be greedily matched as ISBN strings.

ISBN values may be ISBN-10 or ISBN-13, hyphenated or not; normalization
happens in service.py.
"""

from django.urls import path

from .views import (
    BookBulkEnrichView,
    BookCacheInvalidateView,
    BookEnrichStatusView,
    BookEnrichView,
    BookMetadataView,
)

app_name = "isbnapi"

urlpatterns = [
    # Literal routes — order matters; these must precede the <str:isbn> catch-all.
    path("enrich/", BookEnrichView.as_view(), name="book-enrich"),
    path("enrich/<str:task_id>/", BookEnrichStatusView.as_view(), name="book-enrich-status"),
    path("bulk/", BookBulkEnrichView.as_view(), name="book-bulk-enrich"),
    # ISBN-parameterized routes.
    path("<str:isbn>/", BookMetadataView.as_view(), name="book-metadata"),
    path("<str:isbn>/cache/", BookCacheInvalidateView.as_view(), name="book-cache-invalidate"),
]
