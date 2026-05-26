import os
from pathlib import Path

from decouple import Config, Csv, RepositoryEmpty

BASE_DIR = Path(__file__).resolve().parent.parent

# DJANGO_ENV is a bootstrap variable read via os.getenv (decouple isn't initialized yet).
env_name = os.getenv("DJANGO_ENV", "").lower()
env_file = BASE_DIR / (".env.production" if env_name == "production" else ".env")

# Load env file into os.environ so subprocesses (Celery workers, etc.) inherit it.
# Avoids python-dotenv per project convention — decouple is the canonical config lib.
if env_file.exists():
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))

# All config reads go through decouple. RepositoryEmpty → decouple reads from os.environ + defaults only.
config = Config(RepositoryEmpty())

# Csv cast that filters empty strings (matches the legacy _env_list helper).
_csv = Csv(post_process=lambda items: [i for i in items if i])


# Sentry Error logging integration only for production
if env_name == "production":

    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration

    sentry_sdk.init(
        dsn=config("SENTRY_DSN", default=""),
        integrations=[
            DjangoIntegration(),
        ],

        # Set traces_sample_rate to 1.0 to capture 100%
        # of transactions for performance monitoring.
        # We recommend adjusting this value in production.
        traces_sample_rate=1.0,

        # If you wish to associate users to errors (assuming you are using
        # django.contrib.auth) you may enable sending PII data.
        send_default_pii=True,
    )

# Sentry Error logging integration ends


# Structlog — JSON in production, pretty console output in dev.
# Used by the ISBN resolver (and any future module that imports
# `structlog.get_logger`). Standalone configuration; doesn't compete with
# Django's default logging — calls to `logger.info("event", k=v, ...)` go
# straight through structlog's processor chain.
import structlog as _structlog

_structlog.configure(
    processors=[
        _structlog.contextvars.merge_contextvars,
        _structlog.processors.add_log_level,
        _structlog.processors.TimeStamper(fmt="iso", utc=True),
        _structlog.processors.StackInfoRenderer(),
        _structlog.processors.format_exc_info,
        (
            _structlog.processors.JSONRenderer()
            if env_name == "production"
            else _structlog.dev.ConsoleRenderer()
        ),
    ],
    cache_logger_on_first_use=True,
)


# For ISBNAPI Service
BOOK_CACHE_DIR = config("BOOK_CACHE_DIR", default=str(BASE_DIR / "book_cache")).strip()
# BOOK_CACHE_TTL is retained as a legacy setting but is no longer enforced by
# the resolver — the filesystem cache is permanent (see PRD §12). Kept here
# only so any external tooling that reads it doesn't break.
BOOK_CACHE_TTL = config("BOOK_CACHE_TTL", default=48 * 60 * 60, cast=int)

# ISBN metadata source API keys (all optional)
GOOGLE_BOOKS_API_KEY = config("GOOGLE_BOOKS_API_KEY", default="")  # raises quota from 1K → 100K/day
ISBNDB_API_KEY = config("ISBNDB_API_KEY", default="")               # Tier 3, paid (~$15/mo)
UPCITEMDB_API_KEY = config("UPCITEMDB_API_KEY", default="")         # raises trial 100/day cap


SECRET_KEY = config("DJANGO_SECRET_KEY", default="dev-secret-key-change-me")
DEBUG = config("DJANGO_DEBUG", default=True, cast=bool)
ALLOWED_HOSTS = config("DJANGO_ALLOWED_HOSTS", default="localhost,127.0.0.1", cast=_csv)

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # API Docs generation
    'drf_spectacular', # Add this
    'drf_spectacular_sidecar', # Add this


    # DRF Related
    "corsheaders",
    "rest_framework",
    "rest_framework.authtoken",

    # 3rd party packages
    "taggit",
    "django_celery_beat",
    "anymail",

    # App Specific
    "apps.common",
    "apps.users",
    "apps.inventory.apps.InventoryConfig",
    "apps.cart",
    "apps.orders",
    "apps.payments",
    "apps.api",
    "apps.lookups",
    "apps.photos",
    "apps.s3browser",
    "apps.logistics",
    # "apps.notifications",

    # Notifications
    "apps.notifications.apps.NotificationsConfig",

]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

EMAIL_TEMPLATE_DIRS = [BASE_DIR.parent / "prd" / "email-templates"]

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": EMAIL_TEMPLATE_DIRS,
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

AUTH_USER_MODEL = "users.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/backend/static/"
STATIC_ROOT = '/var/www/api.putforshare.com/backend/static'
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

FRONTEND_BASE_URL = config("FRONTEND_BASE_URL", default="http://localhost:3000").rstrip("/")

_default_frontend_origins = ",".join(
    [
        FRONTEND_BASE_URL,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
)

CORS_ALLOWED_ORIGINS = config("CORS_ALLOWED_ORIGINS", default=_default_frontend_origins, cast=_csv)
CSRF_TRUSTED_ORIGINS = config("CSRF_TRUSTED_ORIGINS", default=_default_frontend_origins, cast=_csv)
CORS_ALLOW_CREDENTIALS = config("CORS_ALLOW_CREDENTIALS", default=True, cast=bool)

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ],
    "DEFAULT_PAGINATION_CLASS": "apps.api.pagination.StandardResultsPagination",
    "PAGE_SIZE": 10,
    "EXCEPTION_HANDLER": "apps.api.exceptions.standardized_exception_handler",
    "DEFAULT_THROTTLE_RATES": {
        "verify_email_resend": "3/hour",
        "password_reset_request": "5/hour",
        # ISBN metadata resolver — PRD §8.3. Same scope covers both GET and the
        # cache-invalidate DELETE so a single attacker can't burn quota on either path.
        "book_metadata": "100/hour",   # default (anonymous reads + authenticated alike)
        # NOTE: PRD §8.3 also calls for a higher 10,000/hour rate for authenticated
        # users — wire that with a per-class throttle override in views.py if/when
        # the throttling pressure justifies it.
    },

    # API Docs generation
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',

}

# Optional API metadata
SPECTACULAR_SETTINGS = {
    'TITLE': 'PutForShare',
    'DESCRIPTION': 'API documentation',
    'VERSION': '1.0.0',
    # ...
}


AWS_S3_BUCKET_NAME = config("AWS_S3_BUCKET_NAME", default="") or config("AWS_STORAGE_BUCKET_NAME", default="")
AWS_STORAGE_BUCKET_NAME = AWS_S3_BUCKET_NAME
AWS_S3_REGION_NAME = config("AWS_S3_REGION_NAME", default="")
AWS_S3_ENDPOINT_URL = config("AWS_S3_ENDPOINT_URL", default="")
AWS_S3_PUBLIC_BASE_URL = config("AWS_S3_PUBLIC_BASE_URL", default="")

AWS_ACCESS_KEY_ID = config("AWS_ACCESS_KEY_ID", default="")
AWS_SECRET_ACCESS_KEY = config("AWS_SECRET_ACCESS_KEY", default="")
AWS_SESSION_TOKEN = config("AWS_SESSION_TOKEN", default="")

PHOTO_STORAGE_BACKEND = config("PHOTO_STORAGE_BACKEND", default="").strip().lower()
PHOTO_S3_UPLOAD_PREFIX = config("PHOTO_S3_UPLOAD_PREFIX", default="uploads/photos")
PHOTO_S3_PRESIGNED_EXPIRES = config("PHOTO_S3_PRESIGNED_EXPIRES", default=900, cast=int)
PHOTO_MAX_UPLOAD_BYTES = config("PHOTO_MAX_UPLOAD_BYTES", default=10 * 1024 * 1024, cast=int)
PHOTO_ALLOWED_CONTENT_TYPES = [
    item.strip().lower()
    for item in config(
        "PHOTO_ALLOWED_CONTENT_TYPES",
        default="image/jpeg,image/png,image/webp,image/heic,image/heif",
    ).split(",")
    if item.strip()
]

BUNNY_STORAGE_ZONE = config("BUNNY_STORAGE_ZONE", default="").strip()
BUNNY_STORAGE_ENDPOINT = config("BUNNY_STORAGE_ENDPOINT", default="storage.bunnycdn.com").strip()
# Canonical access key (matches .env.production); legacy aliases kept below.
BUNNY_STORAGE_ACCESS_KEY = config("BUNNY_STORAGE_ACCESS_KEY", default="").strip()
BUNNY_STORAGE_PASSWORD = config("BUNNY_STORAGE_PASSWORD", default="").strip()
BUNNY_ACCESS_KEY = config("BUNNY_ACCESS_KEY", default="").strip()
# Canonical CDN hostname (e.g. "pfs-store.b-cdn.net"); legacy aliases kept below.
BUNNY_CDN_HOSTNAME = config("BUNNY_CDN_HOSTNAME", default="").strip()
BUNNY_CDN_BASE_URL = config("BUNNY_CDN_BASE_URL", default="").strip()
BUNNY_CDN_URL = config("BUNNY_CDN_URL", default="").strip()

CELERY_BROKER_URL = config("CELERY_BROKER_URL", default="redis://localhost:6379/0")
CELERY_RESULT_BACKEND = config("CELERY_RESULT_BACKEND", default=CELERY_BROKER_URL)
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": config("DJANGO_CACHE_REDIS_URL", default="redis://localhost:6379/1"),
        "KEY_PREFIX": "pfs",
    }
}

MERCHANT_FEED_INTERVAL_HOURS = config("MERCHANT_FEED_INTERVAL_HOURS", default=12, cast=int)
MERCHANT_FEED_CURRENCY = config("MERCHANT_FEED_CURRENCY", default="INR")
MERCHANT_FEED_DEFAULT_IMAGE_URL = config("MERCHANT_FEED_DEFAULT_IMAGE_URL", default="").strip()
ADMIN_EMAIL = config("ADMIN_EMAIL", default="").strip()
MERCHANT_PUSH_DEBOUNCE_MINUTES = config("MERCHANT_PUSH_DEBOUNCE_MINUTES", default=15, cast=int)
MERCHANT_PUSH_MAX_RUNS_PER_MINUTE = config("MERCHANT_PUSH_MAX_RUNS_PER_MINUTE", default=4, cast=int)
MERCHANT_PUSH_BATCH_SIZE = config("MERCHANT_PUSH_BATCH_SIZE", default=50, cast=int)
MERCHANT_PUSH_REDIS_URL = config("MERCHANT_PUSH_REDIS_URL", default="").strip()

# =============================================================================
# Email (AWS SES via django-anymail)
# =============================================================================

EMAIL_BACKEND = config("EMAIL_BACKEND", default="anymail.backends.amazon_ses.EmailBackend")

DEFAULT_FROM_EMAIL = config("DEFAULT_FROM_EMAIL", default="notifications@putforshare.com")
SERVER_EMAIL = config("SERVER_EMAIL", default=DEFAULT_FROM_EMAIL)
EMAIL_REPLY_TO = config("EMAIL_REPLY_TO", default="hi@putforshare.com")

# anymail picks up AWS creds from boto3's standard chain (env vars / IAM role),
# so we only need to pin the region here.
AWS_SES_CONFIGURATION_SET = config("AWS_SES_CONFIGURATION_SET", default="pfs-configuration-set").strip()

ANYMAIL = {
    "AMAZON_SES_CLIENT_PARAMS": {
        "region_name": config(
            "AWS_SES_REGION",
            default=config("AWS_DEFAULT_REGION", default="ap-south-1"),
        ),
        "aws_access_key_id": config("AWS_ACCESS_KEY_ID", default="") or None,
        "aws_secret_access_key": config("AWS_SECRET_ACCESS_KEY", default="") or None,
    },
    # Tag every outbound message with this SES configuration set so its
    # event destinations (SNS) receive bounce/complaint notifications.
    "AMAZON_SES_CONFIGURATION_SET_NAME": AWS_SES_CONFIGURATION_SET,
    # Shared secret for the SNS HTTPS webhook (anymail.urls). Required in
    # production (anymail emits a system check if missing).
    "WEBHOOK_SECRET": config("ANYMAIL_WEBHOOK_SECRET", default="").strip() or None,
}

# =============================================================================
