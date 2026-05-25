# Sprint Plan Updates - Summary of Changes

## Overview

The sprint plan has been updated with two major enhancements:

1. **Role-Based Authentication** (Sprint 1)
2. **Advanced Category & Tag Management** (Sprint 2)

---

## Sprint 1 Changes: Role-Based Authentication

### Key Updates

**User Roles System:**
- Users now have 4 distinct roles: `GUEST`, `BUYER`, `SELLER`, `ADMIN`
- Default role on signup: `GUEST`
- Users can upgrade from `GUEST` → `BUYER` or `GUEST` → `SELLER`

### Backend Changes

**New API Endpoint:**
- `PATCH /api/auth/upgrade-role` - Allows users to upgrade their role
  - GUEST → BUYER: No additional requirements
  - GUEST → SELLER: Requires email verification + profile completion

**Permission Decorators:**
- `@require_role('BUYER')` - Buyer-only endpoints
- `@require_role('SELLER')` - Seller-only endpoints  
- `@require_role('ADMIN')` - Admin-only endpoints

**Updated Login Response:**
- JWT tokens now include user role
- Frontend can use role for conditional UI rendering

### Frontend Changes

**Role Selection Flow:**
- New "Role Selection/Upgrade" page for GUEST users
- Prompts users to choose "I want to buy" or "I want to sell"
- Can be triggered after first login or via header prompt

**Role-Based Navigation:**
Header menu now displays different options based on user role:

| Role | Menu Items |
|------|-----------|
| **GUEST** | Login, Signup |
| **BUYER** | My Purchases, Profile, Logout |
| **SELLER** | My Purchases, My Inventorys, Sell Item, Profile, Logout |
| **ADMIN** | Dashboard, Categories, Transactions, Disputes, Logout |

**Route Guards:**
- GUEST users redirected to role selection if accessing protected pages
- Non-SELLER users cannot access inventory creation
- Non-ADMIN users cannot access admin dashboard

### Testing Updates

**Additional Test Cases:**
- Role upgrade flow (GUEST → BUYER, GUEST → SELLER)
- Role-based access control for all protected routes
- Role-based menu display verification
- Role escalation attack prevention

### Story Point Impact
- Backend: +3 points (21 → 24)
- Frontend: +3 points (18 → 21)
- **Total Sprint 1: 45 points** (was 39)

---

## Sprint 2 Changes: Advanced Category & Tag Management

### Key Updates

**1. Hierarchical Categories (django-treebeard)**
- Support for nested categories and subcategories (unlimited depth)
- Efficient tree queries using materialized path approach
- Example structure:
  ```
  Phones
    ├── iPhone
    ├── Android
    └── Feature Phones
  Laptops
    ├── Windows
    ├── MacBooks
    ├── Chromebooks
    └── Gaming Laptops
  ```

**2. Flexible Tagging (django-taggit)**
- Tags can be added to any inventory
- Tags auto-created on first use (no pre-defined list)
- Tag autocomplete from popular tags
- Max 10 tags per inventory

### Backend Changes

**Package Integrations:**
- `django-treebeard` for hierarchical category management
- `django-taggit` for flexible tagging system

**Updated Category API:**
- `GET /api/categories` - Returns nested JSON with parent-child relationships
- `POST /api/categories` - Create category (requires ADMIN role)
  - Support for `parent_id` to create subcategories
- `PUT /api/categories/:id` - Update category (requires ADMIN role)
- `DELETE /api/categories/:id` - Delete category (requires ADMIN role)
  - Checks for active inventorys in category AND all subcategories
- `PATCH /api/categories/:id/move` - Move category to different parent

**Note:** Removed `/admin` prefix from API endpoints (simplified to `/api/categories`)

**New Tag API:**
- `GET /api/tags` - List all tags with usage count (sorted by popularity)
- `GET /api/tags/:slug/inventorys` - Get inventorys with specific tag

**Updated Inventory Model:**
```python
class Inventory(models.Model):
    # ... existing fields ...
    category = ForeignKey(Category)  # Now supports nested categories
    tags = TaggableManager()  # New field for tagging
```

**Updated Inventory Endpoints:**
- `POST /api/inventorys` - Now accepts `tags: ["wireless", "bluetooth", "warranty"]`
- `PUT /api/inventorys/:id` - Can update tags array
- `GET /api/inventorys/:id` - Returns tags array

### Frontend Changes

**Category Selection:**
- Nested category selector component
- Options: Tree view dropdown OR cascading dropdowns
- Shows parent → child relationships clearly

**Tag Input Component:**
- Autocomplete suggestions from popular tags
- Visual tag pills (removable)
- Allow creating new tags on-the-fly
- Max 10 tags per inventory

**Search Enhancements:**
- Filter by tags (tag cloud or checkboxes)
- Hierarchical category filtering (parent vs child)
- Tags included in full-text search

**Inventory Card Updates:**
- Show top 3 tags as pills on inventory cards
- Tags clickable (navigate to tag-filtered search)

**Product Detail Page:**
- Display all tags as clickable pills
- Category breadcrumb shows hierarchy (Home > Laptops > Gaming Laptops)

### Testing Updates

**Additional Test Cases:**
- Nested category selection (parent → child)
- Tag input (autocomplete, create new, max 10 tags)
- Tag filtering in search
- Category deletion prevention (when subcategories or inventorys exist)
- Category tree operations (move category, get children, get ancestors)
- Hierarchical category filtering

### Story Point Impact
- Backend: +4 points (24 → 28)
- Frontend: +4 points (20 → 24)
- **Total Sprint 2: 52 points** (was 44)

---

## Sprint 3 Updates (Related Changes)

### Search Enhancements

**Backend:**
- Full-text search now includes tags
- Filter parameter added: `tags` (comma-separated)
- Related inventorys algorithm considers shared tags

**Frontend:**
- Popular tags section in filter sidebar
- Tag pills on inventory cards (top 3)
- Clickable tags on product detail page

---

## Updated Sprint Timeline

| Sprint | Focus | Story Points | Change |
|--------|-------|--------------|--------|
| Sprint 1 | Auth & User Management | 45 | +6 |
| Sprint 2 | Inventorys, Categories & Tags | 52 | +8 |
| Sprint 3 | Search & Browse | 35 | No change |
| Sprint 4 | Payment & Escrow | 50 | No change |
| Sprint 5 | Polish & Launch | 50 | No change |
| **Total** | | **232** | **+14** |

---

## Technical Dependencies

### New Python Packages

**Sprint 0 / Sprint 1:**
```bash
pip install django-anymail[amazon-ses] --break-system-packages
```

**django-anymail:**
- Unified API for transactional email providers (AWS SES, Mailgun, SendGrid, etc.)
- Native Django email backend integration
- Tracking support (opens, clicks, bounces)
- We'll use AWS SES backend for cost-effectiveness and reliability

**Sprint 2:**
```bash
pip install django-treebeard --break-system-packages
pip install django-taggit --break-system-packages
```

**django-treebeard:**
- Efficient tree structures for Django models
- Supports Materialized Path, Nested Sets, and Adjacency List
- We'll use MP_Node (Materialized Path) for best query performance

**django-taggit:**
- Simple tagging for Django
- Automatic tag creation
- Tag manager for easy querying
- Built-in slug generation

### Database Migrations

**Sprint 2 will require:**
1. Category model migration to MP_Node structure
2. Add tags field to Inventory model
3. Seed hierarchical categories
4. Create indexes for tag lookups

---

## Benefits of These Changes

### Role-Based Authentication
✅ **Better Security:** Clear permission boundaries  
✅ **Improved UX:** Users see only relevant features  
✅ **Scalability:** Easy to add new roles (e.g., MODERATOR)  
✅ **Analytics:** Track user types separately  

### Hierarchical Categories & Tags
✅ **Better Organization:** Logical product grouping  
✅ **Improved Search:** More precise filtering  
✅ **SEO Friendly:** Category hierarchies improve discoverability  
✅ **User Flexibility:** Tags provide free-form classification  
✅ **Future-Proof:** Easy to add new categories without code changes  

---

## Migration Notes

### From Previous Plan

**If you already started development:**

1. **Database Changes Required:**
   - Add `role` field to User model (migration)
   - Convert Category model to use django-treebeard
   - Add tags to Inventory model

2. **Code Updates:**
   - Add role-based permission decorators
   - Update all SELLER-only endpoints to check role
   - Update frontend auth context to include role
   - Add role-based navigation component

3. **Testing:**
   - Add role-based test cases
   - Test category tree operations
   - Test tag creation and filtering

---

## Questions or Issues?

If you have any questions about these changes or need clarification on implementation details:

1. Check the full sprint plan for detailed task breakdowns
2. Review the PRD for business context
3. Consult Django-treebeard docs: https://django-treebeard.readthedocs.io/
4. Consult Django-taggit docs: https://django-taggit.readthedocs.io/

---

**Updated:** February 2026  
**Version:** 2.0 - Role-Based Auth + Hierarchical Categories + Tags
