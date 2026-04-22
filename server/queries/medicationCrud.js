export const FIND_DRUG_BY_NAME = `
  SELECT drug_id
  FROM Drug
  WHERE drug_name = ?
  LIMIT 1
`;

export const INSERT_DRUG = `
  INSERT INTO Drug (drug_name)
  VALUES (?)
`;

export const INSERT_PATIENT_MEDICATION = `
  INSERT INTO PatientMedication (
    patient_id,
    drug_id,
    dosage,
    start_date,
    end_date
  )
  VALUES (?, ?, ?, ?, ?)
`;

export const GET_PATIENT_MEDICATION_BY_ID = `
  SELECT
    pm.patient_med_id,
    pm.patient_id,
    p.nhanes_seqn,
    pm.drug_id,
    d.drug_name,
    pm.dosage,
    pm.start_date,
    pm.end_date
  FROM PatientMedication pm
  INNER JOIN Patient p ON p.patient_id = pm.patient_id
  INNER JOIN Drug d ON d.drug_id = pm.drug_id
  WHERE pm.patient_med_id = ?
`;

export const UPDATE_PATIENT_MEDICATION = `
  UPDATE PatientMedication
  SET
    drug_id = ?,
    dosage = ?,
    start_date = ?,
    end_date = ?
  WHERE patient_med_id = ?
`;

export const DELETE_PATIENT_MEDICATION = `
  DELETE FROM PatientMedication
  WHERE patient_med_id = ?
`;
