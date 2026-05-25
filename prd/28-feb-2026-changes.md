• 1. Built SEO sitemap support for /nstore with DRF-backed entities
Changes:

- Added seller sitemap backend support:
  - GET /api/v1/inventory/sellers/with-product-count/
  - GET /api/v1/inventory/sellers/<uuid>/products/
- Added seller serializer/view/url + tests
- Updated Next sitemap to include:
  - products, tags, categories, authors, publishers, sellers
- Added seller page route in Next:
  - /seller/[uuid]/products
    Files:
- backend/apps/api/serializers.py
- backend/apps/api/views.py
- backend/apps/api/urls.py
- backend/apps/api/tests.py
- nstore/src/app/sitemap.js
- nstore/src/lib/serverApi.js
- nstore/src/app/seller/[uuid]/products/page.jsx

2. Added /store production base-path support for Next + sitemap URLs
   Changes:

- Added configurable NEXT_BASE_PATH in Next config
- Made sitemap prepend NEXT_PUBLIC_BASE_PATH/NEXT_BASE_PATH
- Updated env examples
  Files:
- nstore/next.config.js
- nstore/src/app/sitemap.js
- nstore/.env.example

3. Created env files for local + production
   Changes:

- Updated .env.local
- Added .env.production preconfigured for /store
  Files:
- nstore/.env.local
- nstore/.env.production

4. Fixed Django CORS/CSRF for localhost:3000
   Changes:

- Made allowed origins env-configurable
- Added sane defaults for both 3000 and 5173 hosts
  Files:
- backend/config/settings.py

5. Redesigned /nstore/profile with professional UI
   Changes:

- Full profile page visual/UX overhaul
- Better auth redirect handling and field errors
  Files:
- nstore/src/components/ProfilePageClient.jsx

6. Implemented seller-only plan lock + upi_verified backend support
   Changes:

- Added User.upi_verified
- Migration backfill:
  - set upi_verified=true if upi_last_verified_on exists
  - unlock non-seller plan_locked
- Serializer logic: plan lock enforced only for sellers
- Added tests for seller lock + upi_verified in /auth/me
  Files:
- backend/apps/users/models.py
- backend/apps/users/migrations/0009_user_upi_verified_and_seller_plan_lock.py
- backend/apps/api/serializers.py
- backend/apps/api/tests.py
- nstore/src/components/ProfilePageClient.jsx

7. Updated /dash for upi_verified and seller lock parity
   Changes:

- Added UPI Verified toggle in admin user form
- Added mobile/UPI verification chips in admin user show
- Updated seller profile page behavior:
  - seller-only plan lock logic
  - plan lock helper text
  - UPI verified status display
    Files:
- dash/src/index.jsx

8. Header/nav updates in /nstore
   Changes:

- Added username before profile icon
- Vertically aligned username with icon
- Added Products menu item before Categories
- Added logout item in profile menus with separator and logout last
  Files:
- nstore/src/components/Header.jsx

9. Fixed hydration mismatch on /
   Changes:

- Prevented SSR/client auth state mismatch by deferring localStorage user load to useEffect
  Files:
- nstore/src/components/ClientShell.jsx

10. Systematic debugging + fixes for empty storefront data
    Root causes found:

- backend connectivity issues to API
- silent empty SSR fallbacks hiding failures
- GraphQL path could return empty while REST had data
  Changes:
- Added explicit initial error propagation for categories/tags/authors/publishers
- Added GraphQL→REST fallback for products/authors/publishers (both SSR + client API layers)
- Added /product alias route to same listing as /
  Files:
- nstore/src/app/categories/page.jsx
- nstore/src/app/tags/page.jsx
- nstore/src/app/authors/page.jsx
- nstore/src/app/publishers/page.jsx
- nstore/src/components/CategoriesClient.jsx
- nstore/src/components/TagsClient.jsx
- nstore/src/components/AuthorsClient.jsx
- nstore/src/components/PublishersClient.jsx
- nstore/src/lib/serverApi.js
- nstore/src/lib/api.js
- nstore/src/app/product/page.jsx
