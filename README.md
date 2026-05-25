# PutForShare BE + FE

Architecture:

- `backend` : single Django + DRF API backend.
- `store` : React frontend to run store.
- Seller dashboard is not included in this workspace.

## Backend (Django)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

## Superuser credentials

```
Email: write2aruld@gmail.com
Username: aruld
Full name: Aroul Das
Password: asdf1234
```

API base: `http://localhost:8000/api/v1/`

Example endpoints (UUID-based lookup):

- `POST /api/v1/auth/signup/`
- `POST /api/v1/auth/login/`
- `POST /api/v1/auth/forgot-password/`
- `POST /api/v1/auth/change-password/`
- `GET /api/v1/users/`
- `GET|POST /api/v1/addresses/`
- `GET /api/v1/inventory/categories/`
- `GET /api/v1/inventory/products/`
- `POST /api/v1/checkout/`
- `GET /api/v1/orders/`
- `PATCH /api/v1/orders/<order_uuid>/payment-status/`

## Store (React + Vite)

```bash
cd store
cp .env.example .env
npm install
npm run dev
```

Frontend dev URL is typically `http://localhost:5173` and calls backend via `VITE_API_BASE_URL`.
