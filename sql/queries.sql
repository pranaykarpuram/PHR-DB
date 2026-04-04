-- demo queries for writeup / explain
USE phr_db;

-- avg total chol by patient
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
ORDER BY p.patient_id
LIMIT 15;

-- diabetics w high chol vs cohort avg (subquery)
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
  )
LIMIT 15;

-- patients with both diabetes and hypertension who take more than one medication.
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
ORDER BY medication_count DESC, p.patient_id
LIMIT 15;
