-- staging -> real tables (run after inserts into staging_*)
USE phr_db;

INSERT IGNORE INTO UserAccount (user_id, name, email)
VALUES (1, 'NHANES Import', 'nhanes-import@local');

INSERT INTO LabTestType (test_name, default_unit)
SELECT v.test_name, v.default_unit
FROM (
  SELECT 'Total Cholesterol' AS test_name, 'mg/dL' AS default_unit
  UNION ALL SELECT 'LDL Cholesterol', 'mg/dL'
  UNION ALL SELECT 'Weight', 'kg'
  UNION ALL SELECT 'Height', 'cm'
  UNION ALL SELECT 'Systolic BP', 'mmHg'
  UNION ALL SELECT 'Diastolic BP', 'mmHg'
) AS v
WHERE NOT EXISTS (
  SELECT 1 FROM LabTestType t WHERE t.test_name = v.test_name
);

INSERT INTO ConditionType (condition_code, condition_name)
SELECT v.condition_code, v.condition_name
FROM (
  SELECT 'DIABETES' AS condition_code, 'Diabetes' AS condition_name
  UNION ALL SELECT 'HYPERTENSION', 'Hypertension'
) AS v
WHERE NOT EXISTS (
  SELECT 1 FROM ConditionType c WHERE c.condition_code = v.condition_code
);

INSERT INTO Patient (user_id, nhanes_seqn, birth_year, sex)
SELECT
  1,
  d.SEQN,
  2023 - MAX(d.RIDAGEYR),
  ANY_VALUE(
    CASE d.RIAGENDR
      WHEN 1 THEN 'M'
      WHEN 2 THEN 'F'
      ELSE 'O'
    END
  )
FROM staging_demographic d
WHERE d.SEQN IS NOT NULL
  AND d.RIDAGEYR IS NOT NULL
  AND (2023 - d.RIDAGEYR) BETWEEN 1900 AND 2026
GROUP BY d.SEQN;

INSERT INTO Encounter (patient_id, encounter_date, cycle, encounter_type)
SELECT
  p.patient_id,
  NULL,
  CAST(MAX(d.SDDSRVYR) AS CHAR),
  'NHANES'
FROM staging_demographic d
JOIN Patient p ON p.nhanes_seqn = d.SEQN
WHERE d.SEQN IS NOT NULL
GROUP BY p.patient_id;

INSERT INTO LabResult (encounter_id, test_type_id, value, unit, result_time)
SELECT
  e.encounter_id,
  tt.test_type_id,
  l.LBXTC,
  NULL,
  NULL
FROM staging_labs l
JOIN Patient p ON p.nhanes_seqn = l.SEQN
JOIN Encounter e ON e.patient_id = p.patient_id
JOIN LabTestType tt ON tt.test_name = 'Total Cholesterol'
WHERE l.LBXTC IS NOT NULL;

INSERT INTO LabResult (encounter_id, test_type_id, value, unit, result_time)
SELECT
  e.encounter_id,
  tt.test_type_id,
  l.LBDLDL,
  NULL,
  NULL
FROM staging_labs l
JOIN Patient p ON p.nhanes_seqn = l.SEQN
JOIN Encounter e ON e.patient_id = p.patient_id
JOIN LabTestType tt ON tt.test_name = 'LDL Cholesterol'
WHERE l.LBDLDL IS NOT NULL;

INSERT INTO LabResult (encounter_id, test_type_id, value, unit, result_time)
SELECT
  e.encounter_id,
  tt.test_type_id,
  x.BMXWT,
  NULL,
  NULL
FROM staging_examination x
JOIN Patient p ON p.nhanes_seqn = x.SEQN
JOIN Encounter e ON e.patient_id = p.patient_id
JOIN LabTestType tt ON tt.test_name = 'Weight'
WHERE x.BMXWT IS NOT NULL;

INSERT INTO LabResult (encounter_id, test_type_id, value, unit, result_time)
SELECT
  e.encounter_id,
  tt.test_type_id,
  x.BMXHT,
  NULL,
  NULL
FROM staging_examination x
JOIN Patient p ON p.nhanes_seqn = x.SEQN
JOIN Encounter e ON e.patient_id = p.patient_id
JOIN LabTestType tt ON tt.test_name = 'Height'
WHERE x.BMXHT IS NOT NULL;

INSERT INTO LabResult (encounter_id, test_type_id, value, unit, result_time)
SELECT
  e.encounter_id,
  tt.test_type_id,
  x.BPXSY1,
  NULL,
  NULL
FROM staging_examination x
JOIN Patient p ON p.nhanes_seqn = x.SEQN
JOIN Encounter e ON e.patient_id = p.patient_id
JOIN LabTestType tt ON tt.test_name = 'Systolic BP'
WHERE x.BPXSY1 IS NOT NULL;

INSERT INTO LabResult (encounter_id, test_type_id, value, unit, result_time)
SELECT
  e.encounter_id,
  tt.test_type_id,
  x.BPXDI1,
  NULL,
  NULL
FROM staging_examination x
JOIN Patient p ON p.nhanes_seqn = x.SEQN
JOIN Encounter e ON e.patient_id = p.patient_id
JOIN LabTestType tt ON tt.test_name = 'Diastolic BP'
WHERE x.BPXDI1 IS NOT NULL;

INSERT INTO PatientCondition (patient_id, condition_type_id, status, cycle)
SELECT DISTINCT
  p.patient_id,
  ct.condition_type_id,
  'reported',
  'NHANES'
FROM staging_questionnaire q
JOIN Patient p ON p.nhanes_seqn = q.SEQN
JOIN ConditionType ct ON ct.condition_code = 'DIABETES'
WHERE q.DIQ010 IS NOT NULL;

INSERT INTO PatientCondition (patient_id, condition_type_id, status, cycle)
SELECT DISTINCT
  p.patient_id,
  ct.condition_type_id,
  'reported',
  'NHANES'
FROM staging_questionnaire q
JOIN Patient p ON p.nhanes_seqn = q.SEQN
JOIN ConditionType ct ON ct.condition_code = 'HYPERTENSION'
WHERE q.BPQ020 IS NOT NULL;

INSERT INTO Drug (drug_name)
SELECT DISTINCT TRIM(m.RXDDRUG)
FROM staging_medications m
WHERE m.RXDDRUG IS NOT NULL
  AND TRIM(m.RXDDRUG) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM Drug d WHERE d.drug_name = TRIM(m.RXDDRUG)
  );

INSERT INTO PatientMedication (patient_id, drug_id, dosage, start_date, end_date)
SELECT DISTINCT
  p.patient_id,
  d.drug_id,
  NULL,
  NULL,
  NULL
FROM staging_medications m
JOIN Patient p ON p.nhanes_seqn = m.SEQN
JOIN Drug d ON d.drug_name = TRIM(m.RXDDRUG)
WHERE m.RXDDRUG IS NOT NULL
  AND TRIM(m.RXDDRUG) <> '';
