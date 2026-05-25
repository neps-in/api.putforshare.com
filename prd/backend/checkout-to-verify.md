# 📄 **Product Requirements Document (PRD)**

## Checkout & Payment System

**Platform:** Django REST + React.js
**Primary Gateway:** Razorpay
**Future Gateways:** Stripe, PayPal, etc.
**Audience:** Engineering, Product, Business
**Version:** v1.0

---

## 1. 🎯 Objective

Build a **secure, extensible, and modular checkout system** that:

- Supports multi-payment gateways
- Enables cart → checkout → payment → order flow
- Handles failures, retries, refunds
- Is compliant with Indian and international regulations
- Supports future integrations without re-architecture

---

## 2. 📌 Scope

### In Scope

✅ Cart → Checkout → Payment
✅ Razorpay Integration (Phase 1)
✅ Order & Invoice Management
✅ Payment Webhooks
✅ Coupon & Discount Support
✅ Refund Processing
✅ Multi-Gateway Architecture

### Out of Scope (Phase 1)

❌ EMI / BNPL
❌ Crypto Payments
❌ Offline Payments

---

## 3. 🏗️ System Architecture

```
React Frontend
     ↓
Django REST API
     ↓
Payment Gateway Adapter Layer
     ↓
Razorpay / Stripe / Others
```

### Key Design Principle

> **Adapter Pattern for Payments**

Each gateway will be wrapped inside a common interface.

---

## 4. ⚙️ Backend (Django) Stack

### 4.1 Core Packages

| Purpose         | Package            |
| --------------- | ------------------ |
| API Docs        | drf-spectacular    |
| Async Tasks     | celery             |
| Redis           | redis              |
| Background Jobs | django-celery-beat |

---

### 4.2 Payment Packages

| Gateway         | Package        |
| --------------- | -------------- |
| Razorpay        | razorpay       |
| Stripe (Future) | stripe         |
| Webhooks        | django-webhook |

---

### 4.3 Security & Utilities

| Purpose    | Package                  |
| ---------- | ------------------------ |
| Encryption | cryptography             |
| Logging    | django-loguru            |
| Monitoring | sentry-sdk               |
| Validation | django-phonenumber-field |
| Caching    | django-redis             |

---

### 📦 Recommended Installation

```bash
pip install django djangorestframework
pip install djangorestframework-simplejwt
pip install razorpay stripe
pip install celery redis django-celery-beat
pip install django-cors-headers python-decouple
pip install psycopg2-binary drf-spectacular
pip install sentry-sdk cryptography
```

---

## 5. 🗄️ Database Design (Django Models)

---

## 5.1 User & Address

### User (Existing / Custom)

```python
AUTH_USER_MODEL
```

### Address

read from address model,
Show a select box before displaying the list of user's address,
and then the user should be able to pick.
preselect the address that is set as a default shipping address.

## 5.2 Cart System

### Cart

| Field      | Type     |
| ---------- | -------- |
| user       | FK       |
| created_at | DateTime |
| updated_at | DateTime |
| is_active  | Boolean  |

---

### CartItem

| Field    | Type    |
| -------- | ------- |
| cart     | FK      |
| product  | FK      |
| quantity | Integer |
| price    | Decimal |

---

## 5.3 Order System

### Order

| Field      | Type     |
| ---------- | -------- |
| order_id   | UUID     |
| user       | FK       |
| address    | FK       |
| subtotal   | Decimal  |
| discount   | Decimal  |
| tax        | Decimal  |
| shipping   | Decimal  |
| total      | Decimal  |
| status     | Choice   |
| created_at | DateTime |

#### Status Choices

```
PENDING
PAYMENT_PENDING
PAID
FAILED
SHIPPED
DELIVERED
CANCELLED
REFUNDED
```

---

### OrderItem

| Field    | Type    |
| -------- | ------- |
| order    | FK      |
| product  | FK      |
| quantity | Integer |
| price    | Decimal |

---

## 5.4 Payment System

### PaymentGateway

| Field     | Type      |
| --------- | --------- |
| name      | CharField |
| is_active | Boolean   |
| config    | JSONField |

Example:

```json
{
  "key": "rzp_test_xxx",
  "secret": "xxx"
}
```

---

### Payment

| Field              | Type      |
| ------------------ | --------- |
| payment_id         | UUID      |
| order              | FK        |
| gateway            | FK        |
| gateway_order_id   | CharField |
| gateway_payment_id | CharField |
| amount             | Decimal   |
| currency           | CharField |
| status             | Choice    |
| response           | JSONField |
| created_at         | DateTime  |

#### Status

```
INITIATED
AUTHORIZED
CAPTURED
FAILED
REFUNDED
```

---

## 5.5 Coupons & Discounts

### Coupon

| Field      | Type      |
| ---------- | --------- |
| code       | CharField |
| type       | Choice    |
| value      | Decimal   |
| min_amount | Decimal   |
| valid_from | Date      |
| valid_to   | Date      |
| max_usage  | Integer   |

---

### CouponUsage

| Field   | Type     |
| ------- | -------- |
| coupon  | FK       |
| user    | FK       |
| order   | FK       |
| used_at | DateTime |

---

## 5.6 Refund System

### Refund

| Field             | Type      |
| ----------------- | --------- |
| payment           | FK        |
| amount            | Decimal   |
| gateway_refund_id | CharField |
| status            | Choice    |
| created_at        | DateTime  |

---

## 6. 🔌 Payment Gateway Abstraction

### Interface

```python
class PaymentProvider:
    def create_order()
    def verify_payment()
    def capture_payment()
    def refund()
```

### Implementations

- RazorpayProvider
- StripeProvider
- PayPalProvider (Future)

---

## 7. 🌐 API Design (Backend)

### Checkout APIs

| Endpoint                | Method | Purpose          |
| ----------------------- | ------ | ---------------- |
| /api/cart/              | GET    | Get cart         |
| /api/checkout/preview/  | POST   | Price breakdown  |
| /api/checkout/initiate/ | POST   | Create order     |
| /api/payment/verify/    | POST   | Verify payment   |
| /api/payment/webhook/   | POST   | Gateway callback |
| /api/orders/            | GET    | User orders      |
| /api/refund/            | POST   | Refund           |

---

## 8. 🖥️ Frontend (React) Stack

### 8.1 Core Packages

| Purpose    | Package                |
| ---------- | ---------------------- |
| Framework  | react                  |
| Routing    | react-router-dom       |
| State      | redux-toolkit          |
| API        | axios                  |
| Forms      | react-hook-form        |
| Validation | yup                    |
| UI         | material-ui / tailwind |
| Toast      | react-toastify         |
| Loader     | react-spinners         |

---

### 8.2 Payment SDK

| Gateway  | Package                 |
| -------- | ----------------------- |
| Razorpay | razorpay-checkout       |
| Stripe   | @stripe/react-stripe-js |

---

### 📦 Installation

```bash
npm install axios react-router-dom
npm install @reduxjs/toolkit react-redux
npm install react-hook-form yup
npm install react-toastify
npm install @mui/material
npm install razorpay-checkout
npm install @stripe/react-stripe-js
```

---

## 9. 🧩 React UI Components

---

## 9.1 Cart Flow

```
<CartPage />
<CartItem />
<CartSummary />
```

---

## 9.2 Checkout Flow

```
<CheckoutPage />
   ├── <AddressSelector />
   ├── <AddAddressForm />
   ├── <CouponBox />
   ├── <OrderSummary />
   └── <ProceedToPay />
```

---

## 9.3 Payment Flow

```
<PaymentPage />
   ├── <PaymentMethodSelector />
   ├── <RazorpayButton />
   ├── <StripeForm />
   └── <PaymentStatus />
```

---

## 9.4 Order Management

```
<OrderList />
<OrderDetail />
<InvoiceView />
<RefundRequest />
```

---

## 10. 🔁 Checkout Workflow

### Step-by-Step

1️⃣ User reviews cart
2️⃣ Selects address
3️⃣ Applies coupon
4️⃣ Backend generates Order
5️⃣ Backend creates Razorpay Order
6️⃣ Frontend opens payment modal
7️⃣ Payment success/failure
8️⃣ Webhook confirms payment
9️⃣ Order status updated
🔟 Confirmation shown

---

## 11. 🔐 Security Requirements

| Area           | Implementation    |
| -------------- | ----------------- |
| API Auth       | JWT               |
| Payment Verify | Signature Check   |
| Secrets        | Env Variables     |
| Webhooks       | IP + Signature    |
| PCI            | Gateway Handled   |
| CSRF           | Disabled for APIs |

---

## 12. 📈 Scalability

### Current (Phase 1)

- Monolith Django
- Redis cache
- Celery workers

### Future (Phase 2+)

- Microservices
- Dedicated Payment Service
- Kafka Event Bus
- Multi-region deployment

---

## 13. 📊 Logging & Monitoring

| Tool       | Purpose        |
| ---------- | -------------- |
| Sentry     | Error Tracking |
| ELK        | Logs           |
| Prometheus | Metrics        |
| Grafana    | Dashboards     |

---

## 14. 🚀 Deployment

### Environment Variables

```env
RAZORPAY_KEY=
RAZORPAY_SECRET=
STRIPE_SECRET=
JWT_SECRET=
REDIS_URL=
DB_URL=
```

---

## 15. 📅 Development Roadmap

### Phase 1 (4–6 Weeks)

✅ Cart + Orders
✅ Razorpay
✅ Basic UI
✅ Webhooks

### Phase 2 (6–8 Weeks)

✅ Stripe
✅ Refunds
✅ Admin Dashboard
✅ Reports

### Phase 3 (3 Months+)

✅ Subscription
✅ EMI
✅ Multi-currency
✅ Wallet

---

## 16. 📌 Acceptance Criteria

### Functional

✔ Payments succeed
✔ Orders auto-confirm
✔ Refunds processed
✔ Coupons validated

### Technical

✔ 99.9% uptime
✔ <300ms API latency
✔ Webhook reliability >99%

---

## 17. 📄 Deliverables

- Django Payment Module
- React Checkout Module
- API Documentation
- Admin Panel
- Test Suite
- Deployment Scripts

---

• Implemented the backend checkout system per prd/backend/checkout.md.

What’s included

- New payments app with models:
  - PaymentGateway, Payment, Coupon, CouponUsage, Refund
- Payment provider abstraction with Razorpay provider (SDK used if installed; stub fallback otherwise).
- Checkout flow endpoints:
  - POST /api/v1/checkout/preview/
  - POST /api/v1/checkout/initiate/
  - POST /api/v1/payment/verify/
  - POST /api/v1/payment/webhook/
  - POST /api/v1/refund/
- Coupon validation, address resolution (default shipping), cart→order conversion, payment initiation.
- Basic webhook handling and payment verification.
- Requirements updated with razorpay==1.4.2.

Files added

- backend/apps/payments/**init**.py
- backend/apps/payments/apps.py
- backend/apps/payments/models.py
- backend/apps/payments/admin.py
- backend/apps/payments/providers.py
- backend/apps/payments/migrations/0001_initial.py

Files updated

- backend/config/settings.py
- backend/apps/api/serializers.py
- backend/apps/api/views.py
- backend/apps/api/urls.py
- backend/requirements.txt

Migrations
Run:

python backend/manage.py migrate

If you want stricter webhook signature validation and actual Razorpay order creation only (no stub fallback), say the word and I’ll tighten it.

---

› - DRAFT - PENDING_PAYMENT - PAID - PAYMENT_FAILED - CANCELLED - FULFILLED - REFUNDED
List all possible use cases against each status

• Here’s a practical mapping of each order status to typical use cases:

1. DRAFT
   - Cart converted to order shell but checkout not completed.
   - Used when user starts checkout but abandons before payment initiation.
2. PENDING_PAYMENT
   - Order created and payment initiated (Razorpay order created), but payment not completed yet.
   - Used right after checkout/initiate before payment verification.
3. PAID
   - Payment verified and captured successfully.
   - Order is ready to be processed/fulfilled.
4. PAYMENT_FAILED
   - Payment attempt failed or verification failed.
   - User can retry payment (re-initiate).
5. CANCELLED
   - Order cancelled by user/admin before fulfillment.
   - Used for manual cancellation or timeout-based cancellation.
6. FULFILLED
   - Order shipped and delivered successfully (business-defined completion).
   - Final lifecycle stage when items are delivered.
7. REFUNDED
   - Payment refunded fully (or final refund state after processing).
   - Used after refund is confirmed.

- Continue Checkout for DRAFT
- Retry Payment for PENDING_PAYMENT + PAYMENT_FAILED
- Re‑order for CANCELLED (adds items back to cart and starts checkout)
