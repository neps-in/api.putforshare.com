"""
URL configuration for book_metadata app.

Include in your project's urls.py:

    from django.urls import path, include
    urlpatterns = [
        ...
        path("api/books/", include("book_metadata.urls")),
    ]
"""

from django.urls import path
from .views import BookMetadataView, BookCacheInvalidateView

urlpatterns = [
    path("<str:isbn>/", BookMetadataView.as_view(), name="book-metadata"),
    path("<str:isbn>/cache/", BookCacheInvalidateView.as_view(), name="book-cache-invalidate"),
]
