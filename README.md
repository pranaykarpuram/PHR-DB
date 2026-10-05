# PHR-DB

Relational personal health-record system (CS 411) — MySQL schema + staging/ETL, Node/Express API, React UI. Built on NHANES participant data with transactional medication workflows (triggers + stored procedures) and a deterministic NL→SQL assistant.

## Demo

<!-- DEMO_VIDEO -->
<!-- Drop a YouTube / Loom / Drive embed or GIF below this line -->

_Demo video coming soon._

---

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
- Medications overview: `GET /api/medications/overview`
- Medication CRUD:
  - `POST /api/medications`
  - `PATCH /api/medications/:patientMedId`
  - `DELETE /api/medications/:patientMedId`
  - `POST /api/medications/:patientMedId/discontinue` (transaction-backed + stored procedure call)

SQL is **parameterized** in `server/queries/` (no ORM). Reference copy of intent: `sql/frontend_queries.sql`.

## Frontend (Vite + React)

```bash
cd frontend
npm install
npm run dev
```

Vite proxies `/api` → `http://localhost:3001` (see `frontend/vite.config.ts`). Run the **API first**, then open the Vite URL (usually `http://localhost:5173`).

## Stage 4 advanced DB features

Load advanced SQL objects after schema + transform steps:

```bash
mysql -u root -p < docs/stage4_advanced_programs.sql
```

This file adds:

- `sp_discontinue_medication` stored procedure
- `trg_patmed_before_insert` trigger
- `trg_patmed_before_update` trigger
- `MedicationWorkflowLog` and `MedicationTriggerAlert` helper tables

Frontend-to-feature mapping:

- **Create / Update medication** in patient modal → triggers fire on invalid date ordering and normalize data.
- **Discontinue medication** button in patient modal → backend route runs:
  - `SET TRANSACTION ISOLATION LEVEL READ COMMITTED`
  - `START TRANSACTION`
  - `CALL sp_discontinue_medication(...)`
  - workflow log insert
  - `COMMIT` or `ROLLBACK`

## Keyword search behavior

Top search now matches:

- patient SEQN (`nhanes_seqn`)
- medication name (`Drug.drug_name`)
- condition code/name (`ConditionType.condition_code`, `ConditionType.condition_name`)

## Stage 4 quick test flow (simple)

1. Start both apps:
   - `cd server && npm run dev`
   - `cd frontend && npm run dev`
2. In MySQL, run:
   - `USE phr_db;`
   - `SOURCE docs/stage4_advanced_programs.sql;`
3. Open the app, go to **Patients**, open any patient, then go to **Medications**.
4. Test CRUD in the modal:
   - add a medication
   - edit and save it
   - delete one row
5. Test trigger behavior:
   - create or edit a medication with `end_date` earlier than `start_date`
   - verify DB logged it:
     - `SELECT * FROM MedicationTriggerAlert ORDER BY trigger_alert_id DESC LIMIT 5;`
6. Test stored procedure + transaction:
   - click **Discontinue** on a medication row
   - verify DB log:
     - `SELECT * FROM MedicationWorkflowLog ORDER BY workflow_log_id DESC LIMIT 10;`
7. Test keyword search in top bar:
   - search a SEQN fragment
   - search a medication name
   - search a condition code or condition name
8. For submission:
   - include `docs/stage4_advanced_programs.sql`
   - tag the release as `stage.4.2`

## Project layout

| Path | Role |
|------|------|
| `sql/` | Schema, staging, transform, index experiments, `queries.sql`, `frontend_queries.sql` |
| `server/` | Express API, `mysql2/promise` pool, route handlers |
| `frontend/` | React UI (patients grid, detail modal, analytics) |
