"""Source adapters for ISBN metadata lookup.

Each adapter is a subclass of BookSource (see base.py). They are registered
in SOURCES below; the orchestrator iterates this tuple to discover what to
call.
"""

from .base import BookSource, SourceResult
from .google_books import GoogleBooksSource
from .isbndb import ISBNdbSource
from .open_library import OpenLibrarySource
from .upcitemdb import UPCitemdbSource

# Registered sources, lowest priority value first.
SOURCES: tuple[BookSource, ...] = (
    GoogleBooksSource(),
    OpenLibrarySource(),
    ISBNdbSource(),
    UPCitemdbSource(),
)

__all__ = ["BookSource", "SourceResult", "SOURCES"]
