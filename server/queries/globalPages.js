/**
 * Cohort-level queries for Labs / Medications / Conditions sidebar pages.
 * LIMIT values are inlined as integers after clamping (prepared LIMIT issues).
 */

export function clampLimit(raw, fallback = 150, cap = 400) {
  const n = Number.parseInt(String(raw), 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(1, Math.min(n, cap));
}

export const LABS_SUMMARY = `
  SELECT
    (SELECT COUNT(*) FROM LabResult) AS total_results,
    (SELECT COUNT(DISTINCT lr.test_type_id) FROM LabResult lr) AS distinct_test_types,
    (SELECT COUNT(DISTINCT e.patient_id)
      FROM LabResult lr
      INNER JOIN Encounter e ON e.encounter_id = lr.encounter_id) AS patients_with_labs
`;

export const LABS_BY_TEST = `
  SELECT tt.test_name, COUNT(*) AS count
  FROM LabResult lr
  INNER JOIN LabTestType tt ON tt.test_type_id = lr.test_type_id
  GROUP BY tt.test_name
  ORDER BY count DESC
`;

export function sqlLabsRecent(limitInt) {
  return `
    SELECT
      lr.lab_result_id,
      p.patient_id,
      p.nhanes_seqn,
      tt.test_name,
      lr.value,
      COALESCE(lr.unit, tt.default_unit) AS unit,
      e.cycle,
      e.encounter_date,
      lr.result_time
    FROM LabResult lr
    INNER JOIN LabTestType tt ON tt.test_type_id = lr.test_type_id
    INNER JOIN Encounter e ON e.encounter_id = lr.encounter_id
    INNER JOIN Patient p ON p.patient_id = e.patient_id
    ORDER BY lr.lab_result_id DESC
    LIMIT ${limitInt}
  `;
}

export const MEDS_SUMMARY = `
  SELECT
    (SELECT COUNT(*) FROM PatientMedication) AS total_prescriptions,
    (SELECT COUNT(DISTINCT drug_id) FROM PatientMedication) AS distinct_drugs,
    (SELECT COUNT(DISTINCT patient_id) FROM PatientMedication) AS patients_with_meds
`;

export const MEDS_TOP_DRUGS = `
  SELECT d.drug_name, COUNT(*) AS prescription_count
  FROM PatientMedication pm
  INNER JOIN Drug d ON d.drug_id = pm.drug_id
  GROUP BY d.drug_id, d.drug_name
  ORDER BY prescription_count DESC
  LIMIT 25
`;

export function sqlMedsRecent(limitInt) {
  return `
    SELECT
      pm.patient_med_id,
      p.patient_id,
      p.nhanes_seqn,
      d.drug_name,
      pm.dosage,
      pm.start_date,
      pm.end_date
    FROM PatientMedication pm
    INNER JOIN Drug d ON d.drug_id = pm.drug_id
    INNER JOIN Patient p ON p.patient_id = pm.patient_id
    ORDER BY pm.patient_med_id DESC
    LIMIT ${limitInt}
  `;
}

export const COND_SUMMARY = `
  SELECT
    (SELECT COUNT(*) FROM PatientCondition) AS total_rows,
    (SELECT COUNT(DISTINCT condition_type_id) FROM PatientCondition) AS distinct_condition_types,
    (SELECT COUNT(DISTINCT patient_id) FROM PatientCondition) AS patients_with_conditions
`;

export const COND_BY_NAME = `
  SELECT ct.condition_name, ct.condition_code, COUNT(*) AS count
  FROM PatientCondition pc
  INNER JOIN ConditionType ct ON ct.condition_type_id = pc.condition_type_id
  GROUP BY ct.condition_type_id, ct.condition_name, ct.condition_code
  ORDER BY count DESC
`;

export function sqlCondRecent(limitInt) {
  return `
    SELECT
      pc.patient_condition_id,
      p.patient_id,
      p.nhanes_seqn,
      ct.condition_code,
      ct.condition_name,
      pc.status,
      pc.cycle
    FROM PatientCondition pc
    INNER JOIN ConditionType ct ON ct.condition_type_id = pc.condition_type_id
    INNER JOIN Patient p ON p.patient_id = pc.patient_id
    ORDER BY pc.patient_condition_id DESC
    LIMIT ${limitInt}
  `;
}
