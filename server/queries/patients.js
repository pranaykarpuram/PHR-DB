/**
 * Parameterized SQL for patient + lab routes.
 * Mirrors relational joins in sql/schema.sql; no ORM.
 */

export const SUBQUERY_COUNTS = `
  (SELECT COUNT(*) FROM LabResult lr
    INNER JOIN Encounter e ON e.encounter_id = lr.encounter_id
    WHERE e.patient_id = p.patient_id) AS lab_count,
  (SELECT COUNT(*) FROM PatientCondition pc WHERE pc.patient_id = p.patient_id) AS condition_count,
  (SELECT COUNT(*) FROM PatientMedication pm WHERE pm.patient_id = p.patient_id) AS medication_count,
  (SELECT COUNT(*) FROM Encounter enc WHERE enc.patient_id = p.patient_id) AS encounter_count
`;

export function buildPatientListQuery(filters) {
  const where = [];
  const params = [];

  if (filters.search) {
    where.push(`(
      CAST(p.nhanes_seqn AS CHAR) LIKE ?
      OR EXISTS (
        SELECT 1
        FROM PatientMedication pm_s
        INNER JOIN Drug d_s ON d_s.drug_id = pm_s.drug_id
        WHERE pm_s.patient_id = p.patient_id
          AND d_s.drug_name LIKE ?
      )
      OR EXISTS (
        SELECT 1
        FROM PatientCondition pc_s
        INNER JOIN ConditionType ct_s ON ct_s.condition_type_id = pc_s.condition_type_id
        WHERE pc_s.patient_id = p.patient_id
          AND (
            ct_s.condition_code LIKE ?
            OR ct_s.condition_name LIKE ?
          )
      )
    )`);
    const like = `%${String(filters.search).trim()}%`;
    params.push(like, like, like, like);
  }
  if (filters.sex) {
    where.push('p.sex = ?');
    params.push(filters.sex);
  }
  if (filters.birthYearMin != null) {
    where.push('p.birth_year >= ?');
    params.push(filters.birthYearMin);
  }
  if (filters.birthYearMax != null) {
    where.push('p.birth_year <= ?');
    params.push(filters.birthYearMax);
  }
  if (filters.conditionCode) {
    where.push(`EXISTS (
      SELECT 1 FROM PatientCondition pc
      INNER JOIN ConditionType ct ON ct.condition_type_id = pc.condition_type_id
      WHERE pc.patient_id = p.patient_id AND ct.condition_code = ?
    )`);
    params.push(filters.conditionCode);
  }

  // LIMIT/OFFSET as bound params can trigger ER_WRONG_ARGUMENTS with prepared statements;
  // values are capped and inlined as integers only.
  const limitInt = Math.max(
    1,
    Math.min(Number.parseInt(String(filters.limit), 10) || 200, 500)
  );
  const offsetInt = Math.max(0, Number.parseInt(String(filters.offset), 10) || 0);

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const sql = `
    SELECT
      p.patient_id,
      p.nhanes_seqn,
      p.birth_year,
      p.sex,
      ${SUBQUERY_COUNTS}
    FROM Patient p
    ${whereSql}
    ORDER BY p.patient_id
    LIMIT ${limitInt} OFFSET ${offsetInt}
  `;
  return { sql, params };
}

export const PATIENT_SUMMARY = `
  SELECT
    p.patient_id,
    p.nhanes_seqn,
    p.birth_year,
    p.sex,
    (SELECT COUNT(*) FROM LabResult lr
      INNER JOIN Encounter e ON e.encounter_id = lr.encounter_id
      WHERE e.patient_id = p.patient_id) AS lab_count,
    (SELECT COUNT(*) FROM PatientCondition pc WHERE pc.patient_id = p.patient_id) AS condition_count,
    (SELECT COUNT(*) FROM PatientMedication pm WHERE pm.patient_id = p.patient_id) AS medication_count,
    (SELECT COUNT(*) FROM Encounter enc WHERE enc.patient_id = p.patient_id) AS encounter_count
  FROM Patient p
  WHERE p.patient_id = ?
`;

export const PATIENT_ENCOUNTERS = `
  SELECT
    encounter_id,
    encounter_date,
    cycle,
    encounter_type
  FROM Encounter
  WHERE patient_id = ?
  ORDER BY encounter_id
`;

export const PATIENT_LABS_RESULTS = `
  SELECT
    lr.lab_result_id,
    lr.encounter_id,
    lr.test_type_id,
    tt.test_name,
    lr.value,
    COALESCE(lr.unit, tt.default_unit) AS unit,
    lr.result_time,
    e.cycle,
    e.encounter_date
  FROM LabResult lr
  INNER JOIN LabTestType tt ON tt.test_type_id = lr.test_type_id
  INNER JOIN Encounter e ON e.encounter_id = lr.encounter_id
  WHERE e.patient_id = ?
  ORDER BY lr.lab_result_id DESC
`;

export const PATIENT_LABS_LATEST = `
  SELECT test_name, value, unit, cycle
  FROM (
    SELECT
      tt.test_name,
      lr.value,
      COALESCE(lr.unit, tt.default_unit) AS unit,
      e.cycle,
      ROW_NUMBER() OVER (PARTITION BY tt.test_type_id ORDER BY lr.lab_result_id DESC) AS rn
    FROM LabResult lr
    INNER JOIN LabTestType tt ON tt.test_type_id = lr.test_type_id
    INNER JOIN Encounter e ON e.encounter_id = lr.encounter_id
    WHERE e.patient_id = ?
  ) t
  WHERE rn = 1
    AND test_name IN (
      'Total Cholesterol',
      'LDL Cholesterol',
      'Systolic BP',
      'Diastolic BP',
      'Height',
      'Weight'
    )
  ORDER BY test_name
`;

export const PATIENT_MEDICATIONS = `
  SELECT
    pm.patient_med_id,
    d.drug_name,
    pm.dosage,
    pm.start_date,
    pm.end_date
  FROM PatientMedication pm
  INNER JOIN Drug d ON d.drug_id = pm.drug_id
  WHERE pm.patient_id = ?
  ORDER BY pm.patient_med_id
`;

export const PATIENT_CONDITIONS = `
  SELECT
    pc.patient_condition_id,
    ct.condition_code,
    ct.condition_name,
    pc.status,
    pc.cycle
  FROM PatientCondition pc
  INNER JOIN ConditionType ct ON ct.condition_type_id = pc.condition_type_id
  WHERE pc.patient_id = ?
  ORDER BY pc.patient_condition_id
`;
