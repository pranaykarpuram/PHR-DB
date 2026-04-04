USE phr_db;


CREATE INDEX idx_keep_labresult_testtype_fk ON LabResult (test_type_id);
CREATE INDEX idx_keep_encounter_patient_fk ON Encounter (patient_id);
CREATE INDEX idx_keep_patcond_type_fk ON PatientCondition (condition_type_id);
CREATE INDEX idx_keep_patmed_patient_fk ON PatientMedication (patient_id);


-- QUERY 1: baseline
-- Average Total Cholesterol by Patient


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


-- QUERY 1: design A
-- Index lab-result join/filter path


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


-- QUERY 1: design B
-- Index test-name lookup


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


-- QUERY 1: design C
-- Combine lookup + lab-result path


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


-- QUERY 2: baseline
-- Diabetic Patients with High Cholesterol


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


-- QUERY 2: design A
-- Index condition filtering path


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


-- QUERY 2: design B
-- Index lab filtering path


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


-- QUERY 2: design C
-- Combine condition + lab paths


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


-- QUERY 3: baseline
-- Patients with Both Diabetes and Hypertension
-- Who Take More Than One Medication


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


-- QUERY 3: design A
-- Index condition filtering path


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


-- QUERY 3: design B
-- Index medication join/grouping path


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


-- QUERY 3: design C
-- Combine condition + medication paths


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