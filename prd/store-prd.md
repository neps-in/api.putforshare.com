# Storefront PRD (Frontend)

## Summary

Build a customer-facing storefront for Put For Share (pre-loved books and essentials). The frontend provides product discovery, browsing by taxonomy (categories/tags/authors/publishers), product details, cart, checkout with Razorpay, and account management (auth, profile, orders, addresses). It also includes an internal photo-upload utility for linking images to products, authors, publishers, etc.

## Goals

- Enable customers to discover and purchase products quickly (search, browse, filters, product detail).
- Provide a full purchase journey: cart → checkout → payment → order success.
- Support account lifecycle: signup, login, password reset, profile updates, address book, order history.
- Provide a responsive, accessible UI that matches the brand styling used in the existing store.
- Keep interactions fast with optimistic client-side cart updates and minimal friction.

## Non-Goals

- Admin/warehouse workflows.
- Inventory creation or editing (beyond photo upload utility).
- Analytics dashboards.
- Multi-currency or multi-language support (future scope).

## Target Users

- Guest shoppers (browse, search, add to cart).
- Registered customers (checkout, orders, profile, addresses).
- Internal team members using the photo upload utility.

## User Journeys

1. **Browse & Search**: Landing → browse by category/tag/author/publisher → filter/sort → product detail.
2. **Purchase**: Product list → add to cart → cart → checkout → Razorpay payment → order success.
3. **Account**: Signup → login → profile updates → view orders → retry payment for failed orders.
4. **Photo Upload**: Authenticated user → upload image → attach to target type.

## Information Architecture / Routes

- `/` Product listing (default products)
- `/re-store` Rs 1 product listing (paginated)
- `/under-10` Price-under listing (slider max price)
- `/categories` Category listing
- `/tags` Tag listing
- `/authors` Author listing
- `/publishers` Publisher listing
- `/category/:uuid/products` Category product listing
- `/tag/:slug/products` Tag product listing
- `/author/:slug/books` Author product listing
- `/publisher/:slug/books` Publisher product listing
- `/product/:uuid` Product detail
- `/cart` Cart page
- `/checkout` Checkout (requires auth)
- `/order-success` Order confirmation
- `/orders` Order history
- `/addresses` Address book
- `/profile` Profile edit
- `/login` Login
- `/signup` Signup
- `/forgot-password` Forgot password
- `/reset-password` Reset password
- `/change-password` Change password
- `/photos/upload` Photo upload utility

## Functional Requirements

### Header & Navigation

- Global header with brand, search, cart, profile, and "Browse By" dropdown.
- Secondary nav with quick links (Re Store, 10 Rs Store, categories, tags, authors, publishers, etc.).
- Header hidden on auth routes.

### Product Listing

- Search by name/short description/SKU (client-side filtering).
- Sort: featured (default), price low-high, price high-low, name.
- Stock filter: in-stock only.
- Card view shows SKU, name, short description, sale price, stock status, add-to-cart.
- Pagination for category/tag/author/publisher lists and special stores.

### Product Detail

- Show title, SKU, description, price, stock.
- Category + tags links.
- Book-specific metadata (ISBNs, language, edition, cover, pages, publisher, authors).

### Cart & Cart Drawer

- Add/remove/update quantities with stock constraints.
- Drawer shows subtotal and quick link to cart.
- Cart page shows item list and subtotal.

### Checkout

- Requires authentication; redirect to login if not logged in.
- Select shipping address.
- Order summary with subtotal/discount/total.
- Initiate checkout and launch Razorpay modal.
- Verify payment and navigate to order success on success.

### Orders

- List orders with status and items.
- Retry payment for pending/failed orders.
- Reorder for cancelled orders.

### Auth

- Signup (full name, username, email, password, TOS checkbox).
- Login.
- Forgot/reset password.
- Change password.

### Profile

- Update full name, username, mobile, favourite book, UPI ID, plan.
- Read-only fields for verification, inventories, earnings, created/updated dates.

### Address Book

- List addresses (read-only display).
- Select address during checkout.

### Photo Upload Utility

- Auth-only.
- Upload or capture image, presign S3 upload.
- Attach photo to target (product/book/soap/user/author/publisher/category/tag) with relation type.

## Integrations & APIs

### GraphQL

- Products list, product detail.
- Categories/tags/authors/publishers with product counts.
- Filtered products by category/tag/author/publisher.

### REST

- Re Store products: `inventory/re-store/products/`.
- Under-price products: `inventory/under-price/products/`.
- Addresses: `addresses/`.
- Checkout preview: `checkout/preview/`.
- Checkout initiate: `checkout/initiate/`.
- Payment initiate: `payment/initiate/`.
- Payment verify: `payment/verify/`.
- Orders list: `orders/`.
- Auth endpoints via shared `authClient`.
- Photo upload: `photos/presign-upload/`, `photos/:uuid/mark-uploaded/`, `photos/:uuid/attach/`.

## Data Model (Client)

- Product: `uuid`, `sku`, `name`, `short_description`, `description`, `sale_price`, `stock_quantity`, `product_type`, `category`, `tag_details`, `book_details`.
- Order: `uuid`, `status`, `total_payable`, `items[]`.
- Cart item: product + `quantity` (client-managed).
- User: `full_name`, `email`, `username`, `mobile`, `plan`, `favourite_book`, `upi_id`, `inventories`, `net_earnings`, `created_on`, `updated_on`.
- Address: displayable fields, `default_shipping_address`.

## UX/UI Requirements

- Responsive layout with mobile-friendly toolbar and nav.
- Skeleton loaders for product grids and details.
- Brand styling with orange/teal palette and warm surfaces.
- Auth pages use carousel variant for login/signup/forgot flows.
- Cart drawer with overlay, animated open/close.
- Focus-visible states on cards and inputs.

## Error States

- Backend unavailable → show error message on listing pages.
- Empty states for lists (no products, no addresses, no orders).
- Form errors mapped per field and top-level message.
- Razorpay failure: show error and allow retry.

## Accessibility

- Keyboard navigation for cards and dropdowns.
- ARIA labels on cart drawer, dropdowns, buttons.
- Color contrast on badges and status pills.

## Performance

- Pagination for large lists.
- Client-side search and sorting within the current page.
- Avoid blocking renders; use loading placeholders.

## Analytics (Optional)

- Page view tracking by route.
- Add-to-cart events.
- Checkout start/complete.
- Payment failure reasons.

## Success Metrics

- Conversion rate from product view to checkout.
- Checkout completion rate.
- Payment retry success rate.
- Average time to first product interaction.

## Risks & Mitigations

- Payment SDK availability: handle missing Razorpay script and show actionable errors.
- Stock accuracy: enforce max quantity in UI and prevent add beyond stock.
- Auth token invalidation: on fetch failures, reset session and prompt login.

## Open Questions

- Do we need product images on listing cards (API currently not used)? - No tentatively
- Should address creation/editing be added to storefront? - yes
