export const CONDITION_CATALOG = [
  {
    code: 'DIABETES',
    name: 'Diabetes',
    aliases: ['diabetes', 'diabetic', 'diabetics', 'blood sugar'],
  },
  {
    code: 'HYPERTENSION',
    name: 'Hypertension',
    // users kept typing "hbp" and "high bp" so added those
    aliases: ['hypertension', 'hypertensive', 'high blood pressure', 'high bp', 'hbp'],
  },
];

export const LAB_CATALOG = [
  {
    name: 'Total Cholesterol',
    aliases: ['total cholesterol', 'cholesterol', 'tc'],
  },
  {
    name: 'LDL Cholesterol',
    aliases: ['ldl cholesterol', 'ldl', 'bad cholesterol'],
  },
  {
    name: 'Weight',
    aliases: ['weight', 'body weight'],
  },
  {
    name: 'Height',
    aliases: ['height'],
  },
  {
    name: 'Systolic BP',
    aliases: ['systolic bp', 'systolic blood pressure', 'systolic'],
  },
  {
    name: 'Diastolic BP',
    aliases: ['diastolic bp', 'diastolic blood pressure', 'diastolic'],
  },
];

export const METRIC_CATALOG = [
  {
    metric: 'patient_count',
    label: 'Patient count',
    terms: ['how many', 'count', 'number', 'patients', 'cohort'],
    table: 'Patient',
  },
  {
    metric: 'lab_stat',
    label: 'Lab statistic',
    terms: ['average', 'avg', 'mean', 'minimum', 'maximum', 'min', 'max', 'lab'],
    table: 'LabResult',
  },
  {
    metric: 'condition_distribution',
    label: 'Condition distribution',
    terms: ['condition distribution', 'conditions', 'diagnoses', 'breakdown'],
    table: 'PatientCondition',
  },
  {
    metric: 'top_medications',
    label: 'Top medications',
    terms: ['top medications', 'medications', 'drugs', 'prescriptions', 'medicine'],
    table: 'PatientMedication',
  },
];

export const EXAMPLE_PROMPTS = [
  'How many diabetic patients are there?',
  'How many patients have diabetes and hypertension?',
  'Average total cholesterol for diabetic patients',
  'Top medications for hypertensive patients',
  'Show condition distribution',
];

export const TABLE_CONTEXT = [
  {
    label: 'Patients and demographics',
    table: 'Patient',
    field: 'sex, birth_year',
    terms: ['patient', 'patients', 'sex', 'gender', 'birth year', 'born'],
  },
  {
    label: 'Patient conditions',
    table: 'PatientCondition',
    field: 'condition_type_id',
    terms: ['condition', 'conditions', 'diabetes', 'hypertension'],
  },
  {
    label: 'Condition catalog',
    table: 'ConditionType',
    field: 'condition_code, condition_name',
    terms: ['condition name', 'condition code', 'diagnosis'],
  },
  {
    label: 'Lab results',
    table: 'LabResult',
    field: 'value',
    terms: ['lab', 'labs', 'result', 'value', 'cholesterol', 'blood pressure'],
  },
  {
    label: 'Lab test catalog',
    table: 'LabTestType',
    field: 'test_name',
    terms: ['lab test', 'test name', 'ldl', 'weight', 'height'],
  },
  {
    label: 'Medication rows',
    table: 'PatientMedication',
    field: 'drug_id',
    terms: ['medication', 'medications', 'drug', 'prescription'],
  },
  {
    label: 'Drug catalog',
    table: 'Drug',
    field: 'drug_name',
    terms: ['drug name', 'medicine name'],
  },
];

export function normalizeText(value) {
  // strip punctuation and lowercase so matching isn't case sensitive
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function tokenize(value) {
  const normalized = normalizeText(value);
  if (!normalized) return [];
  return normalized.split(/\s+/).filter(Boolean);
}

export function normalizeCondition(value) {
  const text = normalizeText(value);
  if (!text) return null;

  return (
    CONDITION_CATALOG.find((condition) => {
      const code = normalizeText(condition.code);
      const name = normalizeText(condition.name);
      return (
        text === code ||
        text === name ||
        condition.aliases.some((alias) => text === normalizeText(alias))
      );
    }) || null
  );
}

export function normalizeLabTest(value) {
  const text = normalizeText(value);
  if (!text) return null;

  return (
    LAB_CATALOG.find((lab) => {
      const name = normalizeText(lab.name);
      return text === name || lab.aliases.some((alias) => text === normalizeText(alias));
    }) || null
  );
}

// inlined at call sites in resolver.js — keeping these here so imports don't break
export function contextForCondition(condition) {
  return { label: condition.name, table: 'ConditionType', field: 'condition_code' };
}

export function contextForLab(lab) {
  return { label: lab.name, table: 'LabTestType', field: 'test_name' };
}