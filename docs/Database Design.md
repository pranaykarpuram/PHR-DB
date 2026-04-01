# PHR-DB — Stage 3 Database Design

## Project description

PHR-DB (Personal Health Record Database) is a course project that models application users, patients linked to NHANES participant id (`nhanes_seqn`), survey encounters, laboratory results, medications, and conditions. The goal is a normalized relational schema in MySQL 8 with integrity constraints and example analytics queries.

## Final schema summary

Nine tables (see `docs/erdiagam.md`):

| Table | Purpose |
|-------|---------|
| `UserAccount` | Login-level users |
| `Patient` | Patients, tied to one user; stores `nhanes_seqn` |
| `Encounter` | NHANES-style collection events (cycle, type, optional date) |
| `LabTestType` | Catalog of lab tests |
| `LabResult` | Measurements per encounter and test type |
| `Drug` | Drug catalog |
| `PatientMedication` | Patient–drug rows with dosage and dates |
| `ConditionType` | Condition catalog |
| `PatientCondition` | Patient–condition rows with status and cycle |

## DDL overview

- **Database:** `phr_db`, `utf8mb4` / `utf8mb4_unicode_ci`.
- **Surrogate keys:** `INT AUTO_INCREMENT` primary keys on all tables.
- **Referential integrity:** `FOREIGN KEY` with `ON DELETE RESTRICT`, `ON UPDATE CASCADE` (safe defaults for class demos).
- **Uniqueness:** `UserAccount.email`, `Patient.nhanes_seqn`, `LabTestType.test_name`, `Drug.drug_name`, `ConditionType.condition_code`.
- **CHECK:** `Patient` birth year range and allowed `sex` values; `PatientMedication` date order when both dates present.

## Advanced queries (`sql/queries.sql`)

1. **Average glucose by patient:** Joins `Patient` → `Encounter` → `LabResult` → `LabTestType`, filters by test name, uses `GROUP BY` and `AVG` / `COUNT` to summarize encounters and glucose.
2. **High cholesterol among diabetic patients (subquery):** Selects patients with condition code `E11` in cycle `2017-2018` who have a total cholesterol measurement above the **overall** average cholesterol (scalar subquery).
3. **Lab counts by cycle (UNION):** Aggregates lab result counts per survey cycle for two cycles, then unions a row with the total count across all lab results for comparison.

## Indexing plan (`sql/indexes.sql`)

Secondary indexes target join and filter columns used by the three queries:

- `LabResult (encounter_id, test_type_id)` — supports resolving results to encounters and test types.
- `PatientCondition (cycle)` and `(patient_id, cycle)` — supports condition filters tied to cycle.
- `Encounter (cycle)` — supports grouping or filtering encounters by NHANES cycle.

Primary keys are not re-indexed. InnoDB already maintains indexes for foreign-key columns; these indexes are **additional** structures for experiments with `EXPLAIN ANALYZE`.

## Assumptions

- `nhanes_seqn` is **globally unique** in this database (`UNIQUE` constraint).
- `birth_year` upper bound is **2026** in CHECK (matches project timeline).
- `Encounter.encounter_date` may be **NULL** when a date is unknown (per design notes in `erdiagam.md`).
