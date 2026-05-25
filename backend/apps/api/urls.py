from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.photos.views import PhotoViewSet
from apps.s3browser.views import S3BrowserViewSet
from apps.logistics.views import (
    PackageProfileViewSet,
    PackageViewSet,
    PickupRequestViewSet,
    PincodeViewSet,
    ShipperViewSet,
)

from .views import (
    AddressViewSet,
    AuthorViewSet,
    AuthorWithProductCountListAPIView,
    CategoryProductListAPIView,
    CategoryWithProductCountListAPIView,
    CategoryViewSet,
    ChangePasswordAPIView,
    CartAPIView,
    CartAddAPIView,
    CartItemDetailAPIView,
    CartItemsAPIView,
    CartMergeAPIView,
    CartRemoveAPIView,
    CartUpdateAPIView,
    SuperAdminKPIAPIView,
    MerchantFeedXMLAPIView,
    AdminMerchantFeedSyncAPIView,
    CheckoutAPIView,
    CheckoutInitiateAPIView,
    CheckoutPreviewAPIView,
    ConfirmPasswordResetAPIView,
    GraphQLAPIView,
    InventoryMetadataFetchAPIView,
    LoginAPIView,
    LogoutAPIView,
    MeAPIView,
    MyInventoryViewSet,
    OrderViewSet,
    ProductViewSet,
    PublisherViewSet,
    PublisherWithProductCountListAPIView,
    RequestPasswordResetAPIView,
    ResendEmailVerificationAPIView,
    SignupAPIView,
    VerifyEmailAPIView,
    TagProductListAPIView,
    TagWithProductCountListAPIView,
    ReStoreProductListAPIView,
    UnderPriceProductListAPIView,
    UserProfileAPIView,
    UserViewSet,
    AdminUserViewSet,
    AdminAddressViewSet,
    AdminInventoryViewSet,
    AdminPackageViewSet,
    AdminPickupRequestViewSet,
    AdminUserAddressListAPIView,
    AdminUserPackageListAPIView,
    AdminUserPickupRequestListAPIView,
    AdminUserInventoryListAPIView,
    AdminUserOrderListAPIView,
    AdminOrderListAPIView,
    AdminOrderDetailAPIView,
    PaymentVerifyAPIView,
    PaymentInitiateAPIView,
    PaymentWebhookAPIView,
    RefundAPIView,
    SellerProductListAPIView,
    SellerWithProductCountListAPIView,
)

router = DefaultRouter()
router.register("users", UserViewSet, basename="users")
router.register("admin/users", AdminUserViewSet, basename="admin-users")
router.register("admin/addresses", AdminAddressViewSet, basename="admin-addresses")
router.register("admin/inventories", AdminInventoryViewSet, basename="admin-inventories")
router.register("admin/packages", AdminPackageViewSet, basename="admin-packages")
router.register("admin/pickup-requests", AdminPickupRequestViewSet, basename="admin-pickup-requests")
router.register("addresses", AddressViewSet, basename="addresses")
router.register("inventory/categories", CategoryViewSet, basename="inventory-categories")
router.register("inventory/authors", AuthorViewSet, basename="inventory-authors")
router.register("inventory/publishers", PublisherViewSet, basename="inventory-publishers")
router.register("inventory/products", ProductViewSet, basename="inventory-products")
router.register("inventory/my-products", MyInventoryViewSet, basename="my-inventory-products")
router.register("orders", OrderViewSet, basename="orders")
router.register("photos", PhotoViewSet, basename="photos")
router.register("s3-browser", S3BrowserViewSet, basename="s3-browser")
router.register("logistics/pincodes", PincodeViewSet, basename="logistics-pincodes")
router.register("logistics/shippers", ShipperViewSet, basename="logistics-shippers")
router.register("logistics/pickup-requests", PickupRequestViewSet, basename="logistics-pickup-requests")
router.register("logistics/packages", PackageViewSet, basename="logistics-packages")
router.register("logistics/package-profiles", PackageProfileViewSet, basename="logistics-package-profiles")

urlpatterns = [
    path("cart/", CartAPIView.as_view(), name="cart"),
    path("cart/add/", CartAddAPIView.as_view(), name="cart-add"),
    path("cart/update/", CartUpdateAPIView.as_view(), name="cart-update"),
    path("cart/remove/", CartRemoveAPIView.as_view(), name="cart-remove"),
    path("cart/merge/", CartMergeAPIView.as_view(), name="cart-merge"),
    path("cart/items/", CartItemsAPIView.as_view(), name="cart-items"),
    path("cart/items/<uuid:uuid>/", CartItemDetailAPIView.as_view(), name="cart-item-detail"),
    path("admin/users/<uuid:uuid>/addresses/", AdminUserAddressListAPIView.as_view(), name="admin-user-addresses"),
    path("admin/users/<uuid:uuid>/packages/", AdminUserPackageListAPIView.as_view(), name="admin-user-packages"),
    path(
        "admin/users/<uuid:uuid>/pickup-requests/",
        AdminUserPickupRequestListAPIView.as_view(),
        name="admin-user-pickup-requests",
    ),
    path("admin/users/<uuid:uuid>/inventories/", AdminUserInventoryListAPIView.as_view(), name="admin-user-inventories"),
    path("admin/users/<uuid:uuid>/orders/", AdminUserOrderListAPIView.as_view(), name="admin-user-orders"),
    path("admin/orders/", AdminOrderListAPIView.as_view(), name="admin-orders"),
    path("admin/orders/<uuid:uuid>/", AdminOrderDetailAPIView.as_view(), name="admin-order-detail"),
    path("admin/kpis/", SuperAdminKPIAPIView.as_view(), name="admin-kpis"),
    path("auth/signup/", SignupAPIView.as_view(), name="auth-signup"),
    path("auth/login/", LoginAPIView.as_view(), name="auth-login"),
    path("auth/change-password/", ChangePasswordAPIView.as_view(), name="auth-change-password"),
    path("auth/password-reset/request/", RequestPasswordResetAPIView.as_view(), name="auth-password-reset-request"),
    path("auth/password-reset/confirm/", ConfirmPasswordResetAPIView.as_view(), name="auth-password-reset-confirm"),
    path("auth/verify-email/", VerifyEmailAPIView.as_view(), name="auth-verify-email"),
    path("auth/verify-email/resend/", ResendEmailVerificationAPIView.as_view(), name="auth-verify-email-resend"),
    path("auth/verify-email/<str:token>/", VerifyEmailAPIView.as_view(), name="auth-verify-email-get"),
    path("auth/logout/", LogoutAPIView.as_view(), name="auth-logout"),
    path("auth/me/", MeAPIView.as_view(), name="auth-me"),
    path("users/<uuid:uuid>/profile/", UserProfileAPIView.as_view(), name="user-profile"),
    path("checkout/", CheckoutAPIView.as_view(), name="checkout"),
    path("checkout/preview/", CheckoutPreviewAPIView.as_view(), name="checkout-preview"),
    path("checkout/initiate/", CheckoutInitiateAPIView.as_view(), name="checkout-initiate"),
    path("payment/initiate/", PaymentInitiateAPIView.as_view(), name="payment-initiate"),
    path("payment/verify/", PaymentVerifyAPIView.as_view(), name="payment-verify"),
    path("payment/webhook/", PaymentWebhookAPIView.as_view(), name="payment-webhook"),
    path("refund/", RefundAPIView.as_view(), name="refund"),
    path(
        "inventory/categories/with-product-count/",
        CategoryWithProductCountListAPIView.as_view(),
        name="inventory-category-with-product-count",
    ),
    path("inventory/tags/", TagWithProductCountListAPIView.as_view(), name="inventory-tag-with-product-count"),
    path(
        "inventory/authors/with-product-count/",
        AuthorWithProductCountListAPIView.as_view(),
        name="inventory-author-with-product-count",
    ),
    path(
        "inventory/publishers/with-product-count/",
        PublisherWithProductCountListAPIView.as_view(),
        name="inventory-publisher-with-product-count",
    ),
    path(
        "inventory/sellers/with-product-count/",
        SellerWithProductCountListAPIView.as_view(),
        name="inventory-seller-with-product-count",
    ),
    path("inventory/categories/<uuid:uuid>/products/", CategoryProductListAPIView.as_view(), name="inventory-category-products"),
    path("inventory/tags/<slug:slug>/products/", TagProductListAPIView.as_view(), name="inventory-tag-products"),
    path("inventory/sellers/<uuid:uuid>/products/", SellerProductListAPIView.as_view(), name="inventory-seller-products"),
    path("inventory/re-store/products/", ReStoreProductListAPIView.as_view(), name="inventory-re-store-products"),
    path("inventory/under-price/products/", UnderPriceProductListAPIView.as_view(), name="inventory-under-price-products"),
    path("inventory/isbn/fetch/", InventoryMetadataFetchAPIView.as_view(), name="inventory-isbn-fetch"),
    path("graphql/", GraphQLAPIView.as_view(), name="graphql"),
    path("seo/google-merchant-feed.xml", MerchantFeedXMLAPIView.as_view(), name="seo-google-merchant-feed"),
    path("admin/merchant-feed/sync/", AdminMerchantFeedSyncAPIView.as_view(), name="admin-merchant-feed-sync"),
]

urlpatterns += router.urls
