# **Product Requirements Document (PRD)**

## **Cart Management System**

---

## **1. Overview**

The Cart Management System enables both **guest users** and **authenticated users** to add, manage, and review products before checkout. It supports persistent carts, accurate pricing, and seamless transition from guest to logged-in sessions.

The system will maintain cart state, calculate totals, and integrate with inventory and product pricing.

---

## **2. Objectives**

- Support shopping carts for:

  - Guest users (not logged in)
  - Registered and logged-in users

- Maintain cart persistence
- Accurately calculate item and cart-level totals
- Integrate with inventory/product pricing
- Support auditability and lifecycle management (active/archived carts)

---

## **3. Scope**

### In Scope

- Cart creation and management
- Cart items management
- Price calculation
- Inventory integration
- Guest-to-user cart migration
- Metadata tracking

### Out of Scope

- Payment processing
- Order fulfillment
- Shipping calculations
- Promotions/discounts (future scope)

---

## **4. User Types**

### 4.1 Guest Users

- Not authenticated
- Identified via session/cookie/token
- Cart stored temporarily

### 4.2 Authenticated Users

- Logged-in users
- Cart linked to user account
- Persistent across devices

---

## **5. Functional Requirements**

### 5.1 Cart Management

#### FR-01: Cart Creation

- System shall create a cart when:

  - A guest adds the first item
  - A logged-in user adds the first item

#### FR-02: Cart Ownership

- Cart must be associated with:

  - `user` (for authenticated users)
  - `session_id` / `guest_token` (for guests)

#### FR-03: One Active Cart

- Each user/session can have only one active cart at a time.

#### FR-04: Cart Lifecycle

- Cart statuses:

  - Active
  - Archived

- Archived carts are read-only.

---

### 5.2 Cart Item Management

#### FR-05: Cart Items

- Each cart can contain multiple cart items.
- Each cart item must be linked to:

  - One cart
  - One inventory/product item

#### FR-06: Quantity Management

- Quantity must be:

  - A positive integer
  - Minimum value: 1

#### FR-07: Add/Update/Remove Items

- Users must be able to:

  - Add new items
  - Update quantity
  - Remove items

---

### 5.3 Pricing & Calculations

#### FR-08: Inventory Price Retrieval

- System must retrieve unit price from the inventory/product module.

#### FR-09: Item Total Calculation

- Each cart item must calculate:

  ```
  item_total = unit_price × quantity
  ```

#### FR-10: Cart Total Calculation

- Cart must calculate:

  - Total items count
  - Subtotal price
  - Grand total

#### FR-11: Dynamic Recalculation

- Totals must update when:

  - Quantity changes
  - Item is added/removed
  - Price changes

---

### 5.4 Guest to User Migration

#### FR-12: Cart Merge on Login

- When a guest logs in:

  - Guest cart must be merged with user cart
  - Duplicate items must be consolidated
  - Quantities must be aggregated

---

### 5.5 Metadata Management

#### FR-13: Metadata Fields

All carts and cart items must store:

- `is_active` (Boolean)
- `is_archived` (Boolean)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

---

## **6. Data Model Requirements**

### 6.1 Cart Model inherit uuid model

Add the relevant fields from below

| Field Name  | Type              | Description      |
| ----------- | ----------------- | ---------------- |
| id          | UUID/PK           | Primary key      |
| user        | FK (nullable)     | Linked user      |
| guest_token | String (nullable) | Guest identifier |
| is_active   | Boolean           | Active cart flag |
| is_archived | Boolean           | Archive flag     |
| created_at  | DateTime          | Creation time    |
| updated_at  | DateTime          | Last update      |

---

### 6.2 CartItem Model inherit uuid model,

Add the relevant fields from below

| Field Name  | Type            | Description              |
| ----------- | --------------- | ------------------------ |
| id          | UUID/PK         | Primary key              |
| cart        | FK              | Parent cart              |
| inventory   | FK              | Linked inventory/product |
| quantity    | PositiveInteger | Item quantity            |
| is_active   | Boolean         | Active flag              |
| is_archived | Boolean         | Archive flag             |
| created_at  | DateTime        | Creation time            |
| updated_at  | DateTime        | Last update              |

---

## **7. Business Logic Requirements**

### 7.1 Price Functions

#### BL-01: Get Unit Price

```
get_inventory_unit_price(inventory_id) → Decimal
```

Returns current unit price from inventory.

#### BL-02: Get Item Total

```
get_item_total() = unit_price × quantity
```

#### BL-03: Get Cart Total

```
get_cart_total() = Σ(item_total)
```

#### BL-04: Get Total Items

```
get_total_items() = Σ(quantity)
```

---

### 7.2 Validation Rules

- Quantity must be ≥ 1
- Inventory must exist and be active
- Out-of-stock items cannot be added
- Archived carts/items cannot be modified

---

## **8. API Requirements (High-Level)**

### Cart APIs

| Endpoint     | Method | Description       |
| ------------ | ------ | ----------------- |
| /cart        | GET    | Fetch active cart |
| /cart/add    | POST   | Add item          |
| /cart/update | PUT    | Update quantity   |
| /cart/remove | DELETE | Remove item       |
| /cart/merge  | POST   | Merge guest cart  |

---

### Cart Item APIs

| Endpoint         | Method | Description     |
| ---------------- | ------ | --------------- |
| /cart/items      | GET    | List cart items |
| /cart/items/{id} | PUT    | Update item     |
| /cart/items/{id} | DELETE | Remove item     |

---

## **9. Non-Functional Requirements**

### Performance

- Cart retrieval < 200ms
- Price calculation < 100ms

### Scalability

- Support concurrent users
- Handle large carts (100+ items)

### Security

- Prevent cart hijacking
- Secure guest tokens
- Validate ownership

### Reliability

- Cart data must not be lost
- Automatic backup

---

## **10. Reporting & Monitoring**

- Track:

  - Abandoned carts
  - Average cart size
  - Conversion rate

- Log:

  - Cart creation
  - Item changes
  - Merges

---

## **11. Acceptance Criteria**

### AC-01

User (guest or logged-in) can add items to cart.

### AC-02

System correctly calculates totals.

### AC-03

Guest cart persists until login or expiry.

### AC-04

Cart merges correctly after login.

### AC-05

Archived carts cannot be modified.

---

## **12. Risks & Mitigations**

| Risk            | Impact             | Mitigation                 |
| --------------- | ------------------ | -------------------------- |
| Price mismatch  | Revenue loss       | Real-time sync             |
| Cart loss       | UX degradation     | Session backup             |
| Duplicate carts | Data inconsistency | Enforce single active cart |

---

## **13. Future Enhancements (Optional)**

- Coupons & discounts
- Saved carts
- Multi-currency support
- Wishlist integration
- Stock reservation
- Cart reminders

---

If you'd like, I can next help you convert this into:

✅ Django model design
✅ DRF API specification
✅ Database schema
✅ System architecture diagram
✅ Engineering implementation plan

Tell me which you want first.
