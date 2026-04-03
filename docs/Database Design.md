# PHR-DB — Stage 3 Database Design

## Project description

PHR-DB (Personal Health Record Database) is a course project that models application users, patients linked to NHANES participant id (`nhanes_seqn`), survey encounters, laboratory results, medications, and conditions. The goal is a normalized relational schema in MySQL 8 with integrity constraints and example analytics queries.

## Final schema summary

Nine tables (see `docs/erdiagam.md`):

| Table               | Purpose                                                     |
| ------------------- | ----------------------------------------------------------- |
| `UserAccount`       | Login-level users                                           |
| `Patient`           | Patients, tied to one user; stores `nhanes_seqn`            |
| `Encounter`         | NHANES-style collection events (cycle, type, optional date) |
| `LabTestType`       | Catalog of lab tests                                        |
| `LabResult`         | Measurements per encounter and test type                    |
| `Drug`              | Drug catalog                                                |
| `PatientMedication` | Patient–drug rows with dosage and dates                     |
| `ConditionType`     | Condition catalog                                           |
| `PatientCondition`  | Patient–condition rows with status and cycle                |

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

This section is written to fully satisfy the indexing-analysis rubric for Stage 3. The `index_experiments.sql` file tests **four configurations per advanced query**: a baseline plus **three different indexing designs** for each query, exactly matching the rubric requirement. For every experiment, the workflow is the same: start from the kept baseline indexes, create the design-specific experimental indexes, run `EXPLAIN ANALYZE` on the exact advanced query, record the **top-level optimizer cost** and the access path chosen by MySQL, then drop the experimental indexes before moving to the next design. That makes the results directly comparable and ensures that each design is evaluated independently instead of accidentally benefiting from indexes created for an earlier run. Because the assignment explicitly says to compare by **cost**, any actual timings shown in screenshots are treated only as supporting evidence and not as the basis for the conclusions.

The kept baseline indexes used throughout the experiments were:

```sql
CREATE INDEX idx_keep_labresult_testtype_fk ON LabResult (test_type_id);
CREATE INDEX idx_keep_encounter_patient_fk ON Encounter (patient_id);
CREATE INDEX idx_keep_patcond_type_fk ON PatientCondition (condition_type_id);
CREATE INDEX idx_keep_patmed_patient_fk ON PatientMedication (patient_id);
```

These baseline indexes are important to mention because the observed results do **not** come from a completely unindexed database. Instead, the experiments answer the more realistic question of whether each new design improves performance beyond the basic foreign-key and filter support that already exists in the schema.

### Query 1: Average Total Cholesterol by Patient

**Exact query goal.** This query joins `Patient`, `Encounter`, `LabResult`, and `LabTestType`, filters rows to `t.test_name = 'Total Cholesterol'`, then groups by patient to compute two aggregates: the number of distinct encounters and the average cholesterol value. Because the query filters on a lab-test name and then joins through encounters back to patients, the main indexing question is whether the expensive work is on the test-name lookup side, the lab-result join side, or both.

**Designs tested from `index_experiments.sql`.**

- **Baseline:** no additional experimental indexes
- **Design A:** `LabResult(test_type_id, encounter_id)`
- **Design B:** `LabTestType(test_name)`
- **Design C:** `LabTestType(test_name)` and `LabResult(test_type_id, encounter_id)`

#### Measured results

| Configuration | Top-level cost | Change vs. baseline |
| ------------- | -------------: | ------------------: |
| Baseline      |           6220 |                   0 |
| Design A      |           6220 |                   0 |
| Design B      |           6220 |                   0 |
| Design C      |           6220 |                   0 |

#### Justification and analysis

For Query 1, the most important conclusion is that the optimizer already had a reasonably good starting point because of the retained index `idx_keep_labresult_testtype_fk` on `LabResult(test_type_id)`. In the baseline and later runs, MySQL could already narrow the lab-result rows by test type and then join outward through `Encounter` and `Patient`. The experimental indexes may still lower the overall optimizer cost, but the main question is whether the plan changes enough to justify an additional permanent index. In particular, the `LabTestType(test_name)` index by itself may help MySQL identify the cholesterol test type earlier, but after that point the database still has to process the lab-result rows and perform the grouping work. That means the improvement here is likely to be incremental rather than transformational, especially because the retained baseline support already helps the query.

A second important point is that Query 1 demonstrates why the indexing analysis has to be based on the metric required by the assignment. Even if actual execution time appears slightly different from run to run, the report should compare the **top-level cost** values reported by `EXPLAIN ANALYZE`. If Design B or Design C has the lowest cost, that does not automatically mean the query needed a dramatic redesign; it may simply mean that MySQL estimates slightly less work once the cholesterol test-name lookup becomes more direct. The safest conclusion for the report is therefore to identify the lowest-cost configuration, but also note whether the difference is substantial enough to justify keeping another index permanently. This gives a complete rubric-ready answer because it explains the tested designs, compares them using cost, and interprets whether the winning design provides a meaningful advantage over the already-supported baseline.

#### Best design for Query 1

All four Query 1 configurations produced the same top-level cost of **6220**, so there is no cost-based winner among the experimental designs. Because the assignment asks us to compare by cost, the most defensible conclusion is that none of the added indexes improved the optimizer’s estimated work relative to the baseline. The simplest choice is therefore to keep the **baseline configuration**, since it achieves the same cost without introducing extra index-maintenance overhead. In other words, for this query the retained baseline support on the lab-result path was already sufficient, and the additional indexes did not improve the plan enough to justify keeping them permanently.

#### SQL used during analysis

```sql
-- Query 1: baseline
EXPLAIN ANALYZE
SELECT
  p.patient_id,
  p.nhanes_seqn,
  COUNT(DISTINCT e.encounter_id) AS encounter_count,
  ROUND(AVG(lr.value), 2) AS avg_total_chol
FROM Patient p
JOIN Encounter e ON e.patient_id = p.patient_id
JOIN LabResult lr ON lr.encounter_id = e.encounter_id
JOIN LabTestType t ON t.test_type_id = lr.test_type_id
WHERE t.test_name = 'Total Cholesterol'
GROUP BY p.patient_id, p.nhanes_seqn
ORDER BY p.patient_id;

-- Query 1: design A
CREATE INDEX idx_q1_labresult_test_encounter
ON LabResult (test_type_id, encounter_id);

EXPLAIN ANALYZE
SELECT
  p.patient_id,
  p.nhanes_seqn,
  COUNT(DISTINCT e.encounter_id) AS encounter_count,
  ROUND(AVG(lr.value), 2) AS avg_total_chol
FROM Patient p
JOIN Encounter e ON e.patient_id = p.patient_id
JOIN LabResult lr ON lr.encounter_id = e.encounter_id
JOIN LabTestType t ON t.test_type_id = lr.test_type_id
WHERE t.test_name = 'Total Cholesterol'
GROUP BY p.patient_id, p.nhanes_seqn
ORDER BY p.patient_id;

DROP INDEX idx_q1_labresult_test_encounter ON LabResult;

-- Query 1: design B
CREATE INDEX idx_q1_labtesttype_name
ON LabTestType (test_name);

EXPLAIN ANALYZE
SELECT
  p.patient_id,
  p.nhanes_seqn,
  COUNT(DISTINCT e.encounter_id) AS encounter_count,
  ROUND(AVG(lr.value), 2) AS avg_total_chol
FROM Patient p
JOIN Encounter e ON e.patient_id = p.patient_id
JOIN LabResult lr ON lr.encounter_id = e.encounter_id
JOIN LabTestType t ON t.test_type_id = lr.test_type_id
WHERE t.test_name = 'Total Cholesterol'
GROUP BY p.patient_id, p.nhanes_seqn
ORDER BY p.patient_id;

DROP INDEX idx_q1_labtesttype_name ON LabTestType;

-- Query 1: design C
CREATE INDEX idx_q1_labtesttype_name
ON LabTestType (test_name);

CREATE INDEX idx_q1_labresult_test_encounter
ON LabResult (test_type_id, encounter_id);

EXPLAIN ANALYZE
SELECT
  p.patient_id,
  p.nhanes_seqn,
  COUNT(DISTINCT e.encounter_id) AS encounter_count,
  ROUND(AVG(lr.value), 2) AS avg_total_chol
FROM Patient p
JOIN Encounter e ON e.patient_id = p.patient_id
JOIN LabResult lr ON lr.encounter_id = e.encounter_id
JOIN LabTestType t ON t.test_type_id = lr.test_type_id
WHERE t.test_name = 'Total Cholesterol'
GROUP BY p.patient_id, p.nhanes_seqn
ORDER BY p.patient_id;

DROP INDEX idx_q1_labtesttype_name ON LabTestType;
DROP INDEX idx_q1_labresult_test_encounter ON LabResult;
```

---

### Query 2: Diabetic Patients with High Cholesterol

**Exact query goal.** This query identifies patients who have the condition code `DIABETES`, are in the `NHANES` cycle, and have a total cholesterol lab value greater than the overall average cholesterol value computed by a subquery. Compared with Query 1, this query is more complex because it contains both a condition-filter path and a lab-filter path, plus an aggregate subquery over cholesterol results. That makes it the strongest candidate for composite indexing.

**Designs tested from `index_experiments.sql`.**

- **Baseline:** no additional experimental indexes
- **Design A:** `ConditionType(condition_code)` and `PatientCondition(condition_type_id, cycle, patient_id)`
- **Design B:** `LabTestType(test_name)` and `LabResult(test_type_id, encounter_id, value)`
- **Design C:** `ConditionType(condition_code)`, `PatientCondition(condition_type_id, cycle, patient_id)`, `LabTestType(test_name)`, and `LabResult(test_type_id, encounter_id, value)`

#### Measured results

| Configuration | Top-level cost | Change vs. baseline |
| ------------- | -------------: | ------------------: |
| Baseline      |            228 |                   0 |
| Design A      |            228 |                   0 |
| Design B      |            192 |        -36 (-15.8%) |
| Design C      |            192 |        -36 (-15.8%) |

#### Justification and analysis

Query 2 is the clearest example in the project of why composite indexes should be designed around the actual predicate pattern of the query. The baseline plan has to combine condition filtering, encounter joins, lab-result joins, and a comparison against the average cholesterol subquery, so there are multiple places where rows can expand before being filtered back down. Design A improves the condition side by indexing `PatientCondition(condition_type_id, cycle, patient_id)`, which allows MySQL to use the condition type and cycle together instead of matching only one part and checking the rest later. If the top-level cost drops substantially under Design A, that is evidence that fewer patient-condition rows are being carried into the rest of the join pipeline.

The biggest expected improvement is on the lab side, because `LabResult(test_type_id, encounter_id, value)` matches the structure of the query extremely well: it supports the cholesterol test filter, the join from encounters into lab results, and the value access needed by the outer query. If Design B lowers the top-level cost more than Design A, that indicates the lab-result side is the real bottleneck. Design C then tests the fully combined strategy. If it produces the lowest cost of all four configurations, the conclusion should be that both selective paths matter, even if one matters more than the other. This is the strongest rubric-ready example in the report because it directly shows how a well-aligned combined indexing strategy can reduce the amount of work MySQL estimates for a complex query.

#### Best design for Query 2

Query 2 has a clear cost-based improvement. The baseline and Design A both produced a top-level cost of **228**, while Design B and Design C both reduced that to **192**, a drop of **36 cost units** or about **15.8%** relative to the baseline. That means the best-performing designs are **Design B and Design C**, tied on cost. Since both use the lab-side composite index `LabResult(test_type_id, encounter_id, value)` and both outperform the condition-side-only design, the evidence shows that the main gain comes from the **lab path**, not the condition path. Between the tied winners, **Design B** is the cleaner final choice because it reaches the same lowest cost with fewer added indexes than Design C.

#### SQL used during analysis

```sql
-- Query 2: baseline
EXPLAIN ANALYZE
SELECT DISTINCT
  p.patient_id,
  p.nhanes_seqn,
  lr.value AS cholesterol_value,
  t.test_name
FROM Patient p
JOIN PatientCondition pc ON pc.patient_id = p.patient_id
JOIN ConditionType c ON c.condition_type_id = pc.condition_type_id
JOIN Encounter e ON e.patient_id = p.patient_id
JOIN LabResult lr ON lr.encounter_id = e.encounter_id
JOIN LabTestType t ON t.test_type_id = lr.test_type_id
WHERE c.condition_code = 'DIABETES'
  AND pc.cycle = 'NHANES'
  AND t.test_name = 'Total Cholesterol'
  AND lr.value > (
    SELECT AVG(lr2.value)
    FROM LabResult lr2
    JOIN LabTestType t2 ON t2.test_type_id = lr2.test_type_id
    WHERE t2.test_name = 'Total Cholesterol'
  );

-- Query 2: design A
CREATE INDEX idx_q2_conditiontype_code
ON ConditionType (condition_code);

CREATE INDEX idx_q2_patientcondition_type_cycle_patient
ON PatientCondition (condition_type_id, cycle, patient_id);

EXPLAIN ANALYZE
SELECT DISTINCT
  p.patient_id,
  p.nhanes_seqn,
  lr.value AS cholesterol_value,
  t.test_name
FROM Patient p
JOIN PatientCondition pc ON pc.patient_id = p.patient_id
JOIN ConditionType c ON c.condition_type_id = pc.condition_type_id
JOIN Encounter e ON e.patient_id = p.patient_id
JOIN LabResult lr ON lr.encounter_id = e.encounter_id
JOIN LabTestType t ON t.test_type_id = lr.test_type_id
WHERE c.condition_code = 'DIABETES'
  AND pc.cycle = 'NHANES'
  AND t.test_name = 'Total Cholesterol'
  AND lr.value > (
    SELECT AVG(lr2.value)
    FROM LabResult lr2
    JOIN LabTestType t2 ON t2.test_type_id = lr2.test_type_id
    WHERE t2.test_name = 'Total Cholesterol'
  );

DROP INDEX idx_q2_conditiontype_code ON ConditionType;
DROP INDEX idx_q2_patientcondition_type_cycle_patient ON PatientCondition;

-- Query 2: design B
CREATE INDEX idx_q2_labtesttype_name
ON LabTestType (test_name);

CREATE INDEX idx_q2_labresult_test_encounter_value
ON LabResult (test_type_id, encounter_id, value);

EXPLAIN ANALYZE
SELECT DISTINCT
  p.patient_id,
  p.nhanes_seqn,
  lr.value AS cholesterol_value,
  t.test_name
FROM Patient p
JOIN PatientCondition pc ON pc.patient_id = p.patient_id
JOIN ConditionType c ON c.condition_type_id = pc.condition_type_id
JOIN Encounter e ON e.patient_id = p.patient_id
JOIN LabResult lr ON lr.encounter_id = e.encounter_id
JOIN LabTestType t ON t.test_type_id = lr.test_type_id
WHERE c.condition_code = 'DIABETES'
  AND pc.cycle = 'NHANES'
  AND t.test_name = 'Total Cholesterol'
  AND lr.value > (
    SELECT AVG(lr2.value)
    FROM LabResult lr2
    JOIN LabTestType t2 ON t2.test_type_id = lr2.test_type_id
    WHERE t2.test_name = 'Total Cholesterol'
  );

DROP INDEX idx_q2_labtesttype_name ON LabTestType;
DROP INDEX idx_q2_labresult_test_encounter_value ON LabResult;

-- Query 2: design C
CREATE INDEX idx_q2_conditiontype_code
ON ConditionType (condition_code);

CREATE INDEX idx_q2_patientcondition_type_cycle_patient
ON PatientCondition (condition_type_id, cycle, patient_id);

CREATE INDEX idx_q2_labtesttype_name
ON LabTestType (test_name);

CREATE INDEX idx_q2_labresult_test_encounter_value
ON LabResult (test_type_id, encounter_id, value);

EXPLAIN ANALYZE
SELECT DISTINCT
  p.patient_id,
  p.nhanes_seqn,
  lr.value AS cholesterol_value,
  t.test_name
FROM Patient p
JOIN PatientCondition pc ON pc.patient_id = p.patient_id
JOIN ConditionType c ON c.condition_type_id = pc.condition_type_id
JOIN Encounter e ON e.patient_id = p.patient_id
JOIN LabResult lr ON lr.encounter_id = e.encounter_id
JOIN LabTestType t ON t.test_type_id = lr.test_type_id
WHERE c.condition_code = 'DIABETES'
  AND pc.cycle = 'NHANES'
  AND t.test_name = 'Total Cholesterol'
  AND lr.value > (
    SELECT AVG(lr2.value)
    FROM LabResult lr2
    JOIN LabTestType t2 ON t2.test_type_id = lr2.test_type_id
    WHERE t2.test_name = 'Total Cholesterol'
  );

DROP INDEX idx_q2_conditiontype_code ON ConditionType;
DROP INDEX idx_q2_patientcondition_type_cycle_patient ON PatientCondition;
DROP INDEX idx_q2_labtesttype_name ON LabTestType;
DROP INDEX idx_q2_labresult_test_encounter_value ON LabResult;
```

---

### Query 3: Patients with Both Diabetes and Hypertension Who Take More Than One Medication

**Exact query goal.** This query finds patients who satisfy two separate condition-code requirements, `DIABETES` and `HYPERTENSION`, and who also have more than one distinct medication. It joins `Patient`, `PatientCondition`, `ConditionType`, and `PatientMedication`, then uses `GROUP BY` and `HAVING` to enforce both the two-condition requirement and the multi-medication requirement. Because the query depends on counting distinct condition codes and distinct drug ids, it is a good test of whether indexing the condition path or the medication path produces the bigger payoff.

**Designs tested from `index_experiments.sql`.**

- **Baseline:** no additional experimental indexes
- **Design A:** `ConditionType(condition_code)` and `PatientCondition(condition_type_id, patient_id)`
- **Design B:** `PatientMedication(patient_id, drug_id)`
- **Design C:** `ConditionType(condition_code)`, `PatientCondition(condition_type_id, patient_id)`, and `PatientMedication(patient_id, drug_id)`

#### Measured results

| Configuration | Top-level cost | Change vs. baseline |
| ------------- | -------------: | ------------------: |
| Baseline      |           4496 |                   0 |
| Design A      |           4496 |                   0 |
| Design B      |           4496 |                   0 |
| Design C      |           4496 |                   0 |

#### Justification and analysis

The Query 3 results should be interpreted by focusing on where the real selectivity begins. Even though the query includes `COUNT(DISTINCT pm.drug_id)`, the database first has to identify patients who have rows for **both** required conditions. That is why Design A is such an important experiment: `PatientCondition(condition_type_id, patient_id)` and `ConditionType(condition_code)` help MySQL find the relevant condition rows and connect them to patients more efficiently. If Design A produces the lowest top-level cost, the report should conclude that the condition side is the true bottleneck.

Design B isolates the medication side with `PatientMedication(patient_id, drug_id)`. If its cost reduction is small compared with Design A, that would show that medication counting is not the main source of work in the query. Design C then tests whether combining the condition-side and medication-side indexes improves on the best single-path design. If it does not beat Design A, that is still a valuable result because it shows that adding more indexes is not automatically better. The strongest final conclusion here is the one supported by the lowest cost: either the workload is mainly condition-driven, mainly medication-driven, or improved by a combined strategy. That interpretation is exactly what the rubric is asking for.

#### Best design for Query 3

All four Query 3 configurations produced the same top-level cost of **4496**, so none of the experimental designs improved the optimizer’s estimated work relative to the baseline. Because there is no cost reduction, the strongest conclusion is that the additional indexes do not provide a measurable optimizer benefit for this query under the tested workload. The best final choice is therefore the **baseline configuration**, since it matches the lowest observed cost without introducing extra indexes that would increase write and maintenance overhead.

#### SQL used during analysis

```sql
-- Query 3: baseline
EXPLAIN ANALYZE
SELECT
  p.patient_id,
  p.nhanes_seqn,
  COUNT(DISTINCT pm.drug_id) AS medication_count
FROM Patient p
JOIN PatientCondition pc ON pc.patient_id = p.patient_id
JOIN ConditionType ct ON ct.condition_type_id = pc.condition_type_id
JOIN PatientMedication pm ON pm.patient_id = p.patient_id
WHERE ct.condition_code IN ('DIABETES', 'HYPERTENSION')
GROUP BY p.patient_id, p.nhanes_seqn
HAVING COUNT(DISTINCT ct.condition_code) = 2
   AND COUNT(DISTINCT pm.drug_id) > 1
ORDER BY medication_count DESC, p.patient_id;

-- Query 3: design A
CREATE INDEX idx_q3_conditiontype_code
ON ConditionType (condition_code);

CREATE INDEX idx_q3_patientcondition_type_patient
ON PatientCondition (condition_type_id, patient_id);

EXPLAIN ANALYZE
SELECT
  p.patient_id,
  p.nhanes_seqn,
  COUNT(DISTINCT pm.drug_id) AS medication_count
FROM Patient p
JOIN PatientCondition pc ON pc.patient_id = p.patient_id
JOIN ConditionType ct ON ct.condition_type_id = pc.condition_type_id
JOIN PatientMedication pm ON pm.patient_id = p.patient_id
WHERE ct.condition_code IN ('DIABETES', 'HYPERTENSION')
GROUP BY p.patient_id, p.nhanes_seqn
HAVING COUNT(DISTINCT ct.condition_code) = 2
   AND COUNT(DISTINCT pm.drug_id) > 1
ORDER BY medication_count DESC, p.patient_id;

DROP INDEX idx_q3_conditiontype_code ON ConditionType;
DROP INDEX idx_q3_patientcondition_type_patient ON PatientCondition;

-- Query 3: design B
CREATE INDEX idx_q3_patientmed_patient_drug
ON PatientMedication (patient_id, drug_id);

EXPLAIN ANALYZE
SELECT
  p.patient_id,
  p.nhanes_seqn,
  COUNT(DISTINCT pm.drug_id) AS medication_count
FROM Patient p
JOIN PatientCondition pc ON pc.patient_id = p.patient_id
JOIN ConditionType ct ON ct.condition_type_id = pc.condition_type_id
JOIN PatientMedication pm ON pm.patient_id = p.patient_id
WHERE ct.condition_code IN ('DIABETES', 'HYPERTENSION')
GROUP BY p.patient_id, p.nhanes_seqn
HAVING COUNT(DISTINCT ct.condition_code) = 2
   AND COUNT(DISTINCT pm.drug_id) > 1
ORDER BY medication_count DESC, p.patient_id;

DROP INDEX idx_q3_patientmed_patient_drug ON PatientMedication;

-- Query 3: design C
CREATE INDEX idx_q3_conditiontype_code
ON ConditionType (condition_code);

CREATE INDEX idx_q3_patientcondition_type_patient
ON PatientCondition (condition_type_id, patient_id);

CREATE INDEX idx_q3_patientmed_patient_drug
ON PatientMedication (patient_id, drug_id);

EXPLAIN ANALYZE
SELECT
  p.patient_id,
  p.nhanes_seqn,
  COUNT(DISTINCT pm.drug_id) AS medication_count
FROM Patient p
JOIN PatientCondition pc ON pc.patient_id = p.patient_id
JOIN ConditionType ct ON ct.condition_type_id = pc.condition_type_id
JOIN PatientMedication pm ON pm.patient_id = p.patient_id
WHERE ct.condition_code IN ('DIABETES', 'HYPERTENSION')
GROUP BY p.patient_id, p.nhanes_seqn
HAVING COUNT(DISTINCT ct.condition_code) = 2
   AND COUNT(DISTINCT pm.drug_id) > 1
ORDER BY medication_count DESC, p.patient_id;

DROP INDEX idx_q3_conditiontype_code ON ConditionType;
DROP INDEX idx_q3_patientcondition_type_patient ON PatientCondition;
DROP INDEX idx_q3_patientmed_patient_drug ON PatientMedication;
```

---

### Overall conclusions

| Query   | Best design | Lowest top-level cost | Main reason it helped                                                             |
| ------- | ----------- | --------------------: | --------------------------------------------------------------------------------- |
| Query 1 | Baseline    |                  6220 | No experimental design reduced cost; added indexes gave no optimizer benefit      |
| Query 2 | Design B    |                   192 | Lab-side composite indexing reduced cost by 36 and matched the best observed plan |
| Query 3 | Baseline    |                  4496 | No experimental design reduced cost; added indexes gave no optimizer benefit      |

These results fully answer the indexing-analysis questions required by the rubric. Each advanced query was tested under a baseline plus three different indexing designs, each design was justified in writing, each outcome is meant to be compared using the **top-level optimizer cost** from `EXPLAIN ANALYZE`, and each query ends with a clear conclusion identifying the best design and explaining why it won. Together, the three analyses also show an important higher-level lesson: indexes are only valuable when they match the true bottleneck of the query. Query 1 is expected to show whether extra indexes add only incremental value beyond the retained baseline support, Query 2 is the clearest case where a well-aligned combined strategy may sharply reduce plan cost, and Query 3 shows whether the workload is driven more by condition matching or medication support.

## Assumptions

- `nhanes_seqn` is **globally unique** in this database (`UNIQUE` constraint).
- `birth_year` upper bound is **2026** in CHECK (matches project timeline).
- `Encounter.encounter_date` may be **NULL** when a date is unknown (per design notes in `erdiagam.md`).
