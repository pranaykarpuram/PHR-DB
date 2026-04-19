# sp26-cs411-team075-hydd (PHR-DB)

Team hydd — CS 411 personal health record database + minimal API + React UI.

## Database (MySQL 8)

1. Create schema: `mysql -u root -p < sql/schema.sql`
2. Staging tables: `mysql -u root -p < sql/staging.sql`
3. Load staging data (your workflow): run `insert_staging_*.sql` or import CSVs into `staging_*` tables.
4. Populate core tables: `mysql -u root -p < sql/transform.sql`

Database name: **`phr_db`** (see `sql/schema.sql`).

## API server (Node + Express + mysql2)

```bash
cd server
cp .env.example .env
# edit .env: DB_USER, DB_PASSWORD, DB_NAME=phr_db, PORT=3001
npm install
npm run dev
```

- Health: `GET http://localhost:3001/api/health`
- Patients: `GET http://localhost:3001/api/patients` (query params: `search`, `sex`, `birthYearMin`, `birthYearMax`, `conditionCode`, `limit`, `offset`)
- Patient detail: `GET /api/patients/:id`, plus `/encounters`, `/labs`, `/medications`, `/conditions`
- Analytics: `GET /api/analytics/overview`

SQL is **parameterized** in `server/queries/` (no ORM). Reference copy of intent: `sql/frontend_queries.sql`.

## Frontend (Vite + React)

```bash
cd frontend
npm install
npm run dev
```

Vite proxies `/api` → `http://localhost:3001` (see `frontend/vite.config.ts`). Run the **API first**, then open the Vite URL (usually `http://localhost:5173`).

## Triggers

None added. Aggregates use normal `SELECT` + `JOIN` + `COUNT` / `GROUP BY`.

## Project layout

| Path | Role |
|------|------|
| `sql/` | Schema, staging, transform, index experiments, `queries.sql`, `frontend_queries.sql` |
| `server/` | Express API, `mysql2/promise` pool, route handlers |
| `frontend/` | React UI (patients grid, detail modal, analytics) |
