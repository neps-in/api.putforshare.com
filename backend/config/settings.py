import os
from pathlib import Path

try:
    from dotenv import load_dotenv
except Exception:
    load_dotenv = None

BASE_DIR = Path(__file__).resolve().parent.parent

env_name = os.environ.get("DJANGO_ENV", "").lower()
env_file = BASE_DIR / (".env.production" if env_name == "production" else ".env")

if load_dotenv:
    load_dotenv(env_file)
else:
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            os.environ.setdefault(key, value)


# Sentry Error logging integration only for production
if env_name == "production":

    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration

    sentry_sdk.init(
        dsn=os.environ.get("SENTRY_DSN", ""),
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


def _env_bool(name: str, default: bool = False) -> bool:
    return os.environ.get(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


def _env_list(name: str, default: str = "") -> list[str]:
    return [item.strip() for item in os.environ.get(name, default).split(",") if item.strip()]


# For ISBNAPI Service
BOOK_CACHE_DIR = os.environ.get("BOOK_CACHE_DIR", str(BASE_DIR / "book_cache")).strip()
BOOK_CACHE_TTL = int(os.environ.get("BOOK_CACHE_TTL", str(48 * 60 * 60)))


SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-secret-key-change-me")
DEBUG = _env_bool("DJANGO_DEBUG", True)
ALLOWED_HOSTS = _env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")

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

FRONTEND_BASE_URL = os.environ.get("FRONTEND_BASE_URL", "http://localhost:3000").rstrip("/")

_default_frontend_origins = ",".join(
    [
        FRONTEND_BASE_URL,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
)

CORS_ALLOWED_ORIGINS = _env_list("CORS_ALLOWED_ORIGINS", _default_frontend_origins)
CSRF_TRUSTED_ORIGINS = _env_list("CSRF_TRUSTED_ORIGINS", _default_frontend_origins)
CORS_ALLOW_CREDENTIALS = _env_bool("CORS_ALLOW_CREDENTIALS", True)

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


AWS_S3_BUCKET_NAME = os.environ.get("AWS_S3_BUCKET_NAME", "") or os.environ.get(
    "AWS_STORAGE_BUCKET_NAME", ""
)
AWS_STORAGE_BUCKET_NAME = AWS_S3_BUCKET_NAME
AWS_S3_REGION_NAME = os.environ.get("AWS_S3_REGION_NAME", "")
AWS_S3_ENDPOINT_URL = os.environ.get("AWS_S3_ENDPOINT_URL", "")
AWS_S3_PUBLIC_BASE_URL = os.environ.get("AWS_S3_PUBLIC_BASE_URL", "")

AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID", "")
AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY", "")
AWS_SESSION_TOKEN = os.environ.get("AWS_SESSION_TOKEN", "")

PHOTO_STORAGE_BACKEND = os.environ.get("PHOTO_STORAGE_BACKEND", "").strip().lower()
PHOTO_S3_UPLOAD_PREFIX = os.environ.get("PHOTO_S3_UPLOAD_PREFIX", "uploads/photos")
PHOTO_S3_PRESIGNED_EXPIRES = int(os.environ.get("PHOTO_S3_PRESIGNED_EXPIRES", "900"))
PHOTO_MAX_UPLOAD_BYTES = int(os.environ.get("PHOTO_MAX_UPLOAD_BYTES", str(10 * 1024 * 1024)))
PHOTO_ALLOWED_CONTENT_TYPES = [
    item.strip().lower()
    for item in os.environ.get(
        "PHOTO_ALLOWED_CONTENT_TYPES",
        "image/jpeg,image/png,image/webp,image/heic,image/heif",
    ).split(",")
    if item.strip()
]

BUNNY_STORAGE_ZONE = os.environ.get("BUNNY_STORAGE_ZONE", "").strip()
BUNNY_STORAGE_ENDPOINT = os.environ.get("BUNNY_STORAGE_ENDPOINT", "storage.bunnycdn.com").strip()
# Canonical access key (matches .env.production); legacy aliases kept below.
BUNNY_STORAGE_ACCESS_KEY = os.environ.get("BUNNY_STORAGE_ACCESS_KEY", "").strip()
BUNNY_STORAGE_PASSWORD = os.environ.get("BUNNY_STORAGE_PASSWORD", "").strip()
BUNNY_ACCESS_KEY = os.environ.get("BUNNY_ACCESS_KEY", "").strip()
# Canonical CDN hostname (e.g. "pfs-store.b-cdn.net"); legacy aliases kept below.
BUNNY_CDN_HOSTNAME = os.environ.get("BUNNY_CDN_HOSTNAME", "").strip()
BUNNY_CDN_BASE_URL = os.environ.get("BUNNY_CDN_BASE_URL", "").strip()
BUNNY_CDN_URL = os.environ.get("BUNNY_CDN_URL", "").strip()

CELERY_BROKER_URL = os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/0")
CELERY_RESULT_BACKEND = os.environ.get("CELERY_RESULT_BACKEND", CELERY_BROKER_URL)
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": os.environ.get("DJANGO_CACHE_REDIS_URL", "redis://localhost:6379/1"),
        "KEY_PREFIX": "pfs",
    }
}

MERCHANT_FEED_INTERVAL_HOURS = int(os.environ.get("MERCHANT_FEED_INTERVAL_HOURS", "12"))
MERCHANT_FEED_CURRENCY = os.environ.get("MERCHANT_FEED_CURRENCY", "INR")
MERCHANT_FEED_DEFAULT_IMAGE_URL = os.environ.get("MERCHANT_FEED_DEFAULT_IMAGE_URL", "").strip()
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "").strip()
MERCHANT_PUSH_DEBOUNCE_MINUTES = int(os.environ.get("MERCHANT_PUSH_DEBOUNCE_MINUTES", "15"))
MERCHANT_PUSH_MAX_RUNS_PER_MINUTE = int(os.environ.get("MERCHANT_PUSH_MAX_RUNS_PER_MINUTE", "4"))
MERCHANT_PUSH_BATCH_SIZE = int(os.environ.get("MERCHANT_PUSH_BATCH_SIZE", "50"))
MERCHANT_PUSH_REDIS_URL = os.environ.get("MERCHANT_PUSH_REDIS_URL", "").strip()

# =============================================================================
# Email (AWS SES via django-anymail)
# =============================================================================

EMAIL_BACKEND = os.environ.get(
    "EMAIL_BACKEND", "anymail.backends.amazon_ses.EmailBackend"
)

DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", "notifications@putforshare.com")
SERVER_EMAIL = os.environ.get("SERVER_EMAIL", DEFAULT_FROM_EMAIL)
EMAIL_REPLY_TO = os.environ.get("EMAIL_REPLY_TO", "hi@putforshare.com")

# anymail picks up AWS creds from boto3's standard chain (env vars / IAM role),
# so we only need to pin the region here.
ANYMAIL = {
    "AMAZON_SES_CLIENT_PARAMS": {
        "region_name": os.environ.get(
            "AWS_SES_REGION",
            os.environ.get("AWS_DEFAULT_REGION", "ap-south-1"),
        ),
        "aws_access_key_id": os.environ.get("AWS_ACCESS_KEY_ID", "") or None,
        "aws_secret_access_key": os.environ.get("AWS_SECRET_ACCESS_KEY", "") or None,
    },
}

# =============================================================================
