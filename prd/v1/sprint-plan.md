# Development Sprint Plan: Pre-Owned Gadgets Marketplace

## Overview

**Timeline:** 10 weeks (5 sprints × 2 weeks each)  
**Team Structure:** Backend Dev, Frontend Dev, UI/UX Designer, QA/Tester, DevOps  
**Sprint Cadence:** 2-week sprints with planning, daily standups, and retrospectives  
**Definition of Done:** Code reviewed, tested (unit + integration), deployed to staging, documented

### Sprint Summary

**5 Two-Week Sprints:**

1. **Sprint 1 (Weeks 1-2):** Authentication & User Management - 45 story points
2. **Sprint 2 (Weeks 3-4):** Product Listings, Categories & Tags - 52 story points
3. **Sprint 3 (Weeks 5-6):** Search, Browse & Product Details - 35 story points
4. **Sprint 4 (Weeks 7-8):** Payment Integration & Escrow - 50 story points
5. **Sprint 5 (Weeks 9-10):** Polish, Testing & Launch Prep - 50 story points

**Total:** ~232 story points across all sprints

---

## Sprint 0: Pre-Development Setup (Week 0)

**Duration:** 3-5 days before Sprint 1  
**Goal:** Foundation ready for development to begin

### DevOps Tasks

- [ ] Provision AWS account and configure Mumbai region
- [ ] Create S3 bucket for image storage with CDN (CloudFront)
- [ ] Set up PostgreSQL database (local dev + staging environment)
- [ ] Configure GitHub repository with branch protection rules
- [ ] Set up CI/CD pipeline (GitHub Actions or GitLab CI)
- [ ] Deploy skeleton Django + React apps to staging
- [ ] Configure environment variables and secrets management
- [ ] Set up monitoring (error tracking with Sentry free tier)

### Business/Legal Tasks

- [ ] Register domain name and configure DNS
- [ ] Set up Razorpay test account and obtain API keys
- [ ] Configure AWS SES (Simple Email Service):
  - Verify sender email address or domain
  - Request production access (move out of sandbox)
  - Obtain AWS SES credentials (Access Key ID, Secret Access Key)
  - Configure SES region (use Mumbai ap-south-1 for India)
- [ ] Draft Terms of Service (use template + customize)
- [ ] Draft Privacy Policy (use template + customize)
- [ ] Create Safety Guidelines page content
- [ ] Set up Google OAuth credentials for social login

### Design Tasks

- [ ] Create design system (colors, typography, spacing, components)
- [ ] Design high-fidelity mockups for priority screens:
  - Homepage
  - Signup/Login
  - Seller Profile
  - Create Listing
  - Search Results
  - Product Detail
  - Payment Flow
- [ ] Create responsive breakpoints (mobile, tablet, desktop)
- [ ] Export design assets (icons, logos, images)

**Sprint 0 Deliverables:**

- Staging environment live and accessible
- Design system documented
- All third-party accounts configured
- Repository with initial commit

---

## Sprint 1: Authentication & User Management (Weeks 1-2)

**Goal:** Users can sign up, log in, manage their accounts, and access role-based features

### Backend Tasks

**User Authentication (Priority: Critical)**

- [ ] Set up Django REST Framework with JWT authentication
- [ ] Implement user model (extend Django AbstractUser)
  - Fields: email, password, role (choices: GUEST, BUYER, SELLER, ADMIN), is_email_verified
  - Default role: GUEST (can upgrade to BUYER or SELLER)
- [ ] POST `/api/auth/signup` - Email/password registration
  - Validate email format and password strength
  - Send verification email with token
  - Default role: GUEST
- [ ] POST `/api/auth/verify-email` - Email verification endpoint
- [ ] POST `/api/auth/login` - Login with email/password
  - Return JWT access + refresh tokens + user role
- [ ] POST `/api/auth/refresh` - Refresh JWT token
- [ ] POST `/api/auth/logout` - Invalidate token
- [ ] POST `/api/auth/forgot-password` - Send reset email
- [ ] POST `/api/auth/reset-password` - Reset password with token
- [ ] POST `/api/auth/google` - Google OAuth integration
  - Validate Google token
  - Create or authenticate user
  - Default role: GUEST
- [ ] PATCH `/api/auth/upgrade-role` - Upgrade role to BUYER or SELLER
  - GUEST → BUYER: No additional requirements
  - GUEST → SELLER: Requires email verification + profile completion
- [ ] Implement role-based permissions decorators
  - @require_role('BUYER') for buyer-only endpoints
  - @require_role('SELLER') for seller-only endpoints
  - @require_role('ADMIN') for admin-only endpoints
- [ ] Write unit tests (80%+ coverage for auth flows including role checks)

**User Profile (Priority: High)**

- [ ] Create UserProfile model
  - Fields: user (FK), full_name, brand_name, nickname, bank_account_number (encrypted), ifsc_code, bank_name, branch_address, consent_given
- [ ] GET `/api/profile` - Get current user profile
- [ ] PUT `/api/profile` - Update profile
  - Validate IFSC code format (11 characters, alphanumeric)
  - Encrypt bank details before saving
- [ ] POST `/api/profile/consent` - Record bank detail consent
- [ ] Write unit tests for profile CRUD

**Email Service (Priority: High)**

- [ ] Install and configure **django-anymail** for AWS SES integration
  ```bash
  pip install django-anymail[amazon-ses] --break-system-packages
  ```
- [ ] Configure django-anymail in Django settings:

  ```python
  INSTALLED_APPS = [
      # ...
      'anymail',
  ]

  ANYMAIL = {
      "AMAZON_SES_CLIENT_PARAMS": {
          "aws_access_key_id": env('AWS_SES_ACCESS_KEY_ID'),
          "aws_secret_access_key": env('AWS_SES_SECRET_ACCESS_KEY'),
          "region_name": "ap-south-1",  # Mumbai region
      },
  }
  EMAIL_BACKEND = 'anymail.backends.amazon_ses.EmailBackend'
  DEFAULT_FROM_EMAIL = 'noreply@yourdomain.com'
  SERVER_EMAIL = 'admin@yourdomain.com'
  ```

- [ ] Create email templates (HTML + plain text fallback):
  - Welcome email
  - Email verification
  - Password reset
  - Transaction notifications (payment received, escrow held, payment released)
- [ ] Implement email sending functions using django-anymail:
  ```python
  from django.core.mail import send_mail
  from anymail.message import AnymailMessage
  ```
- [ ] Add email tracking (optional): Opens, clicks via SES notifications
- [ ] Implement async email sending (Celery + Redis optional, or Django background tasks)
- [ ] Write unit tests for email sending (use Anymail test backend)

**Estimated Story Points:** 24

### Frontend Tasks

**Authentication UI (Priority: Critical)**

- [ ] Set up React Router for navigation
- [ ] Create Auth context for global user state management (includes user role)
- [ ] Build Signup page
  - Email/password form with validation
  - Google OAuth button
  - Link to Login and Terms/Privacy
  - Default role: GUEST
- [ ] Build Email Verification success/pending pages
- [ ] Build Login page
  - Email/password form
  - Google OAuth button
  - "Forgot Password" link
  - Store user role in auth context after login
- [ ] Build Forgot Password flow
  - Email input page
  - Success message page
  - Reset password form page
- [ ] Build Role Selection/Upgrade page
  - For GUEST users: Choose "I want to buy" (BUYER) or "I want to sell" (SELLER)
  - Show after first login or as prompt in header
  - Call upgrade-role API endpoint
- [ ] Implement JWT token storage (localStorage + secure httpOnly cookies)
- [ ] Create PrivateRoute component for protected pages
- [ ] Implement role-based route guards
  - Redirect GUEST to role selection if accessing protected pages
  - Prevent non-SELLER from accessing listing creation
  - Prevent non-ADMIN from accessing admin dashboard
- [ ] Handle token refresh logic

**Profile Management UI (Priority: High)**

- [ ] Build Seller Profile page
  - Form with all fields (name, brand, bank details)
  - Consent checkbox for bank detail storage
  - Save and edit modes
  - Profile completion indicator
- [ ] Create reusable form components (Input, Select, Button, Checkbox)
- [ ] Implement form validation (client-side)
- [ ] Show success/error messages on save

**Shared Components (Priority: Medium)**

- [ ] Header/Navigation component
  - Logo, search bar placeholder
  - User menu with role-based options:
    - **GUEST:** Login, Signup
    - **BUYER:** My Purchases, Profile, Logout
    - **SELLER:** My Purchases, My Listings, Sell Item, Profile, Logout
    - **ADMIN:** Dashboard, Categories, Transactions, Disputes, Logout
  - "Upgrade to Seller" prompt for BUYER users (optional CTA)
- [ ] Footer component
  - Links to Terms, Privacy, Safety Guidelines
- [ ] Loading spinner component
- [ ] Toast/notification component for alerts
- [ ] Role guard wrapper component (conditionally renders based on user role)

**Estimated Story Points:** 21

### QA Tasks

- [ ] Test all signup flows (email, Google OAuth)
- [ ] Test email verification (valid/expired tokens)
- [ ] Test login flows (success, wrong password, unverified email)
- [ ] Test forgot password flow end-to-end
- [ ] Test profile creation and editing
- [ ] Test role upgrade flow (GUEST → BUYER, GUEST → SELLER)
- [ ] Test role-based access control:
  - GUEST cannot access protected pages
  - BUYER cannot access seller-only pages
  - SELLER cannot access admin pages
  - ADMIN can access all pages
- [ ] Test role-based menu display (correct items shown per role)
- [ ] Test form validations (client + server side)
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile responsive testing (iOS Safari, Android Chrome)
- [ ] Security testing: SQL injection, XSS attempts on forms, role escalation attempts

**Sprint 1 Deliverables:**

- ✅ Users can sign up with email or Google
- ✅ Email verification working
- ✅ Login/logout functional
- ✅ Password reset working
- ✅ Role-based authentication (GUEST, BUYER, SELLER, ADMIN)
- ✅ Role upgrade functionality (GUEST → BUYER/SELLER)
- ✅ Role-based menu and navigation display
- ✅ Role-based access control on routes and API endpoints
- ✅ Seller profile CRUD complete
- ✅ All tests passing

---

## Sprint 2: Product Listings & Categories (Weeks 3-4)

**Goal:** Sellers can create, edit, and manage product listings

### Backend Tasks

**Category Management (Priority: High)**

- [ ] Install and configure **django-treebeard** for hierarchical category management
  - Supports nested categories and subcategories (unlimited depth)
  - Efficient tree queries (materialized path approach)
- [ ] Create Category model using Treebeard's MP_Node
  - Fields: name, slug, description, icon_url, is_active, parent (FK to self for hierarchy)
  - Methods: get_children(), get_ancestors(), get_descendants()
- [ ] Seed default categories with subcategories:
  - Phones (iPhone, Android, Feature Phones)
  - Laptops (Windows, MacBooks, Chromebooks, Gaming Laptops)
  - Tablets (iPads, Android Tablets, Windows Tablets)
  - Accessories (Chargers, Cases, Headphones, Cables)
  - Other
- [ ] GET `/api/categories` - List all active categories with tree structure
  - Return nested JSON with parent-child relationships
  - Option to flatten for simple dropdown
- [ ] GET `/api/categories/:id` - Get single category with children
- [ ] POST `/api/categories` - Create category (requires ADMIN role)
  - Input: name, description, parent_id (optional for subcategory)
  - Auto-generate slug from name
- [ ] PUT `/api/categories/:id` - Update category (requires ADMIN role)
- [ ] DELETE `/api/categories/:id` - Delete category (requires ADMIN role)
  - Check for active listings in this category and all subcategories
  - Prevent deletion if listings exist (show count)
- [ ] PATCH `/api/categories/:id/move` - Move category to different parent (requires ADMIN role)
- [ ] Write unit tests for category CRUD and tree operations

**Tag Management (Priority: High)**

- [ ] Install and configure **django-taggit** for flexible tagging
  - Simple, reusable tagging for any model
  - Automatic tag creation (no pre-defined tag list needed)
- [ ] Add tagging to Listing model
  - Use TaggableManager from django-taggit
  - Tags stored separately, linked via many-to-many
- [ ] GET `/api/tags` - List all tags with usage count
  - Return: tag name, slug, listing count
  - Sort by popularity (most used tags first)
- [ ] GET `/api/tags/:slug/listings` - Get all listings with specific tag
- [ ] Listing endpoints automatically handle tags:
  - POST `/api/listings` includes `tags: ["wireless", "bluetooth", "new"]`
  - PUT `/api/listings/:id` can update tags
  - GET `/api/listings/:id` returns tags array
- [ ] Search integration: Tags included in full-text search
- [ ] Write unit tests for tag operations

**Product Listing (Priority: Critical)**

- [ ] Create Listing model
  - Fields: seller (FK to User), title, description, marked_price, offer_price, discount_percentage (auto-calculated), condition (choices: Like New, Good, Fair), category (FK), tags (TaggableManager), status (draft/active/sold), created_at, updated_at
  - Constraint: Only users with role=SELLER can create listings
- [ ] Create ListingImage model
  - Fields: listing (FK), image_url, order, uploaded_at
  - Constraint: Max 5 images per listing
- [ ] POST `/api/listings` - Create new listing (requires SELLER role)
  - Validate: title length, prices (offer ≤ marked), condition, category exists
  - Auto-calculate discount percentage
  - Save as draft or active based on request
  - Input includes tags array: `["wireless", "bluetooth", "warranty"]`
  - Tags auto-created if they don't exist
- [ ] POST `/api/listings/:id/images` - Upload images to S3
  - Validate: File type (JPG, PNG, WEBP), size (max 100MB)
  - Generate thumbnail (resize to 300x300)
  - Store S3 URL in database
  - Support batch upload (1-5 images)
- [ ] GET `/api/listings/:id` - Get single listing with images and tags
- [ ] GET `/api/listings/my-listings` - Get current seller's listings
- [ ] PUT `/api/listings/:id` - Update listing (requires SELLER role)
  - Only seller can edit their own listing
  - Can update tags array
- [ ] PATCH `/api/listings/:id/status` - Mark as sold/active
- [ ] DELETE `/api/listings/:id/images/:image_id` - Delete image
- [ ] Write unit tests for listing CRUD and image upload

**File Upload Service (Priority: High)**

- [ ] Configure AWS S3 bucket permissions (public read, authenticated write)
- [ ] Implement image compression before upload (Pillow library)
- [ ] Generate unique file names (UUID + timestamp)
- [ ] Create CloudFront distribution for image CDN
- [ ] Write helper functions for S3 upload/delete

**Estimated Story Points:** 28

### Frontend Tasks

**Listing Management UI (Priority: Critical)**

- [ ] Build Create Listing page
  - Multi-step form or single page with sections
  - Step 1: Basic info (title, description, category with subcategory dropdown, condition)
  - Step 2: Pricing (marked price, offer price, auto-show discount)
  - Step 3: Photos (drag-and-drop upload, preview, reorder, delete)
  - Step 4: Tags (tag input with autocomplete from popular tags, create new tags)
  - Save as draft or publish
  - Only accessible to users with SELLER role
- [ ] Build Edit Listing page (reuse Create Listing components)
- [ ] Build My Listings dashboard
  - Table/grid view of seller's listings
  - Filter by status (draft/active/sold)
  - Quick actions: Edit, Mark as Sold, Delete
  - Listing stats: Views (future), Inquiries (future)
  - Only accessible to users with SELLER role
- [ ] Image upload component
  - Drag-and-drop zone
  - File type and size validation
  - Progress bar during upload
  - Image preview grid with reorder/delete
  - Max 5 images enforcement
- [ ] Tag input component
  - Autocomplete suggestions from popular tags
  - Allow creating new tags
  - Visual tag pills (removable)
  - Max 10 tags per listing

**Reusable Components (Priority: Medium)**

- [ ] Price input component with INR formatting
- [ ] Image uploader component
- [ ] Nested category selector component (tree view or cascading dropdowns)
- [ ] Tag input component with autocomplete
- [ ] Rich text editor for description (optional: simple textarea is fine for V1)

**Estimated Story Points:** 24

### Design Tasks

- [ ] Design Admin Category Management screen (hierarchical tree view)
- [ ] Design tag input interaction (autocomplete, pills)
- [ ] Design image upload interaction (drag-drop states)
- [ ] Create listing card component design (for search results)

### QA Tasks

- [ ] Test listing creation flow end-to-end
- [ ] Test nested category selection (parent → child)
- [ ] Test tag input (autocomplete, create new, max 10 tags)
- [ ] Test image upload (valid files, invalid types, oversized files)
- [ ] Test auto-calculation of discount percentage
- [ ] Test edit listing (change prices, categories, tags, add/remove images)
- [ ] Test mark as sold functionality
- [ ] Test My Listings dashboard filtering
- [ ] Test permissions (non-SELLER cannot create listings)
- [ ] Test permissions (seller can't edit other seller's listings)
- [ ] Test category deletion prevention (when listings exist)
- [ ] Performance test: Upload 5 images × 100MB simultaneously
- [ ] Mobile responsive testing for create/edit forms

**Sprint 2 Deliverables:**

- ✅ Sellers can create listings with 1-5 photos
- ✅ Listings support nested categories and subcategories (django-treebeard)
- ✅ Listings support flexible tagging (django-taggit)
- ✅ Tag autocomplete and creation working
- ✅ Listings stored in database with S3 image URLs
- ✅ Edit and mark as sold working
- ✅ Categories (with hierarchy) manageable by ADMIN role via API
- ✅ All tests passing

---

## Sprint 3: Search, Browse & Product Details (Weeks 5-6)

**Goal:** Buyers can search, filter, and view product listings

### Backend Tasks

**Search & Browse (Priority: Critical)**

- [ ] Implement PostgreSQL full-text search
  - Create search vector on listing title + description + tags
  - Index for performance
- [ ] GET `/api/listings` - List/search listings with filters
  - Query params: `q` (search keyword), `category`, `condition`, `min_price`, `max_price`, `tags` (comma-separated), `sort` (price_asc, price_desc, newest)
  - Auto-exclude sold listings (status != sold)
  - Pagination: 20 items per page
  - Return: listings with first image, basic info, tags
- [ ] Optimize query performance (select_related, prefetch_related)
- [ ] GET `/api/listings/:id/related` - Get 4 related listings
  - Same category, similar price range (+/- 20%), or shared tags
  - Exclude current listing and sold items
- [ ] Write unit tests for search and filter logic including tag filtering

**Analytics (Priority: Low - Future Enhancement)**

- [ ] (Optional) Track listing views - create ListingView model
  - Fields: listing (FK), viewer_ip, viewed_at

**Estimated Story Points:** 13

### Frontend Tasks

**Homepage (Priority: Critical)**

- [ ] Build Homepage
  - Hero section with value proposition
  - Search bar (prominent CTA)
  - Featured/Recent listings grid (latest 12 listings)
  - Category quick links
  - Trust signals (email verified, escrow, safety)
- [ ] Implement search bar with autocomplete (optional for V1, can be simple input)
- [ ] Featured listings carousel or grid

**Search & Results (Priority: Critical)**

- [ ] Build Search Results page
  - Search bar at top (sticky)
  - Filter sidebar:
    - Price range slider (₹0 - ₹100,000)
    - Category checkboxes (dynamic from API, hierarchical)
    - Condition checkboxes
    - Popular tags (clickable tag cloud or checkboxes)
  - Sort dropdown (Price Low-High, Price High-Low, Newest)
  - Listing grid (responsive: 4 cols desktop, 2 cols tablet, 1 col mobile)
  - Pagination controls
  - Empty state when no results
- [ ] Build Listing Card component
  - Thumbnail image
  - Title (truncated to 2 lines)
  - Offer price (large, bold)
  - Marked price (strikethrough)
  - Discount % badge
  - Condition badge
  - Tag pills (show top 3 tags)
  - Click to view details
- [ ] Implement filter and sort logic (update URL params, fetch results)
- [ ] Implement pagination

**Product Detail Page (Priority: Critical)**

- [ ] Build Product Detail page
  - Breadcrumb navigation (Home > Category > Subcategory > Title)
  - Image gallery:
    - Large preview image
    - Thumbnail strip below (click to change preview)
    - Zoom on click (optional: lightbox)
  - Product info section:
    - Title
    - Offer price (prominent)
    - Marked price (strikethrough) + Discount % badge
    - Condition badge
    - Category breadcrumb (parent > child)
    - Tags (clickable tag pills, click to search by tag)
    - Description (full text)
  - Seller info section:
    - Brand name or nickname
    - "Verified Email" badge
  - "Buy Now" button (prominent CTA)
  - Related listings section (4 items in carousel)
- [ ] Implement image gallery interaction
- [ ] Make tags clickable (navigate to search results filtered by tag)
- [ ] Connect Buy Now button to payment flow (placeholder for Sprint 4)

**Estimated Story Points:** 22

### Design Tasks

- [ ] Finalize Homepage layout (hero, search, featured listings)
- [ ] Design empty states (no search results, no listings)
- [ ] Design listing card hover states

### QA Tasks

- [ ] Test search with various keywords (products, brands, models, tags)
- [ ] Test filters (price range, category, subcategory, condition, tags)
- [ ] Test hierarchical category filtering (parent vs child categories)
- [ ] Test tag filtering (single tag, multiple tags)
- [ ] Test sorting (price low-high, high-low, newest)
- [ ] Test pagination (navigate pages, edge cases)
- [ ] Test product detail page with 1 image, 5 images
- [ ] Test tag pills clickability (navigate to filtered search)
- [ ] Test related listings accuracy (same category or shared tags)
- [ ] Test breadcrumb navigation (home > category > subcategory > product)
- [ ] Performance test: Search results page load with 100+ listings
- [ ] Mobile responsive testing (filters collapse, grid adapts, tag pills wrap)
- [ ] Test that sold listings are hidden from search

**Sprint 3 Deliverables:**

- ✅ Homepage with search and featured listings live
- ✅ Search results page with filters (categories, tags, price, condition) and sort working
- ✅ Hierarchical category filtering (parent/child categories)
- ✅ Tag-based search and filtering
- ✅ Product detail page with image gallery and clickable tags
- ✅ Related listings showing (by category or shared tags)
- ✅ Sold items hidden from search
- ✅ All tests passing

---

## Sprint 4: Payment Integration & Escrow (Weeks 7-8)

**Goal:** Buyers can purchase items, payments held in escrow, admin can release payments

### Backend Tasks

**Payment Integration (Priority: Critical)**

- [ ] Integrate Razorpay SDK
- [ ] Create Transaction model
  - Fields: buyer (FK), seller (FK), listing (FK), amount, payment_id (Razorpay), status (pending/escrow/released/refunded/disputed), created_at, updated_at, released_at, admin_notes
- [ ] POST `/api/transactions/initiate` - Create Razorpay order
  - Input: listing_id
  - Validate: Buyer is logged in, listing is active (not sold)
  - Create Razorpay order with amount = listing.offer_price
  - Return: order_id, amount, currency (INR)
- [ ] POST `/api/transactions/verify` - Verify Razorpay payment
  - Input: payment_id, order_id, signature
  - Verify signature using Razorpay secret
  - Update transaction status to "escrow"
  - Mark listing as sold
  - Send emails to buyer and seller with contact info
  - Return: transaction details
- [ ] GET `/api/transactions` - Get user's transactions
  - Buyer: All purchases
  - Seller: All sales
- [ ] GET `/api/transactions/:id` - Get transaction details
  - Include buyer/seller contact info, listing details, status

**Escrow Management (Admin) (Priority: Critical)**

- [ ] GET `/api/admin/transactions` - List all transactions
  - Filter by status (escrow/disputed/released)
  - Sort by created_at
- [ ] PATCH `/api/admin/transactions/:id/release` - Release payment to seller
  - Validate: Transaction in escrow status
  - Update status to "released"
  - Trigger payout to seller's bank account (Razorpay Payout API or manual)
  - Send confirmation email to seller
  - Log admin action with timestamp
- [ ] PATCH `/api/admin/transactions/:id/refund` - Refund to buyer
  - Validate: Transaction in escrow status
  - Update status to "refunded"
  - Trigger refund via Razorpay
  - Send confirmation email to buyer
  - Log admin action

**Dispute Handling (Priority: High)**

- [ ] Create Dispute model
  - Fields: transaction (FK), raised_by (buyer/seller), reason, description, status (new/in_review/resolved), resolution_notes, created_at, resolved_at
- [ ] POST `/api/transactions/:id/dispute` - Raise dispute
  - Input: reason, description
  - Update transaction status to "disputed"
  - Send notification to admin
- [ ] GET `/api/admin/disputes` - List all disputes
- [ ] PATCH `/api/admin/disputes/:id/resolve` - Resolve dispute
  - Input: resolution_notes, action (release/refund)
  - Update dispute status to "resolved"
  - Trigger release or refund
  - Send emails to buyer and seller

**Estimated Story Points:** 26

### Frontend Tasks

**Payment Flow (Priority: Critical)**

- [ ] Build Payment page
  - Display listing summary (image, title, price)
  - "Proceed to Pay" button
  - Integrate Razorpay checkout modal
  - Handle payment success/failure callbacks
- [ ] Build Payment Success page
  - Transaction confirmation
  - Display seller contact info
  - Next steps instructions (arrange meetup)
  - Link to transaction details
- [ ] Build Payment Failure page
  - Error message
  - Retry button
  - Contact support link

**Transaction Management (Buyer/Seller) (Priority: High)**

- [ ] Build Transactions page (My Purchases / My Sales)
  - Tabs for Buyer and Seller views
  - List transactions with status badges
  - Filter by status
  - Click to view transaction details
- [ ] Build Transaction Detail page
  - Listing info
  - Buyer/seller contact info (visible post-purchase)
  - Payment status timeline
  - "Report Dispute" button
- [ ] Build Dispute Form modal
  - Reason dropdown
  - Description textarea
  - Submit button

**Admin Dashboard (Priority: Critical)**

- [ ] Build Admin Dashboard (separate route: `/admin`)
  - Navigation: Transactions, Disputes, Categories
  - Overview stats: Pending releases, open disputes
- [ ] Build Admin Transactions page
  - Table view with filters (status)
  - Actions: Release Payment, Refund
  - Search by transaction ID or user
- [ ] Build Admin Disputes page
  - Table view with filters (status)
  - Click to view dispute details
  - Resolution form (notes, action)
  - Submit resolution

**Estimated Story Points:** 24

### QA Tasks

- [ ] Test payment flow end-to-end (test mode Razorpay)
- [ ] Test payment success scenario
- [ ] Test payment failure scenario (invalid card, insufficient funds)
- [ ] Test escrow holding (payment not released immediately)
- [ ] Test admin release payment flow
- [ ] Test admin refund flow
- [ ] Test dispute creation (buyer and seller)
- [ ] Test admin dispute resolution
- [ ] Test emails sent at each stage (payment success, release, refund)
- [ ] Test permissions (only admin can release/refund)
- [ ] Security testing: Payment signature verification, SQL injection on transaction endpoints
- [ ] Performance test: Multiple concurrent payment verifications

**Sprint 4 Deliverables:**

- ✅ Buyers can purchase listings via Razorpay
- ✅ Payments held in escrow
- ✅ Admin can release payments to sellers
- ✅ Admin can process refunds
- ✅ Dispute creation and resolution working
- ✅ All transaction emails sending
- ✅ All tests passing

---

## Sprint 5: Polish, Testing & Launch Prep (Weeks 9-10)

**Goal:** Production-ready platform with sample data, legal docs, and monitoring

### Backend Tasks

**Final Polish (Priority: High)**

- [ ] Implement rate limiting on API endpoints (prevent scraping/abuse)
  - Auth endpoints: 5 requests/min
  - Search: 30 requests/min
  - Listing creation: 10 requests/hour
- [ ] Add API documentation (Swagger/OpenAPI or Postman collection)
- [ ] Optimize database queries (add missing indexes)
- [ ] Set up database backup automation (daily backups to S3)
- [ ] Configure CORS for production domain
- [ ] Set up logging (structured logs to CloudWatch or equivalent)
- [ ] Configure Redis for session/cache (optional for V1)

**Sample Data Creation (Priority: High)**

- [ ] Create data seeding script
  - 10 sample users (5 buyers, 5 sellers with verified emails)
  - 50-100 gadget listings across all categories
  - Realistic titles, descriptions, prices
  - 3-5 images per listing (use stock photos or placeholders)
  - Mix of conditions (Like New, Good, Fair)
  - Price range: ₹500 - ₹80,000
- [ ] Run seeding script on staging environment
- [ ] Verify search and browse work with sample data

**Security Audit (Priority: Critical)**

- [ ] Review all endpoints for authentication/authorization
- [ ] Test for SQL injection vulnerabilities
- [ ] Test for XSS vulnerabilities
- [ ] Verify HTTPS enforcement
- [ ] Verify bank detail encryption
- [ ] Check for sensitive data in logs
- [ ] Review CORS configuration
- [ ] Penetration testing (manual or tool-based)

**Estimated Story Points:** 15

### Frontend Tasks

**UI/UX Polish (Priority: High)**

- [ ] Implement consistent error handling across all pages
- [ ] Add loading states for all async operations
- [ ] Improve form validation messages (clear, helpful)
- [ ] Add success animations (micro-interactions)
- [ ] Optimize images (lazy loading, WebP format)
- [ ] Implement 404 page and error boundaries
- [ ] Add breadcrumbs on all deep pages
- [ ] Ensure accessibility (keyboard navigation, ARIA labels, color contrast)

**Static Pages (Priority: High)**

- [ ] Build Terms of Service page (legal copy from Sprint 0)
- [ ] Build Privacy Policy page (legal copy from Sprint 0)
- [ ] Build Safety Guidelines page (content from Sprint 0)
- [ ] Build About Us page (mission, team, contact)
- [ ] Build FAQ page (common questions)
- [ ] Update footer with all legal links

**Performance Optimization (Priority: Medium)**

- [ ] Code splitting (lazy load routes)
- [ ] Minify and bundle for production
- [ ] Add service worker for PWA (optional for V1)
- [ ] Optimize bundle size (remove unused dependencies)
- [ ] Add meta tags for SEO (title, description, OG tags)

**Estimated Story Points:** 13

### Design Tasks

- [ ] Design 404 error page
- [ ] Design loading skeletons for all major pages
- [ ] Create favicon and app icons
- [ ] Finalize color scheme and ensure accessibility (WCAG AA)

### DevOps Tasks

**Production Deployment (Priority: Critical)**

- [ ] Provision production environment (separate from staging)
- [ ] Configure production database with automated backups
- [ ] Set up environment variables for production
- [ ] Configure production S3 bucket and CloudFront
- [ ] Switch Razorpay to live mode (obtain live API keys)
- [ ] Set up SSL certificate (Let's Encrypt auto-renewal)
- [ ] Configure domain DNS to point to production server
- [ ] Set up monitoring and alerting:
  - Uptime monitoring (UptimeRobot)
  - Error tracking (Sentry)
  - Performance monitoring (Google Analytics)
  - Database monitoring (query performance, storage)
- [ ] Create runbook for common operations:
  - Deploy new version
  - Rollback deployment
  - Database migration
  - Restore from backup

**Estimated Story Points:** 10

### QA Tasks

**End-to-End Testing (Priority: Critical)**

- [ ] Full regression test of all user flows (signup → listing → purchase → escrow release)
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge on desktop)
- [ ] Mobile testing (iOS Safari, Android Chrome)
- [ ] Tablet testing (iPad, Android tablet)
- [ ] Performance testing (page load times, API response times)
- [ ] Load testing (simulate 100 concurrent users)
- [ ] Security testing (OWASP Top 10 checklist)
- [ ] Accessibility testing (screen reader, keyboard navigation)

**Beta Launch Preparation (Priority: High)**

- [ ] Create beta tester onboarding guide
  - How to sign up
  - How to create listings
  - How to purchase items
  - How to provide feedback
- [ ] Set up feedback collection (Google Form or Typeform)
- [ ] Prepare beta invitation email template
- [ ] Create sample transactions for demo (admin account)

**Estimated Story Points:** 12

### Business Tasks

**Launch Checklist (Priority: Critical)**

- [ ] Legal review complete (Terms, Privacy, Safety)
- [ ] Payment gateway live mode activated and tested
- [ ] All emails tested (send test emails for each type)
- [ ] Sample data seeded in production
- [ ] Analytics configured (Google Analytics tracking code)
- [ ] Error monitoring configured (Sentry alerts)
- [ ] Admin credentials created and secured
- [ ] Backup and disaster recovery plan documented
- [ ] Customer support plan (email, response SLA)
- [ ] Rollback plan documented

**Beta Recruitment (Priority: High)**

- [ ] Create list of 50+ potential beta users
- [ ] Draft beta invitation email
- [ ] Prepare beta feedback survey questions
- [ ] Set up communication channel (WhatsApp group, Slack, Discord)
- [ ] Plan beta kickoff meeting/walkthrough

**Sprint 5 Deliverables:**

- ✅ Production environment live and stable
- ✅ Sample data populated
- ✅ All legal pages published
- ✅ Security audit complete, vulnerabilities fixed
- ✅ Monitoring and alerting configured
- ✅ Beta user list ready
- ✅ All tests passing
- ✅ **READY FOR BETA LAUNCH**

---

## Post-Sprint: Beta Launch & Iteration (Week 10+)

**Beta Launch Day (Week 10, Day 1)**

- [ ] Send beta invitations to first 20-30 users
- [ ] Host virtual walkthrough/demo session
- [ ] Monitor system closely (errors, performance, payment issues)
- [ ] Respond to user questions in real-time

**Beta Week 1**

- [ ] Daily standup to review user feedback
- [ ] Fix critical bugs within 24 hours
- [ ] Monitor KPIs: signups, listings created, searches performed
- [ ] Reach out to users for qualitative feedback

**Beta Week 2-4**

- [ ] Collect feedback via survey
- [ ] Prioritize feature requests and bug fixes
- [ ] Iterate on UX pain points
- [ ] Expand to next cohort of beta users (50-100 total)
- [ ] Track progress toward KPI targets:
  - 1,000 active listings
  - 100 completed transactions
  - 1% buyer repeat rate

**Beta Review (End of Week 12)**

- [ ] Analyze metrics against KPI targets
- [ ] Conduct retrospective with team
- [ ] Decide: Full launch, pivot, or iterate
- [ ] Plan next phase (city launch or feature expansion)

---

## Sprint Retrospective Template

**After each sprint, conduct a retrospective to improve:**

### What Went Well?

- (Team discusses successes, wins, smooth processes)

### What Didn't Go Well?

- (Team discusses blockers, challenges, missed estimates)

### Action Items for Next Sprint

- (Concrete changes to improve process, velocity, quality)

---

## Story Point Estimation Reference

**1-3 Points:** Small task (< 1 day)  
**5 Points:** Medium task (1-2 days)  
**8 Points:** Large task (3-4 days)  
**13 Points:** Very large task (1 week)  
**21+ Points:** Epic (break down into smaller tasks)

---

## Risk Mitigation During Development

**Technical Risks:**

- **Payment integration complexity:** Allocate buffer time in Sprint 4, start Razorpay integration early
- **Search performance:** Monitor query times, add indexes proactively
- **S3 upload failures:** Implement retry logic and error handling from day 1

**Team Risks:**

- **Developer availability:** Cross-train team members on critical paths
- **Scope creep:** Stick to PRD, log feature requests for post-V1
- **Burnout:** Enforce sustainable pace, avoid weekend work

**External Risks:**

- **Third-party API downtime:** Test with Razorpay sandbox early, have fallback plan
- **Design delays:** Prioritize critical screens, use placeholders if needed
- **Legal review delays:** Start legal docs in Sprint 0, don't block on final review

---

## Success Metrics Per Sprint

**Sprint 1:** Auth flows working, 100% test coverage on auth  
**Sprint 2:** 10 sample listings created in staging  
**Sprint 3:** Search returns results in <500ms  
**Sprint 4:** Test payment successful in Razorpay sandbox  
**Sprint 5:** Production deployment successful, zero downtime

---

## Communication Plan

**Daily Standups (15 min):**

- What did I complete yesterday?
- What will I work on today?
- Any blockers?

**Sprint Planning (2 hours, start of each sprint):**

- Review sprint goal
- Assign tasks to team members
- Estimate story points
- Commit to sprint backlog

**Sprint Review (1 hour, end of each sprint):**

- Demo completed features
- Stakeholder feedback
- Update roadmap

**Sprint Retrospective (1 hour, end of each sprint):**

- Discuss what went well, what didn't
- Action items for improvement

**Ad-hoc Communication:**

- Slack/Discord for quick questions
- GitHub for code reviews and PRs
- Weekly all-hands for cross-team updates

---

## Tools & Resources

**Project Management:** Jira, Trello, or GitHub Projects  
**Code Repository:** GitHub or GitLab  
**CI/CD:** GitHub Actions, GitLab CI, or CircleCI  
**Design:** Figma for mockups, collaboration  
**Communication:** Slack, Discord, or Microsoft Teams  
**Documentation:** Notion, Confluence, or Google Docs  
**Testing:** Pytest (backend), Jest/React Testing Library (frontend)  
**Monitoring:** Sentry (errors), Google Analytics (usage), UptimeRobot (uptime)

---

**END OF SPRINT PLAN**

_This is a living document. Update task estimates and timelines based on actual velocity after each sprint._

_Next Review: After Sprint 1 retrospective_
