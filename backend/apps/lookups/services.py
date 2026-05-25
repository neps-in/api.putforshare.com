import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from django.conf import settings


class LookupDataError(RuntimeError):
    """Raised when lookup source data cannot be loaded or validated."""



def _languages_file_path() -> Path:
    # BASE_DIR points to `backend/`; shared data lives in repo-level `shared/data`.
    return Path(settings.BASE_DIR).parent / "shared" / "data" / "languages.json"


@lru_cache(maxsize=1)
def load_languages() -> list[dict[str, Any]]:
    languages_path = _languages_file_path()
    if not languages_path.exists():
        raise LookupDataError(f"Languages file not found: {languages_path}")

    try:
        data = json.loads(languages_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise LookupDataError("Languages file contains invalid JSON.") from exc

    if not isinstance(data, list):
        raise LookupDataError("Languages JSON must be an array.")

    return data



def clear_language_cache() -> None:
    load_languages.cache_clear()
