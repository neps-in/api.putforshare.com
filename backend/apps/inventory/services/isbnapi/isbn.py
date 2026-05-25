"""ISBN normalization helpers built on python-stdnum.

Public API:
    clean(raw)        - strip whitespace, hyphens, "ISBN:" prefix; uppercase 'X'
    validate(isbn)    - bool; does this look like a structurally valid ISBN?
    to_isbn13(isbn)   - return ISBN-13 form
    to_isbn10(isbn)   - return ISBN-10 form, or None if no ISBN-10 exists (979-prefix)
    normalize(raw)    - return {"isbn_10": ..., "isbn_13": ...}; raises InvalidISBN

Bad input is signalled by the InvalidISBN exception, not by None — callers must
handle it explicitly.
"""

import re

from stdnum import isbn as stdnum_isbn
from stdnum.exceptions import InvalidChecksum, InvalidComponent, InvalidFormat, InvalidLength


class InvalidISBN(ValueError):
    """Raised when input cannot be parsed as a valid ISBN-10 or ISBN-13."""


_PREFIX_RE = re.compile(r"^\s*isbn[:\s\-]*", re.IGNORECASE)


def clean(raw: str) -> str:
    if not raw:
        return ""
    stripped = _PREFIX_RE.sub("", str(raw))
    # Remove every character that isn't a digit or the literal X (check digit).
    cleaned = re.sub(r"[^0-9Xx]", "", stripped)
    return cleaned.upper()


def validate(isbn: str) -> bool:
    return bool(isbn) and stdnum_isbn.is_valid(isbn)


def to_isbn13(isbn: str) -> str:
    return stdnum_isbn.to_isbn13(isbn)


def to_isbn10(isbn: str) -> str | None:
    """Return ISBN-10 form, or None if no ISBN-10 exists for this ISBN-13.

    ISBN-13 numbers starting with 979 have no equivalent ISBN-10 form.
    """
    try:
        return stdnum_isbn.to_isbn10(isbn)
    except (InvalidFormat, InvalidComponent, InvalidLength):
        return None


def normalize(raw: str) -> dict[str, str | None]:
    """Normalize any ISBN form to canonical ISBN-13 + ISBN-10 (when available).

    Raises:
        InvalidISBN: when the input is empty, malformed, or fails the checksum.
    """
    cleaned = clean(raw)
    if not cleaned:
        raise InvalidISBN("ISBN is empty.")
    try:
        compact_form = stdnum_isbn.validate(cleaned)
    except (InvalidChecksum, InvalidFormat, InvalidComponent, InvalidLength) as exc:
        raise InvalidISBN(f"Invalid ISBN: '{raw}' ({exc.__class__.__name__})") from exc

    return {
        "isbn_13": stdnum_isbn.to_isbn13(compact_form),
        "isbn_10": to_isbn10(compact_form),
    }
