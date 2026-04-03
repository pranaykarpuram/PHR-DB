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

-- app logins
CREATE TABLE UserAccount (
  user_id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_useraccount_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

-- visits / cycles
CREATE TABLE Encounter (
  encounter_id INT NOT NULL AUTO_INCREMENT,
  patient_id INT NOT NULL,
  encounter_date DATE NULL,
  cycle VARCHAR(20) NOT NULL,
  encounter_type VARCHAR(50) NOT NULL,
  PRIMARY KEY (encounter_id),
  CONSTRAINT fk_encounter_patient
    FOREIGN KEY (patient_id) REFERENCES Patient (patient_id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- lab names
CREATE TABLE LabTestType (
  test_type_id INT NOT NULL AUTO_INCREMENT,
  test_name VARCHAR(100) NOT NULL,
  default_unit VARCHAR(20) NULL,
  PRIMARY KEY (test_type_id),
  UNIQUE KEY uq_labtesttype_name (test_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- actual labs
CREATE TABLE LabResult (
  lab_result_id INT NOT NULL AUTO_INCREMENT,
  encounter_id INT NOT NULL,
  test_type_id INT NOT NULL,
  value DECIMAL(10, 2) NOT NULL,
  unit VARCHAR(20) NULL,
  result_time DATETIME NULL,
  PRIMARY KEY (lab_result_id),
  CONSTRAINT fk_labresult_encounter
    FOREIGN KEY (encounter_id) REFERENCES Encounter (encounter_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_labresult_testtype
    FOREIGN KEY (test_type_id) REFERENCES LabTestType (test_type_id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- drug lookup
CREATE TABLE Drug (
  drug_id INT NOT NULL AUTO_INCREMENT,
  drug_name VARCHAR(120) NOT NULL,
  PRIMARY KEY (drug_id),
  UNIQUE KEY uq_drug_name (drug_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- who takes what
CREATE TABLE PatientMedication (
  patient_med_id INT NOT NULL AUTO_INCREMENT,
  patient_id INT NOT NULL,
  drug_id INT NOT NULL,
  dosage VARCHAR(60) NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  PRIMARY KEY (patient_med_id),
  CONSTRAINT fk_patmed_patient
    FOREIGN KEY (patient_id) REFERENCES Patient (patient_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_patmed_drug
    FOREIGN KEY (drug_id) REFERENCES Drug (drug_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_patmed_dates
    CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- condition lookup
CREATE TABLE ConditionType (
  condition_type_id INT NOT NULL AUTO_INCREMENT,
  condition_code VARCHAR(30) NOT NULL,
  condition_name VARCHAR(100) NOT NULL,
  PRIMARY KEY (condition_type_id),
  UNIQUE KEY uq_condition_code (condition_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- patient dx bridge
CREATE TABLE PatientCondition (
  patient_condition_id INT NOT NULL AUTO_INCREMENT,
  patient_id INT NOT NULL,
  condition_type_id INT NOT NULL,
  status VARCHAR(30) NULL,
  cycle VARCHAR(20) NOT NULL,
  PRIMARY KEY (patient_condition_id),
  CONSTRAINT fk_patcond_patient
    FOREIGN KEY (patient_id) REFERENCES Patient (patient_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_patcond_type
    FOREIGN KEY (condition_type_id) REFERENCES ConditionType (condition_type_id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


## Advanced Queries (`sql/queries.sql`)

#### 1. Average Total Cholesterol by Patient

This query computes the average total cholesterol for each patient.

It joins `Patient`, `Encounter`, `LabResult`, and `LabTestType`, filters for **Total Cholesterol**, and uses `AVG` and `COUNT` to summarize results.


#### 2. Diabetic Patients with High Cholesterol (Subquery)

This query finds patients with diabetes whose cholesterol is above the overall average.

It joins patient, condition, and lab tables, filters for `DIABETES` and **Total Cholesterol**, and uses a subquery to compare each value against the global average.


#### 3. Patients with Both Diabetes and Hypertension Who Take More Than One Medication

This query finds patients who have both diabetes and hypertension and are taking more than one medication.

It joins the patient, condition, and medication tables, then uses `GROUP BY` and `HAVING` to keep only patients who match both conditions and have more than one distinct medication.

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
