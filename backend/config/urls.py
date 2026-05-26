from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.common.views import healthz

urlpatterns = [
    path("admin/", admin.site.urls),

    # Liveness/readiness probe for load balancers + uptime monitors.
    path("healthz/", healthz, name="healthz"),

    path("api/v1/", include("apps.api.urls")),
    path("api/v1/inventory/", include("apps.inventory.urls")),
    path("api/v1/lookups/", include("apps.lookups.urls")),
    # ISBN metadata resolver — DRF endpoints for book lookup + cache invalidation.
    path("api/v1/books/", include("apps.inventory.services.isbnapi.urls")),

    # SES bounce/complaint webhook (SNS HTTPS subscription target).
    # Anymail exposes /anymail/amazon_ses/tracking/<WEBHOOK_SECRET>/
    path("anymail/", include("anymail.urls")),

    path('api/docs/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),

]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
