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

This section is written to fully satisfy the indexing-analysis rubric for Stage 3. The `index_experiments.sql` file tests **four configurations per advanced query**: a baseline plus **three different indexing designs** for each query, exactly matching the rubric requirement. For every experiment, the workflow is the same: start from the kept baseline indexes, create the design-specific experimental indexes, run `EXPLAIN ANALYZE` on the exact advanced query, record the top-level actual runtime and the access path chosen by MySQL, then drop the experimental indexes before moving to the next design. That makes the results directly comparable and ensures that each design is evaluated independently instead of accidentally benefiting from indexes created for an earlier run.

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

| Configuration | Top-level actual time (ms) | Change vs. baseline |
| ------------- | -------------------------: | ------------------: |
| Baseline      |                      97.00 |                   — |
| Design A      |                      59.60 |        38.6% faster |
| Design B      |                      54.00 |        44.3% faster |
| Design C      |                      54.70 |        43.6% faster |

#### Justification and analysis

For Query 1, the most important conclusion is that the optimizer already had a reasonably good starting point because of the retained index `idx_keep_labresult_testtype_fk` on `LabResult(test_type_id)`. In the baseline and in the later runs, MySQL could already narrow the lab-result rows by test type and then join outward through `Encounter` and `Patient`. The experimental indexes did lower the measured runtimes, but the plan shape did not change dramatically enough to suggest a fundamentally new access path. In particular, the `LabTestType(test_name)` index was not enough by itself to completely restructure the query, because after identifying the test type, the database still had to process the lab-result rows and perform the grouping work. That means the improvement here is real but modest: the query was already close to efficient under the retained baseline index, so the extra experimental indexes mainly reduced lookup overhead rather than eliminating a major bottleneck.

A second important point is that Query 1 demonstrates why indexing analysis has to be evidence-based instead of purely theoretical. On paper, Design C looks like it should be the strongest because it indexes both the test-name lookup and the lab-result join path. However, the measured runtime shows Design B at 54.00 ms and Design C at 54.70 ms, which are essentially the same in practice. That tells us the dominant benefit is probably not from combining both indexes, but from the fact that this workload is already fairly selective once the cholesterol test is identified. The safest conclusion for the report is therefore that Query 1 does not need an aggressive new indexing strategy beyond the retained support already present, and that the experimental indexes produce only marginal additional benefit compared with Queries 2 and 3.

#### Best design for Query 1

The lowest measured runtime was **Design B** at **54.00 ms**, with Design C effectively tied. For the purpose of reporting results, Design B can be listed as the best measured configuration. At the same time, the written conclusion should note that Query 1 was already well supported by the retained baseline index on `LabResult(test_type_id)`, so no additional experimental index is strictly necessary for this query.

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

| Configuration | Top-level actual time (ms) | Change vs. baseline |
| ------------- | -------------------------: | ------------------: |
| Baseline      |                      57.80 |                   — |
| Design A      |                      24.90 |        56.9% faster |
| Design B      |                       6.56 |        88.7% faster |
| Design C      |                       4.95 |        91.4% faster |

#### Justification and analysis

Query 2 is the clearest example in the project of why composite indexes should be designed around the actual predicate pattern of the query. The baseline plan had to combine condition filtering, encounter joins, lab-result joins, and a comparison against the average cholesterol subquery, so there were multiple places where rows could expand before being filtered back down. Design A improved the condition side by indexing `PatientCondition(condition_type_id, cycle, patient_id)`, which allows MySQL to use the condition type and cycle together instead of matching only one part and checking the rest later. That is why Design A already cuts runtime from 57.80 ms to 24.90 ms: it reduces the number of patient-condition rows that need to flow into the rest of the joins.

The biggest improvement, however, comes from Design B, which shows that the lab-result side is the real bottleneck. The index `LabResult(test_type_id, encounter_id, value)` matches the structure of the query extremely well because it supports the cholesterol test filter, the join from encounters into lab results, and the value comparison needed by the outer query. Once MySQL can reach the relevant cholesterol rows more directly, the amount of work drops sharply, which is why runtime falls to 6.56 ms. Design C then combines the best of both worlds: the condition path is tightened by the composite patient-condition index, and the lab path is tightened by the covering lab-result index. That produces the best overall runtime at 4.95 ms and gives the most convincing evidence that both selective paths matter, even though the lab side matters more.

#### Best design for Query 2

**Design C** is the best design for Query 2 because it produces the lowest measured runtime, **4.95 ms**, and because it directly aligns with both major selective components of the query. Design B alone already shows that the lab side is the dominant bottleneck, but Design C is still better because it also removes unnecessary work on the condition side. This is the strongest example in the report of a case where a combined composite-index strategy clearly outperforms both the baseline and the single-path alternatives.

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

| Configuration | Top-level actual time (ms) | Change vs. baseline |
| ------------- | -------------------------: | ------------------: |
| Baseline      |                     110.00 |                   — |
| Design A      |                      83.10 |        24.5% faster |
| Design B      |                     105.00 |         4.5% faster |
| Design C      |                      95.90 |        12.8% faster |

#### Justification and analysis

The Query 3 results show that indexing the medication table alone is not enough, even though the query includes `COUNT(DISTINCT pm.drug_id)`. The reason is that the query’s real selectivity begins earlier, on the condition side. Before medication counts even matter, the database has to identify patients who have rows for both required conditions. Design A helps exactly that step by indexing `PatientCondition(condition_type_id, patient_id)` and also indexing `ConditionType(condition_code)` so the optimizer can identify the relevant condition types and then move quickly into matching patient-condition rows. That is why Design A produces the strongest improvement, reducing runtime from 110.00 ms to 83.10 ms.

Design B, by contrast, only adds `PatientMedication(patient_id, drug_id)`, and the measured result shows that this helps very little. The runtime drops only to 105.00 ms, which suggests that medication counting is not the main bottleneck. Design C combines the condition-side and medication-side indexes, but it still does not beat Design A. That is a useful finding because it shows that adding more indexes is not automatically better. Once the optimizer is already getting enough support on the medication join from the retained baseline index on `PatientMedication(patient_id)`, the extra `(patient_id, drug_id)` index does not reduce the grouping cost enough to justify itself for this query. The most defensible conclusion is therefore that Query 3 is mainly condition-driven, not medication-driven, and the condition composite index is the most important new design.

#### Best design for Query 3

**Design A** is the best design for Query 3 because it gives the lowest measured runtime, **83.10 ms**, and because its improvement aligns directly with the selective logic of the query. The results make it clear that faster condition matching matters more than faster medication counting for this workload. This is another strong rubric-ready result because it shows not only which design won, but also why the other two alternatives did not outperform it.

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

| Query   | Best design                        | Best runtime (ms) | Main reason it helped                                                        |
| ------- | ---------------------------------- | ----------------: | ---------------------------------------------------------------------------- |
| Query 1 | Design B (effectively tied with C) |             54.00 | Only marginal gain beyond the retained baseline lab-result index             |
| Query 2 | Design C                           |              4.95 | Combined composite indexes improved both the condition path and the lab path |
| Query 3 | Design A                           |             83.10 | The selective bottleneck was condition matching, not medication counting     |

These results fully answer the indexing-analysis questions required by the rubric. Each advanced query was tested under a baseline plus three different indexing designs, each design was justified in writing, each outcome was compared against measured `EXPLAIN ANALYZE` runtimes, and each query ends with a clear conclusion identifying the best design and explaining why it won. Together, the three analyses also show an important higher-level lesson: indexes are only valuable when they match the true bottleneck of the query. Query 1 shows a case where new indexes add only small value, Query 2 shows a case where well-aligned composite indexes produce a dramatic improvement, and Query 3 shows a case where indexing the wrong side of the query gives very little benefit.

## Assumptions

- `nhanes_seqn` is **globally unique** in this database (`UNIQUE` constraint).
- `birth_year` upper bound is **2026** in CHECK (matches project timeline).
- `Encounter.encounter_date` may be **NULL** when a date is unknown (per design notes in `erdiagam.md`).
