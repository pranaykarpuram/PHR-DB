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

The database was implemented locally using MySQL.

The following screenshot shows the active MySQL session, selected database, and tables created:

<img width="1124" height="1072" alt="image" src="https://github.com/user-attachments/assets/800011f0-ec8a-4248-9db7-8373a68e9fc4" />


## DDL overview

- **Database:** `phr_db`, `utf8mb4` / `utf8mb4_unicode_ci`.
- **Surrogate keys:** `INT AUTO_INCREMENT` primary keys on all tables.
- **Referential integrity:** `FOREIGN KEY` with `ON DELETE RESTRICT`, `ON UPDATE CASCADE` (safe defaults for class demos).
- **Uniqueness:** `UserAccount.email`, `Patient.nhanes_seqn`, `LabTestType.test_name`, `Drug.drug_name`, `ConditionType.condition_code`.
- **CHECK:** `Patient` birth year range and allowed `sex` values; `PatientMedication` date order when both dates present.

### DDL Commands

See `sql/schema.sql` for all commands

#### First 2 Commands
```sql
-- app logins
CREATE TABLE UserAccount (
  user_id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_useraccount_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```
```sql
-- people w seqn
CREATE TABLE Patient (
  patient_id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  nhanes_seqn INT NOT NULL,
  birth_year INT NOT NULL,
  sex CHAR(1) NOT NULL,
  PRIMARY KEY (patient_id),
  UNIQUE KEY uq_patient_nhanes_seqn (nhanes_seqn),
  CONSTRAINT fk_patient_user
    FOREIGN KEY (user_id) REFERENCES UserAccount (user_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_patient_birth_year
    CHECK (birth_year BETWEEN 1900 AND 2026),
  CONSTRAINT chk_patient_sex
    CHECK (sex IN ('M', 'F', 'O'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Data Insertion Verification

We inserted data into multiple tables using NHANES datasets.

The following queries verify row counts:

```sql
SELECT COUNT(*) AS patient_rows FROM Patient;
SELECT COUNT(*) AS encounter_rows FROM Encounter;
SELECT COUNT(*) AS labresult_rows FROM LabResult;
SELECT COUNT(*) AS patientmed_rows FROM PatientMedication;
SELECT COUNT(*) AS patientcondition_rows FROM PatientCondition;
```

The results confirm that multiple tables contain well over 1000 rows.

### Patient Table
<img width="776" height="236" alt="image" src="https://github.com/user-attachments/assets/f36e9afd-d9e1-43a4-9c6d-17103653165a" />

### Encounter Table
<img width="830" height="216" alt="image" src="https://github.com/user-attachments/assets/46be08c6-a7ae-46a0-8727-71237f228b10" />

### LabResult Table
<img width="830" height="214" alt="image" src="https://github.com/user-attachments/assets/d447c6e1-dfed-4812-a208-a1cb4bd1f9c6" />

### PatientMedication Table
<img width="930" height="212" alt="image" src="https://github.com/user-attachments/assets/f052dd96-e834-47b7-9c6a-eacea30bb15c" />

### PatientCondition Table
<img width="1032" height="220" alt="image" src="https://github.com/user-attachments/assets/bb433d65-4064-4751-a185-cde95a53425f" />

## Advanced Queries (`sql/queries.sql`)

### 1. Average Total Cholesterol by Patient

This query computes the average total cholesterol for each patient.

It joins `Patient`, `Encounter`, `LabResult`, and `LabTestType`, filters for **Total Cholesterol**, and uses `AVG` and `COUNT` to summarize results.

<img width="930" height="582" alt="image" src="https://github.com/user-attachments/assets/513feab8-46b2-4163-8615-06c56d2df442" />


### 2. Diabetic Patients with High Cholesterol (Subquery)

This query finds patients with diabetes whose cholesterol is above the overall average.

It joins patient, condition, and lab tables, filters for `DIABETES` and **Total Cholesterol**, and uses a subquery to compare each value against the global average.

<img width="1010" height="574" alt="image" src="https://github.com/user-attachments/assets/8d3172cb-9da4-454a-a5da-c0cef9703236" />


### 3. Patients with Both Diabetes and Hypertension Who Take More Than One Medication

This query finds patients who have both diabetes and hypertension and are taking more than one medication.

It joins the patient, condition, and medication tables, then uses `GROUP BY` and `HAVING` to keep only patients who match both conditions and have more than one distinct medication.

<img width="708" height="582" alt="image" src="https://github.com/user-attachments/assets/58baf6ea-bd05-496f-b19b-3eb2b8d0c721" />

## Indexing Strategy (`sql/index_experiments.sql`)

We evaluated each advanced query using `EXPLAIN ANALYZE` under four configurations: a baseline with no additional experimental indexes, followed by three different indexing designs.

Primary keys were not re-indexed. We focused on indexing columns used in joins, filters, and grouping conditions.

### Query 1: Average Total Cholesterol by Patient

The indexing designs tested were:

- **Baseline:** no additional experimental indexes
- **Design A:** `LabResult(test_type_id, encounter_id)`
- **Design B:** `LabTestType(test_name)`
- **Design C:** `LabTestType(test_name)` and `LabResult(test_type_id, encounter_id)`

These designs were chosen to test whether performance improves more from indexing the lab-result join path, the test-name lookup, or both together.

### Query 2: Diabetic Patients with High Cholesterol

The indexing designs tested were:

- **Baseline:** no additional experimental indexes
- **Design A:** `ConditionType(condition_code)` and `PatientCondition(condition_type_id, cycle, patient_id)`
- **Design B:** `LabTestType(test_name)` and `LabResult(test_type_id, encounter_id, value)`
- **Design C:** `ConditionType(condition_code)`, `PatientCondition(condition_type_id, cycle, patient_id)`, `LabTestType(test_name)`, and `LabResult(test_type_id, encounter_id, value)`

These designs were chosen to compare indexing the condition-filter path, the lab-filter path, and a combined strategy.

### Query 3: Patients with Both Diabetes and Hypertension Who Take More Than One Medication

The indexing designs tested were:

- **Baseline:** no additional experimental indexes
- **Design A:** `ConditionType(condition_code)` and `PatientCondition(condition_type_id, patient_id)`
- **Design B:** `PatientMedication(patient_id, drug_id)`
- **Design C:** `ConditionType(condition_code)`, `PatientCondition(condition_type_id, patient_id)`, and `PatientMedication(patient_id, drug_id)`

These designs were chosen to compare indexing the condition-matching path, the medication aggregation path, and a combined strategy.

## Indexing Analysis


## Assumptions

- `nhanes_seqn` is **globally unique** in this database (`UNIQUE` constraint).
- `birth_year` upper bound is **2026** in CHECK (matches project timeline).
- `Encounter.encounter_date` may be **NULL** when a date is unknown (per design notes in `erdiagam.md`).
