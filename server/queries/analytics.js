/**
 * Aggregates for /api/analytics/overview (matches patterns in sql/queries.sql).
 */

export const SUMMARY_COUNTS = `
  SELECT
    (SELECT COUNT(*) FROM Patient) AS patient_count,
    (SELECT COUNT(*) FROM Encounter) AS encounter_count,
    (SELECT COUNT(*) FROM LabResult) AS lab_result_count,
    (SELECT COUNT(*) FROM PatientMedication) AS medication_count,
    (SELECT COUNT(*) FROM PatientCondition) AS condition_count
`;

export const AVG_CHOLESTEROL_PER_PATIENT = `
  SELECT
    p.patient_id,
    p.nhanes_seqn,
    ROUND(AVG(lr.value), 2) AS avg_total_cholesterol
  FROM Patient p
  INNER JOIN Encounter e ON e.patient_id = p.patient_id
  INNER JOIN LabResult lr ON lr.encounter_id = e.encounter_id
  INNER JOIN LabTestType t ON t.test_type_id = lr.test_type_id
  WHERE t.test_name = 'Total Cholesterol'
  GROUP BY p.patient_id, p.nhanes_seqn
  ORDER BY p.patient_id
`;

export const LAB_DISTRIBUTION = `
  SELECT tt.test_name, COUNT(*) AS count
  FROM LabResult lr
  INNER JOIN LabTestType tt ON tt.test_type_id = lr.test_type_id
  GROUP BY tt.test_name
  ORDER BY count DESC
`;

export const SEX_DISTRIBUTION = `
  SELECT sex, COUNT(*) AS count
  FROM Patient
  GROUP BY sex
  ORDER BY sex
`;

export const CONDITION_DISTRIBUTION = `
  SELECT ct.condition_name, COUNT(*) AS count
  FROM PatientCondition pc
  INNER JOIN ConditionType ct ON ct.condition_type_id = pc.condition_type_id
  GROUP BY ct.condition_name
  ORDER BY count DESC
`;

export const CYCLE_DISTRIBUTION = `
  SELECT cycle, COUNT(*) AS count
  FROM Encounter
  GROUP BY cycle
  ORDER BY count DESC
`;

export const OVERALL_AVG_TOTAL_CHOL = `
  SELECT ROUND(AVG(lr.value), 2) AS avg_total_cholesterol
  FROM LabResult lr
  INNER JOIN LabTestType t ON t.test_type_id = lr.test_type_id
  WHERE t.test_name = 'Total Cholesterol'
`;
