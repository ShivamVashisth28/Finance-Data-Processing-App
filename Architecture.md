# Finance Data Processing & Access Control Backend

A production-quality REST API backend for a multi-role finance dashboard system — featuring JWT authentication, role-based access control, financial record management, and real-time aggregated analytics.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Architecture & Design Decisions](#architecture--design-decisions)
- [Role Model & Access Control](#role-model--access-control)
- [API Reference](#api-reference)
  - [Auth](#auth)
  - [Users](#users)
  - [Financial Records](#financial-records)
  - [Dashboard](#dashboard)
- [Database Schema](#database-schema)
- [Error Handling](#error-handling)
- [Testing](#testing)
- [Assumptions & Trade-offs](#assumptions--trade-offs)

---

## Tech Stack

| Concern           | Choice                            | Reason                                                        |
|-------------------|-----------------------------------|---------------------------------------------------------------|
| Runtime           | Node.js 18+                       | Fast I/O, excellent ecosystem for REST APIs                   |
| Framework         | Express 4                         | Minimal, composable, industry-standard                        |
| Database          | SQLite via `better-sqlite3`       | Zero-config, file-based, synchronous API reduces boilerplate  |
| Auth              | JWT (`jsonwebtoken`)              | Stateless, portable, easy to integrate with any frontend      |
| Password hashing  | `bcryptjs`                        | Industry-standard adaptive hashing                           |
| Validation        | `express-validator`               | Declarative, chainable, integrates cleanly with Express       |
| Rate limiting     | `express-rate-limit`              | Protects auth endpoints from brute-force attacks              |
| Testing           | Jest + Supertest                  | Integration-level coverage with real HTTP semantics           |
| Logging           | Morgan                            | Structured HTTP logging out of the box                        |

---

## Project Structure

```
finance-backend/
├── src/
│   ├── app.js                    # Express app bootstrap & middleware stack
│   ├── controllers/              # Thin layer — receive req, call service, send res
│   │   ├── auth.controller.js
│   │   ├── user.controller.js
│   │   ├── record.controller.js
│   │   └── dashboard.controller.js
│   ├── services/                 # All business logic lives here
│   │   ├── auth.service.js
│   │   ├── user.service.js
│   │   ├── record.service.js
│   │   └── dashboard.service.js
│   ├── models/                   # Data access layer (SQL queries)
│   │   ├── db.js                 # DB initialisation & schema creation
│   │   ├── user.model.js
│   │   └── record.model.js
│   ├── routes/                   # Route declarations + middleware chains
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── record.routes.js
│   │   └── dashboard.routes.js
│   ├── middleware/
│   │   ├── auth.middleware.js    # JWT verification → attaches req.user
│   │   ├── rbac.middleware.js    # authorize() and atLeast() guards
│   │   ├── validate.middleware.js# express-validator error formatter
│   │   └── error.middleware.js   # Global error handler + 404 catcher
│   ├── validators/
│   │   └── index.js              # All input validation rule chains
│   └── utils/
│       └── seed.js               # Dev seed script with realistic data
├── tests/
│   ├── setup.js                  # In-memory DB bootstrap for test isolation
│   ├── auth.test.js
│   ├── records.test.js
│   └── dashboard.test.js
├── .env
├── jest.config.json
└── package.json
```

The design follows a **Controller → Service → Model** layering pattern:
- **Controllers** handle HTTP concerns only (parse request, format response)
- **Services** contain all business rules and orchestration logic
- **Models** handle all database interactions — no SQL outside the model layer


## Architecture & Design Decisions

### Layered Architecture

The codebase is structured in three clear layers — controllers, services, and models — each with a single responsibility. This makes the code easy to test, easy to trace bugs through, and easy to extend. For example, replacing SQLite with PostgreSQL would only require changes in the model layer.

### Synchronous SQLite Driver

`better-sqlite3` is used instead of the async `sqlite3` driver. For a single-process API over SQLite, synchronous operations are simpler, avoid callback pyramid issues, and are actually faster for the read-heavy workloads that dashboards produce. This is a deliberate trade-off: if the system needed to scale horizontally, swapping to an async PostgreSQL driver would be straightforward given the layered architecture.

### Soft Deletes

Financial records are never hard-deleted. A `deleted_at` timestamp is set instead. This mirrors real-world accounting requirements (audit trails, accidental deletion recovery) and is enforced consistently at the model layer — all queries filter `WHERE deleted_at IS NULL`.

### JWT Stateless Auth

JWTs are issued on login and carry `{ id, role }`. The `authenticate` middleware verifies the token and re-fetches the user from the database on every request. This ensures that deactivating a user takes effect immediately without waiting for token expiry.

### Role Hierarchy via Middleware

RBAC is implemented through two composable middleware functions in `rbac.middleware.js`:

- `authorize(...roles)` — Exact role match. e.g., `authorize('admin')` for admin-only routes.
- `atLeast(minRole)` — Hierarchy-aware. e.g., `atLeast('analyst')` allows both `analyst` and `admin`.

This keeps route definitions clean and the access rules self-documenting.

---

## Role Model & Access Control

```
admin    ──► full access: create, read, update, delete records + manage users
analyst  ──► read records + access all dashboard analytics
viewer   ──► dashboard overview and summaries only (no raw record access)
```

| Action                         | Viewer | Analyst | Admin |
|--------------------------------|--------|---------|-------|
| Login / view own profile       | ✅     | ✅      | ✅    |
| View dashboard summary         | ✅     | ✅      | ✅    |
| View category/trend analytics  | ✅     | ✅      | ✅    |
| List & view financial records  | ❌     | ✅      | ✅    |
| Create financial records       | ❌     | ❌      | ✅    |
| Update financial records       | ❌     | ❌      | ✅    |
| Delete financial records       | ❌     | ❌      | ✅    |
| List all users                 | ❌     | ❌      | ✅    |
| View any user profile          | ❌     | ❌      | ✅    |
| Update user roles / status     | ❌     | ❌      | ✅    |

---

## API Reference

All protected endpoints require:
```
Authorization: Bearer <token>
```

### Auth

#### `POST /api/auth/register`
Register a new user.

**Body:**
```json
{
  "name": "Alice Admin",
  "email": "alice@example.com",
  "password": "SecurePass@1",
  "role": "admin"
}
```
`role` is optional and defaults to `"viewer"`. Valid values: `admin`, `analyst`, `viewer`.

**Response `201`:**
```json
{
  "success": true,
  "message": "User registered successfully.",
  "data": {
    "id": "uuid",
    "name": "Alice Admin",
    "email": "alice@example.com",
    "role": "admin",
    "status": "active",
    "created_at": "...",
    "updated_at": "..."
  }
}
```

---

#### `POST /api/auth/login`
Authenticate and receive a JWT.

**Body:**
```json
{
  "email": "alice@example.com",
  "password": "SecurePass@1"
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { "id": "...", "name": "...", "role": "admin" }
  }
}
```

---

#### `GET /api/auth/me` 🔒
Returns the currently authenticated user.

---

### Users

#### `GET /api/users` 🔒 Admin only
List all users. Optional query: `?status=active|inactive`

#### `GET /api/users/:id` 🔒
Admins can view any user. Non-admins can only view their own profile.

#### `PATCH /api/users/:id` 🔒 Admin only
Update a user's name, email, role, or status.

**Body (all fields optional):**
```json
{
  "name": "Updated Name",
  "email": "new@email.com",
  "role": "analyst",
  "status": "inactive"
}
```

---

### Financial Records

#### `POST /api/records` 🔒 Admin only
Create a new financial record.

**Body:**
```json
{
  "amount": 75000,
  "type": "income",
  "category": "Salary",
  "date": "2024-06-01",
  "notes": "June salary payment"
}
```

| Field      | Type    | Rules                                   |
|------------|---------|-----------------------------------------|
| `amount`   | number  | Required, must be > 0                   |
| `type`     | string  | Required, `"income"` or `"expense"`     |
| `category` | string  | Required, max 100 chars                 |
| `date`     | string  | Required, ISO 8601 format (YYYY-MM-DD)  |
| `notes`    | string  | Optional, max 500 chars                 |

---

#### `GET /api/records` 🔒 Analyst+
List financial records with filtering and pagination.

**Query parameters:**

| Param       | Type   | Description                      |
|-------------|--------|----------------------------------|
| `type`      | string | Filter by `income` or `expense`  |
| `category`  | string | Filter by category name          |
| `startDate` | string | ISO date — inclusive lower bound |
| `endDate`   | string | ISO date — inclusive upper bound |
| `page`      | int    | Page number (default: 1)         |
| `limit`     | int    | Items per page (default: 20, max: 100) |

**Response `200`:**
```json
{
  "success": true,
  "records": [...],
  "total": 95,
  "page": 1,
  "limit": 20,
  "totalPages": 5
}
```

---

#### `GET /api/records/:id` 🔒 Analyst+
Get a single financial record by ID.

#### `PATCH /api/records/:id` 🔒 Admin only
Update any field of a financial record.

#### `DELETE /api/records/:id` 🔒 Admin only
Soft-delete a financial record (sets `deleted_at`, record is excluded from all future queries).

---

### Dashboard

All dashboard endpoints are accessible to all authenticated roles.

#### `GET /api/dashboard/overview` 🔒 All roles
Returns all dashboard data in a single request — ideal for initial page load.

**Query parameters:** `startDate`, `endDate`, `year` (all optional)

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_income": 250000,
      "total_expense": 87500,
      "net_balance": 162500
    },
    "categories": {
      "income": [
        { "category": "Salary", "type": "income", "total": 180000, "count": 3 }
      ],
      "expense": [
        { "category": "Rent", "type": "expense", "total": 45000, "count": 3 }
      ]
    },
    "monthly_trends": [
      { "month": "2024-01", "income": 85000, "expense": 12000, "net": 73000 }
    ],
    "weekly_trends": [
      { "week": "2024-W01", "income": 20000, "expense": 3000, "net": 17000 }
    ],
    "recent_activity": [...]
  }
}
```

---

#### `GET /api/dashboard/summary` 🔒 All roles
Returns totals only. Supports `startDate` / `endDate` filters.

#### `GET /api/dashboard/categories` 🔒 All roles
Returns totals grouped by `category` and `type`.

#### `GET /api/dashboard/trends/monthly` 🔒 All roles
Monthly income/expense/net trend. Supports `year` filter.

#### `GET /api/dashboard/trends/weekly` 🔒 All roles
Weekly income/expense/net trend for the last 12 weeks.

#### `GET /api/dashboard/recent` 🔒 All roles
Returns the most recent records. Supports `?limit=N` (max 50).

---

## Database Schema

```sql
-- Users
CREATE TABLE users (
  id         TEXT PRIMARY KEY,            -- UUID v4
  name       TEXT NOT NULL,
  email      TEXT UNIQUE NOT NULL,
  password   TEXT NOT NULL,               -- bcrypt hash
  role       TEXT NOT NULL CHECK(role IN ('admin', 'analyst', 'viewer')),
  status     TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Financial Records
CREATE TABLE financial_records (
  id         TEXT PRIMARY KEY,            -- UUID v4
  amount     REAL NOT NULL CHECK(amount > 0),
  type       TEXT NOT NULL CHECK(type IN ('income', 'expense')),
  category   TEXT NOT NULL,
  date       TEXT NOT NULL,               -- YYYY-MM-DD
  notes      TEXT,
  created_by TEXT NOT NULL REFERENCES users(id),
  deleted_at TEXT DEFAULT NULL,           -- NULL = active, set = soft-deleted
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for common filter patterns
CREATE INDEX idx_records_type     ON financial_records(type);
CREATE INDEX idx_records_category ON financial_records(category);
CREATE INDEX idx_records_date     ON financial_records(date);
CREATE INDEX idx_records_deleted  ON financial_records(deleted_at);
```

---

## Error Handling

All errors return a consistent JSON envelope:

```json
{
  "success": false,
  "message": "Human-readable error description."
}
```

Validation errors additionally include a per-field `errors` array:

```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": [
    { "field": "amount", "message": "Amount must be a positive number." },
    { "field": "date",   "message": "Date must be a valid ISO 8601 date (YYYY-MM-DD)." }
  ]
}
```

| HTTP Status | Meaning                                         |
|-------------|-------------------------------------------------|
| `200`       | Success                                         |
| `201`       | Resource created                                |
| `401`       | Missing, invalid, or expired JWT                |
| `403`       | Authenticated but insufficient role             |
| `404`       | Resource not found                              |
| `409`       | Conflict (e.g., duplicate email)                |
| `422`       | Input validation failed                         |
| `429`       | Rate limit exceeded                             |
| `500`       | Unexpected server error (logged server-side)    |

---

## Testing

Tests use Jest + Supertest with an **in-memory SQLite database** for full isolation — no external services required.

```bash
# Run all tests
npm test

# With coverage report
npm test -- --coverage
```

Test suites:
- `auth.test.js` — Registration, login, JWT validation, edge cases
- `records.test.js` — CRUD, access control per role, filtering, pagination, validation
- `dashboard.test.js` — Summary accuracy, overview shape, trend endpoints

---

## Assumptions & Trade-offs

| Decision | Reasoning |
|---|---|
| **SQLite instead of PostgreSQL** | Meets the assignment scope without requiring a running DB server. The model layer is the only thing that would change when scaling to PostgreSQL. |
| **Synchronous DB driver** | Simpler code path, appropriate for single-process SQLite. Would be replaced by async/await with a proper DB driver in production. |
| **Role assigned at registration** | Simplified for this scope. In a real system, only admins would assign roles — the registration route could be admin-only or expose a separate admin-only `POST /users` endpoint. |
| **No refresh tokens** | JWTs expire in 7 days. A production system would include short-lived access tokens + refresh token rotation. |
| **Soft delete only** | Financial data is never permanently removed. `deleted_at` provides a full audit trail. |
| **In-memory rate limiting** | `express-rate-limit` stores counters in-process. In a multi-instance deployment this would need a Redis-backed store. |
| **No pagination on dashboard** | Dashboard aggregation endpoints return computed totals, not raw rows, so pagination is not applicable. The `recent` endpoint has a configurable `limit`. |

---

## Optional Enhancements Implemented

- ✅ JWT authentication with expiry
- ✅ Pagination on record listing (`page`, `limit`, `totalPages`)
- ✅ Category and date range filtering
- ✅ Soft delete functionality
- ✅ Rate limiting (global 200/15min + auth 20/15min)
- ✅ Unit/integration test suite (Jest + Supertest)
- ✅ Full API documentation (this README)
- ✅ Seed script with realistic data

