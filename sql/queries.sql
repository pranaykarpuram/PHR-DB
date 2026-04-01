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
ORDER BY p.patient_id;

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
  );

-- lab counts by cycle + union total
SELECT cycle, lab_result_rows
FROM (
  SELECT e.cycle, COUNT(*) AS lab_result_rows
  FROM LabResult lr
  JOIN Encounter e ON e.encounter_id = lr.encounter_id
  WHERE e.cycle IN ('2015-2016', '2017-2018')
  GROUP BY e.cycle
) AS by_cycle
UNION
SELECT 'ALL_CYCLES' AS cycle, COUNT(*) AS lab_result_rows
FROM LabResult
ORDER BY cycle;
