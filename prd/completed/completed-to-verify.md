## Add Author, Publisher clickable in product detail page

- Added GraphQL support for author/publisher book filtering:
  - productsByAuthor and productsByPublisher handlers wired in backend/apps/api/views.py:318
  - Query methods added in backend/apps/api/views.py:416 and backend/apps/api/views.py:423
- Added frontend API queries/helpers:
  - PRODUCTS_BY_AUTHOR_QUERY and PRODUCTS_BY_PUBLISHER_QUERY in store/src/api.js:166 and store/src/api.js:184
  - fetchProductsByAuthor and fetchProductsByPublisher in store/src/api.js:278 and store/src/api.js:287
- Made author/publisher cards clickable to book-list pages:
  - Authors list card link in store/src/App.jsx:430
  - Publishers list card link in store/src/App.jsx:487
- Added new pages and routes:
  - AuthorBooksPage in store/src/App.jsx:694
  - PublisherBooksPage in store/src/App.jsx:789
  - Routes /author/:slug/books and /publisher/:slug/books in store/src/App.jsx:1566 and store/src/App.jsx:1567
- Updated product detail page links:
  - Publisher clickable link in store/src/App.jsx:949
  - Author clickable links in store/src/App.jsx:962

Sanity checks passed: backend file compiles and frontend build succeeds.

Product detail now shows:

- Associated category
- Associated tags
- Full book metadata (when product type is BOOK): ISBN-10, ISBN-13, language, edition, cover type, page count, published year,
  publisher, authors.

Updated files:

- backend/apps/api/serializers.py
  - Added ProductDetailSerializer with book_details
  - Added nested serializers for book/publisher/author detail
- backend/apps/api/views.py
  - ProductViewSet now uses ProductDetailSerializer for retrieve
  - GraphQL productDetail now returns ProductDetailSerializer
- store/src/api.js
  - Expanded PRODUCT_DETAIL_QUERY to fetch product_type + book_details
- store/src/App.jsx
  - ProductDetailPage now renders full “Book Details” section
- store/src/styles.css
  - Added styling for book details layout

Also added a test for this behavior in:

- backend/apps/api/tests.py (test_product_detail_includes_book_details)

• Current /dash code work completed:

1. App shell and routing

- dash/src/App.jsx: React-Admin app setup with theme, resources, auth/data providers.
- dash/src/App.jsx: Added basename="/dash" so dashboard routes work under /dash/\*.
- dash/src/App.jsx: Custom routes added for /signup, /forgot-password, /reset-password, /me, /change-password.

2. App entry

- dash/src/main.jsx: React app bootstrap.

3. Authentication integration

- dash/src/auth/authProvider.js: login/logout/checkAuth/checkError/getIdentity/getPermissions.
- dash/src/auth/authProvider.js: role gating to only allow SELLER and ADMIN.
- dash/src/auth/authProvider.js: user normalization to pfs_role, uuid, and shared auth client usage.

4. Auth and profile pages UI

- dash/src/auth/pages.jsx: LoginPage
- dash/src/auth/pages.jsx: SignupPage
- dash/src/auth/pages.jsx: ForgotPasswordPage
- dash/src/auth/pages.jsx: ResetPasswordPage
- dash/src/auth/pages.jsx: ChangePasswordPage
- dash/src/auth/pages.jsx: MyProfilePage with /auth/me/ GET/PATCH integration.
- dash/src/auth/pages.jsx: profile fields include favourite_book, verified-mobile indicator (✔✔ Verified), read-only
  inventories, net_earnings, is_active, created_on, updated_on, and “Change My Password” link.

5. Dashboard and menu

- dash/src/components/Dashboard.jsx: KPI cards for admin/seller.
- dash/src/components/Menu.jsx: menu items for profile and change password.

6. Data provider layer

- dash/src/data/provider.js: fake data provider with scope filtering (scope=my) by resource owner field.
- dash/src/data/seedData.js: seed dataset for local dashboard resources.

7. Resource CRUD screens

- dash/src/resources/users.jsx: users list.
- dash/src/resources/orders.jsx: list/create/edit.
- dash/src/resources/addresses.jsx: list/create/edit.
- dash/src/resources/packages.jsx: list/create/edit.
- dash/src/resources/pickupRequests.jsx: list/create/edit.
- dash/src/resources/photos.jsx: list/create/edit.
- dash/src/resources/\*: edit views now use actions={false} to bypass React-Admin CloneButton runtime issue.

8. Build status

- dash builds successfully with Vite (npm run build passed).

Note:

- Git currently shows dash/ as untracked (?? dash/), so these are present in workspace but not yet committed.
