/** Types aligned with /api/patients and /api/analytics (MySQL schema). */

export interface PatientListItem {
  patient_id: number;
  nhanes_seqn: number;
  birth_year: number;
  sex: 'M' | 'F' | 'O';
  lab_count: number;
  condition_count: number;
  medication_count: number;
  encounter_count: number;
}

export interface EncounterRow {
  encounter_id: number;
  encounter_date: string | null;
  cycle: string;
  encounter_type: string;
}

export interface LabLatestRow {
  test_name: string;
  value: number;
  unit: string | null;
  cycle: string;
}

export interface LabResultRow {
  lab_result_id: number;
  encounter_id: number;
  test_type_id: number;
  test_name: string;
  value: number;
  unit: string | null;
  result_time: string | null;
  cycle: string;
  encounter_date: string | null;
}

export interface LabsResponse {
  latestByTest: LabLatestRow[];
  results: LabResultRow[];
}

export interface MedicationRow {
  patient_med_id: number;
  drug_name: string;
  dosage: string | null;
  start_date: string | null;
  end_date: string | null;
}

export interface ConditionRow {
  patient_condition_id: number;
  condition_code: string;
  condition_name: string;
  status: string | null;
  cycle: string;
}

export interface AnalyticsOverview {
  summary: {
    patient_count: number;
    encounter_count: number;
    lab_result_count: number;
    medication_count: number;
    condition_count: number;
  };
  overallAvgTotalCholesterol: number | null;
  avgCholesterol: {
    patient_id: number;
    nhanes_seqn: number;
    avg_total_cholesterol: number | null;
  }[];
  labDistribution: { test_name: string; count: number }[];
  sexDistribution: { sex: string; count: number }[];
  conditionDistribution: { condition_name: string; count: number }[];
  cycleDistribution: { cycle: string; count: number }[];
}

/** Card order matches LabTestType names from transform.sql */
export const LAB_SUMMARY_ORDER = [
  'Total Cholesterol',
  'LDL Cholesterol',
  'Systolic BP',
  'Diastolic BP',
  'Height',
  'Weight',
] as const;

export interface LabsOverview {
  summary: {
    total_results: number;
    distinct_test_types: number;
    patients_with_labs: number;
  };
  byTest: { test_name: string; count: number }[];
  recent: {
    lab_result_id: number;
    patient_id: number;
    nhanes_seqn: number;
    test_name: string;
    value: number | null;
    unit: string | null;
    cycle: string;
    encounter_date: string | null;
    result_time: string | null;
  }[];
}

export interface MedicationsOverview {
  summary: {
    total_prescriptions: number;
    distinct_drugs: number;
    patients_with_meds: number;
  };
  topDrugs: { drug_name: string; prescription_count: number }[];
  recent: {
    patient_med_id: number;
    patient_id: number;
    nhanes_seqn: number;
    drug_name: string;
    dosage: string | null;
    start_date: string | null;
    end_date: string | null;
  }[];
}

export interface ConditionsOverview {
  summary: {
    total_rows: number;
    distinct_condition_types: number;
    patients_with_conditions: number;
  };
  byCondition: {
    condition_name: string;
    condition_code: string;
    count: number;
  }[];
  recent: {
    patient_condition_id: number;
    patient_id: number;
    nhanes_seqn: number;
    condition_code: string;
    condition_name: string;
    status: string | null;
    cycle: string;
  }[];
}
