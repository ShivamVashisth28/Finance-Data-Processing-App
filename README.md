# FinanceOS — Finance Data Processing & Access Control System

A full-stack finance dashboard with a production-grade Node.js/Express REST API backed by **PostgreSQL**, and a dark-themed React frontend. Built to demonstrate real-world backend engineering: connection pooling, SQL migrations, role-based access control, structured logging, and Docker-based deployment.

---

## Stack

| Layer       | Technology                                  |
|-------------|---------------------------------------------|
| Backend     | Node.js 20, Express 4                       |
| Database    | **PostgreSQL 16** via `pg` with connection pooling |
| Auth        | JWT (access token, 1d expiry)               |
| Validation  | `express-validator`                         |
| Logging     | `winston` (structured JSON in production)   |
| Security    | `helmet`, `cors`, `express-rate-limit`      |
| Frontend    | React 18, Vite, Recharts, React Router 6    |
| Container   | Docker + Docker Compose                     |
| Web Server  | Nginx (serves frontend, proxies `/api`)     |

---

## Quick Start

### Option 1 — Docker Compose (Recommended)

```bash
git clone <repo-url>
cd finance-backend

# Start everything (Postgres + API + Frontend)
docker compose up --build

# In another terminal, seed the database
docker compose exec backend node src/utils/seed.js
```

| Service   | URL                         |
|-----------|-----------------------------|
| Frontend  | http://localhost:5173        |
| API       | http://localhost:3000        |
| Health    | http://localhost:3000/health |
| Postgres  | localhost:5432               |

### Option 2 — Local Development

**Prerequisites:** Node.js 20+, PostgreSQL 16 running locally.

```bash
# 1. Configure environment
cd backend
cp .env.example .env
# Edit .env — set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME

# 2. Install & migrate
npm install
npm run migrate

# 3. Seed demo data
npm run seed

# 4. Start API
npm run dev

# 5. Start Frontend (new terminal)
cd ../frontend
npm install
npm run dev
```

---

## Demo Credentials

After seeding, three accounts are ready:

| Role    | Email                    | Password     | Access                                |
|---------|--------------------------|--------------|---------------------------------------|
| Admin   | admin@finance.dev        | Admin@123    | Full access — records, users, dashboard |
| Analyst | analyst@finance.dev      | Analyst@123  | Read records + full dashboard          |
| Viewer  | viewer@finance.dev       | Viewer@123   | Dashboard summary only                 |

---

## Project Structure

```
finance-backend/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── src/
│   │   ├── app.js                   # Express bootstrap
│   │   ├── config/
│   │   │   ├── db.js                # pg Pool, query(), withTransaction()
│   │   │   └── logger.js            # Winston structured logger
│   │   ├── models/
│   │   │   ├── user.model.js        # User queries
│   │   │   └── record.model.js      # Financial records + aggregations
│   │   ├── services/
│   │   │   ├── auth.service.js
│   │   │   ├── user.service.js
│   │   │   └── record.service.js    # RecordService + DashboardService
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js   # JWT verification
│   │   │   └── rbac.middleware.js   # authorize() / atLeast()
│   │   ├── validators/index.js      # All express-validator chains
│   │   ├── routes/index.js          # All routes in one file
│   │   └── utils/
│   │       ├── migrate.js           # SQL migration runner
│   │       └── seed.js              # Dev seed with 150+ records
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    └── src/
        ├── pages/
        │   ├── Login.jsx            # Auth page with demo account quickfill
        │   ├── Dashboard.jsx        # KPIs, area chart, pie chart, bar chart
        │   ├── Records.jsx          # Full CRUD table with filters + pagination
        │   └── Users.jsx            # User management (admin only)
        ├── components/
        │   ├── Sidebar.jsx          # Navigation with role-aware menu
        │   └── UI.jsx               # Design system: Card, Badge, Button, StatCard…
        ├── hooks/useAuth.jsx        # Auth context
        └── utils/
            ├── api.js               # Axios with JWT interceptor + auto-logout
            └── format.js            # Currency, date, number formatters
```

---

## API Reference

All protected endpoints require: `Authorization: Bearer <token>`

### Auth
| Method | Endpoint           | Access  | Description            |
|--------|--------------------|---------|------------------------|
| POST   | /api/auth/register | Public  | Register user          |
| POST   | /api/auth/login    | Public  | Login, receive JWT     |
| GET    | /api/auth/me       | Any     | Current user profile   |

### Users
| Method | Endpoint       | Access  | Description             |
|--------|----------------|---------|-------------------------|
| GET    | /api/users     | Admin   | List all users          |
| GET    | /api/users/:id | Admin / Self | Get user by ID     |
| PATCH  | /api/users/:id | Admin   | Update role/status/name |

### Financial Records
| Method | Endpoint         | Access   | Description                         |
|--------|------------------|----------|-------------------------------------|
| GET    | /api/records     | Analyst+ | List records (filter + paginate)    |
| GET    | /api/records/:id | Analyst+ | Get single record                   |
| POST   | /api/records     | Admin    | Create record                       |
| PATCH  | /api/records/:id | Admin    | Update record                       |
| DELETE | /api/records/:id | Admin    | Soft-delete record                  |

Query params for `GET /api/records`: `type`, `category`, `startDate`, `endDate`, `page`, `limit`

### Dashboard
| Method | Endpoint                       | Access  | Description                     |
|--------|--------------------------------|---------|---------------------------------|
| GET    | /api/dashboard/overview        | Any     | All dashboard data in one call  |
| GET    | /api/dashboard/summary         | Any     | Income, expense, net balance    |
| GET    | /api/dashboard/categories      | Any     | Category-wise totals            |
| GET    | /api/dashboard/trends/monthly  | Any     | Monthly income/expense/net      |
| GET    | /api/dashboard/trends/weekly   | Any     | Weekly (last 12 weeks)          |
| GET    | /api/dashboard/recent          | Any     | Latest transactions             |

---

## Database Schema

```sql
-- Users
CREATE TABLE users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(100)   NOT NULL,
  email      VARCHAR(255)   UNIQUE NOT NULL,
  password   VARCHAR(255)   NOT NULL,           -- bcrypt, cost 12
  role       VARCHAR(20)    NOT NULL DEFAULT 'viewer'
             CHECK (role IN ('admin','analyst','viewer')),
  status     VARCHAR(20)    NOT NULL DEFAULT 'active'
             CHECK (status IN ('active','inactive')),
  created_at TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ    NOT NULL DEFAULT NOW()  -- auto-updated by trigger
);

-- Financial Records
CREATE TABLE financial_records (
  id         UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  amount     NUMERIC(15,2)  NOT NULL CHECK (amount > 0),
  type       VARCHAR(10)    NOT NULL CHECK (type IN ('income','expense')),
  category   VARCHAR(100)   NOT NULL,
  date       DATE           NOT NULL,
  notes      TEXT,
  created_by UUID           NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  deleted_at TIMESTAMPTZ    DEFAULT NULL,         -- NULL = active (soft delete)
  created_at TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);
```

Key PostgreSQL features used:
- `gen_random_uuid()` for UUID primary keys
- `NUMERIC(15,2)` for exact financial arithmetic (no floating-point errors)
- `TIMESTAMPTZ` for timezone-aware timestamps
- **Partial index** on `deleted_at WHERE deleted_at IS NULL` — fast active-record queries
- **`updated_at` trigger** — automatic timestamp updates at DB level
- **`FILTER` clause** in aggregations — compute income and expense totals in a single query pass
- **`ILIKE`** for case-insensitive category search

---

## Role & Access Control

```
admin    (3) ─► Full access: manage records, users, view dashboard
analyst  (2) ─► Read records + full dashboard analytics
viewer   (1) ─► Dashboard summary & charts only
```

Implemented via two composable Express middleware functions:
- `authorize('admin')` — exact role match
- `atLeast('analyst')` — minimum privilege level (hierarchy-aware)

---

## Error Responses

All errors return a consistent envelope:

```json
{ "success": false, "message": "Human-readable description." }
```

Validation failures add a per-field `errors` array:
```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": [
    { "field": "amount", "message": "Amount must be > 0." }
  ]
}
```

| Status | Meaning                         |
|--------|---------------------------------|
| 200    | Success                         |
| 201    | Created                         |
| 401    | Missing / expired / invalid JWT |
| 403    | Insufficient role               |
| 404    | Resource not found              |
| 409    | Conflict (duplicate email)      |
| 422    | Validation failed               |
| 429    | Rate limit exceeded             |
| 500    | Server error (logged)           |

---

## Design Decisions

| Decision | Rationale |
|---|---|
| PostgreSQL over SQLite | Production-grade ACID compliance, connection pooling, partial indexes, native UUID, `NUMERIC` type for exact decimal arithmetic |
| `pg` pool (not ORM) | Direct SQL gives full control over query plans, aggregations with `FILTER`, and partial indexes. An ORM would abstract away PostgreSQL-specific features |
| Soft delete | Financial records must never be permanently destroyed — audit trail, GDPR right-to-explanation, accidental-deletion recovery |
| Bcrypt cost 12 | Balance between security and latency. Cost 10 is common; 12 adds ~4× hashing time — appropriate for a finance system |
| DB-level `updated_at` trigger | Ensures `updated_at` is accurate even for direct DB updates, not just API calls |
| Structured logging with Winston | JSON logs in production are parseable by log aggregators (Datadog, ELK, CloudWatch) |
| `helmet` | Sets 14 security-related HTTP headers out of the box |
| Docker multi-stage build | Keeps the production image lean — dev dependencies are discarded after build |

---

## Optional Enhancements Included

- ✅ JWT authentication
- ✅ Pagination (`page`, `limit`, `totalPages`)
- ✅ Multi-field filtering (type, category, date range)
- ✅ Soft delete with audit trail
- ✅ Rate limiting (auth: 20/15min, global: 300/15min)
- ✅ Structured logging (Winston)
- ✅ Full API documentation
- ✅ Docker Compose setup with health checks
- ✅ Production-ready React frontend

---

*Built for the Zorvyn FinTech backend engineering assessment.*
