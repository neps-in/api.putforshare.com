# Task Status Done

## Completed Architecture Setup
- One shared backend API implemented in `backend/`.
- One store frontend scaffolded in `store/` consuming the same backend API.
- No sellerdashboard work included (as requested).

## Completed Backend Scaffolding
- Django project scaffold created with DRF in `backend/config/`.
- UUID-first base model added in `backend/apps/common/models.py`.
- User app (`users`) implemented with custom auth model in `backend/apps/users/models.py`.
- Inventory app (`inventory`) implemented in `backend/apps/inventory/models.py`.

## Completed Auth APIs
Implemented under `/api/v1/auth/`:
- `POST /auth/signup/`
- `POST /auth/login/`
- `POST /auth/forgot-password/`
- `POST /auth/change-password/`

Files:
- `backend/apps/api/serializers.py`
- `backend/apps/api/views.py`
- `backend/apps/api/urls.py`

## Completed Address + Order/Checkout APIs
- Address model added: `backend/apps/users/models.py`.
- Orders app added with:
  - `Order` model
  - `OrderItem` model
- Checkout flow added:
  - `POST /api/v1/checkout/` creates order + order items from product UUIDs.
- Order APIs added:
  - `GET /api/v1/orders/`
  - `GET /api/v1/orders/<uuid>/`
  - `PATCH /api/v1/orders/<uuid>/payment-status/`

Files:
- `backend/apps/orders/models.py`
- `backend/apps/orders/admin.py`
- `backend/apps/api/serializers.py`
- `backend/apps/api/views.py`
- `backend/apps/api/urls.py`

## Completed UUID Routing Standard
- API resources use UUID lookup via `lookup_field = "uuid"`.
- Public API routes are UUID-based for users, inventory, addresses, and orders.

## Completed Store Scaffold
- Vite + React app scaffolded in `store/`.
- Shared API base URL pattern via `store/.env.example` (`VITE_API_BASE_URL`).
- Product listing wired to backend endpoint `/api/v1/inventory/products/`.

## Completed Documentation
- Setup and endpoint usage documented in `README.md`.

## Validation Done
- Python syntax check passed:
  - `python3 -m py_compile $(find backend -name '*.py' -type f)`

## Pending To Run Locally
- Install backend dependencies.
- Run migrations.
- Create superuser.
- Start backend and store dev servers.

Commands:
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver

cd ../store
cp .env.example .env
npm install
npm run dev
```
