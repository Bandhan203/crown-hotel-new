# Hotel Management System

A full-stack **Property Management System (PMS)** and public hotel website. Staff manage reservations, front desk, housekeeping, and billing from a modern admin panel; guests browse rooms, book online, and pay through an integrated gateway.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Development](#development)
- [Production Build](#production-build)
- [API Overview](#api-overview)
- [Admin Panel](#admin-panel)
- [Screenshots](#screenshots)

---

## Features

### Public Website

- Responsive marketing site: home, about, rooms, restaurant, spa, services, facilities, gallery, news, FAQ, and contact
- Room browsing with details and online booking flow
- Guest registration and login (JWT)
- My Bookings portal for guests
- Online payments via **SSLCommerz** (sandbox and live modes)
- Booking confirmation and payment status pages

### Admin / PMS

| Module | Capabilities |
|--------|--------------|
| **Dashboard** | KPIs, charts, and operational overview |
| **Front Desk** | Walk-ins, check-in, check-out, guest registration |
| **Reservations** | Full reservation modal with rate plans, capacity validation, advance/due billing |
| **Calendar** | Visual reservation calendar |
| **Rate Plans** | Seasonal and promotional pricing with automatic discount application |
| **Rooms** | Room types, inventory, rack rates, amenities, housekeeping status |
| **Bookings** | Searchable AG Grid with filters, status management, folio view |
| **Guests** | Guest profiles and stay history |
| **Housekeeping** | Room status board |
| **Night Audit** | End-of-day audit workflow |
| **Reports** | Operational and financial reports |
| **Restaurant / Spa / Services** | Ancillary service management |
| **CMS** | News, FAQ, testimonials, team, gallery, hero slides, site settings |
| **Staff & Messages** | Staff accounts and contact message inbox |

### Backend Highlights

- REST API built with Django REST Framework
- JWT authentication with refresh token rotation and blacklist
- Role-based access (`ADMIN`, staff, guest)
- MySQL in production; SQLite fallback when `DB_NAME` is unset
- Celery + Redis for background tasks
- PDF invoice generation (ReportLab)
- Rate limiting and CORS configuration

---

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Backend** | Python 3.12+, Django 5.1, DRF, SimpleJWT, Celery, Redis |
| **Database** | MySQL (primary) / SQLite (local dev) |
| **Frontend** | React 19, TypeScript, Vite 7, Tailwind CSS 4 |
| **UI / Data** | AG Grid 35, Chart.js, React Router 7, Axios |
| **Payments** | SSLCommerz |
| **Deployment** | Gunicorn, WhiteNoise, cPanel-ready production settings |

---

## Project Structure

```
Hotel_Management/
├── backend/                 # Django API
│   ├── accounts/            # Users, guests, JWT auth
│   ├── bookings/            # Reservations, rate plans, payments, folio
│   ├── rooms/               # Room types, rooms, amenities
│   ├── restaurant/          # Restaurant menu & orders
│   ├── spa/                 # Spa services
│   ├── services/            # Hotel services & facilities
│   ├── cms/                 # Content management
│   ├── contact/             # Contact form messages
│   ├── staff/               # Staff management
│   ├── dashboard/           # Admin dashboard metrics
│   ├── config/              # Settings, URLs, Celery
│   ├── populate_live.py     # Sample data seeder
│   └── manage.py
├── frontend/                # React SPA
│   ├── src/
│   │   ├── pages/           # Public pages
│   │   ├── admin/           # Admin panel (PMS)
│   │   ├── components/      # Shared UI components
│   │   └── services/        # API client (Axios)
│   └── vite.config.ts       # Dev proxy → Django :8000
└── README.md
```

---

## Prerequisites

- **Python** 3.12 or newer
- **Node.js** 20+ and npm
- **MySQL** 8+ (optional — SQLite works for quick local setup)
- **Redis** (optional — required only for Celery background tasks)

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/Hotel_Management.git
cd Hotel_Management
```

### 2. Backend setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory (see [Environment Variables](#environment-variables)).

```bash
# Run migrations
python manage.py migrate

# Create an admin user
python manage.py createsuperuser

# (Optional) Seed sample data
python populate_live.py

# Start the API server
python manage.py runserver
```

The API will be available at **http://127.0.0.1:8000**.

### 3. Frontend setup

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

The app will be available at **http://localhost:5173**.

> During development, Vite proxies `/api` and `/media` requests to Django on port 8000 — no extra CORS setup is needed.

---

## Environment Variables

Create `backend/.env` with at least:

```env
# Required
SECRET_KEY=your-django-secret-key-here

# Development
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173
FRONTEND_URL=http://localhost:5173

# Database (leave DB_NAME empty to use SQLite)
DB_NAME=hotel_db
DB_USER=root
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=3306

# Celery / Redis (optional for local dev)
REDIS_URL=redis://127.0.0.1:6379/0

# SSLCommerz (sandbox defaults work for testing)
SSLCZ_STORE_ID=testbox
SSLCZ_STORE_PASSWORD=qwerty
SSLCZ_IS_SANDBOX=True
```

Optional frontend override — create `frontend/.env` only if not using the Vite proxy:

```env
VITE_API_URL=http://127.0.0.1:8000/api
```

---

## Development

| Task | Command | Location |
|------|---------|----------|
| Run API | `python manage.py runserver` | `backend/` |
| Run frontend | `npm run dev` | `frontend/` |
| Run migrations | `python manage.py migrate` | `backend/` |
| Django shell | `python manage.py shell` | `backend/` |
| Lint frontend | `npm run lint` | `frontend/` |
| Build frontend | `npm run build` | `frontend/` |

**Default settings module:** `config.settings.development` (set in `manage.py`).

**Admin login:** Navigate to `/admin/login` and sign in with a user that has the `ADMIN` role (create via `createsuperuser` or the staff management module).

**Django admin:** Available at `/django-admin/` for low-level model management.

---

## Production Build

1. Set `DJANGO_SETTINGS_MODULE=config.settings.production` and configure production `.env` values (`DEBUG=False`, secure `SECRET_KEY`, MySQL credentials, `CSRF_TRUSTED_ORIGINS`, etc.).

2. Build the React app:

   ```bash
   cd frontend
   npm run build
   ```

   Output is written to `frontend/dist/`. Production settings serve this as the SPA.

3. Collect static files and run with Gunicorn:

   ```bash
   cd backend
   python manage.py collectstatic --noinput
   gunicorn config.wsgi:application --bind 0.0.0.0:8000
   ```

4. Run Celery worker (if using background tasks):

   ```bash
   celery -A config worker -l info
   ```

---

## API Overview

All endpoints are prefixed with `/api/`.

| App | Base path | Examples |
|-----|-----------|----------|
| Accounts | `/api/auth/` | Login, register, token refresh, profile |
| Rooms | `/api/rooms/` | Room types, availability, amenities |
| Bookings | `/api/bookings/` | Reservations, check-in/out, rate plans, payments |
| Restaurant | `/api/restaurant/` | Menu items |
| Spa | `/api/spa/` | Spa services |
| Services | `/api/services/` | Hotel services & facilities |
| CMS | `/api/cms/` | News, gallery, testimonials, site settings |
| Contact | `/api/contact/` | Contact form submissions |
| Staff | `/api/staff/` | Staff CRUD |
| Dashboard | `/api/dashboard/` | Metrics and reports data |

Authentication: include `Authorization: Bearer <access_token>` on protected requests. The frontend Axios client handles token refresh automatically.

---

## Admin Panel

| Route | Page |
|-------|------|
| `/admin` | Dashboard |
| `/admin/front-desk` | Front Desk |
| `/admin/reservations/calendar` | Reservation Calendar |
| `/admin/rate-plans` | Rate Plans |
| `/admin/housekeeping` | Housekeeping Board |
| `/admin/night-audit` | Night Audit |
| `/admin/reports` | Reports |
| `/admin/rooms` | Room Management |
| `/admin/bookings` | Booking Management |
| `/admin/guests` | Guest Management |
| `/admin/staff` | Staff Management |
| `/admin/restaurant` | Restaurant |
| `/admin/spa` | Spa |
| `/admin/services` | Services |
| `/admin/messages` | Messages |
| `/admin/cms/*` | CMS modules |
| `/admin/settings` | Settings |

---

## Screenshots

> Add screenshots here after deploying or running locally.

| Public Site | Admin Panel |
|-------------|-------------|
| _Home page_ | _Front Desk_ |
| _Room booking_ | _Reservation modal_ |
| _My Bookings_ | _Booking grid_ |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

Please keep backend and frontend changes scoped and follow existing code conventions.

---

## Author

**Uzzal Bhuiyan**

Built as a complete hotel property management solution — from guest-facing website to staff operations.
"# hotel-crown" 
#   h o t e l - c r o w n  
 