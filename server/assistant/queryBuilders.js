import {
  CONDITION_CATALOG,
  EXAMPLE_PROMPTS,
  LAB_CATALOG,
  normalizeCondition,
  normalizeLabTest,
} from './catalog.js';

const VALID_METRICS = new Set([
  'patient_count',
  'lab_stat',
  'condition_distribution',
  'top_medications',
]);
const VALID_STATS = new Set(['count', 'avg', 'min', 'max']);
const VALID_SEX = new Set(['M', 'F', 'O']);

function clampNumber(value, min, max) {
  const n = Number.parseInt(String(value), 10);
  if (Number.isNaN(n)) return undefined;
  return Math.max(min, Math.min(max, n));
}

function sqlPlaceholders(count) {
  return Array.from({ length: count }, () => '?').join(', ');
}

function normalizeControls(rawControls = {}) {
  const metric = VALID_METRICS.has(rawControls.metric) ? rawControls.metric : null;
  const statistic = VALID_STATS.has(rawControls.statistic) ? rawControls.statistic : 'avg';
  const conditions = Array.isArray(rawControls.conditions)
    ? rawControls.conditions
        .map((condition) => normalizeCondition(condition))
        .filter(Boolean)
        .map((condition) => condition.code)
    : [];
  const uniqueConditions = [...new Set(conditions)];
  const lab = normalizeLabTest(rawControls.labTest);
  const sex = VALID_SEX.has(rawControls.sex) ? rawControls.sex : undefined;
  const birthYearMin = clampNumber(rawControls.birthYearMin, 1900, 2026);
  const birthYearMax = clampNumber(rawControls.birthYearMax, 1900, 2026);
  const minYear =
    birthYearMin != null && birthYearMax != null
      ? Math.min(birthYearMin, birthYearMax)
      : birthYearMin;
  const maxYear =
    birthYearMin != null && birthYearMax != null
      ? Math.max(birthYearMin, birthYearMax)
      : birthYearMax;

  return {
    metric,
    statistic,
    conditions: uniqueConditions,
    conditionMode: rawControls.conditionMode === 'all' ? 'all' : 'any',
    labTest: lab?.name,
    sex,
    birthYearMin: minYear,
    birthYearMax: maxYear,
    limit: clampNumber(rawControls.limit, 1, 25) || 10,
  };
}

function conditionName(code) {
  return CONDITION_CATALOG.find((condition) => condition.code === code)?.name || code;
}

function cohortDescription(controls) {
  const parts = [];
  if (controls.conditions.length) {
    const names = controls.conditions.map(conditionName);
    parts.push(`with ${names.join(controls.conditionMode === 'all' ? ' and ' : ' or ')}`);
  }
  if (controls.sex) parts.push(`sex=${controls.sex}`);
  if (controls.birthYearMin != null && controls.birthYearMax != null) {
    parts.push(`born ${controls.birthYearMin}–${controls.birthYearMax}`);
  } else if (controls.birthYearMin != null) {
    parts.push(`born after ${controls.birthYearMin}`);
  } else if (controls.birthYearMax != null) {
    parts.push(`born before ${controls.birthYearMax}`);
  }
  return parts.length ? `patients ${parts.join(', ')}` : 'all patients';
}

function addPatientFilters(where, params, controls) {
  if (controls.sex) {
    where.push('p.sex = ?');
    params.push(controls.sex);
  }
  if (controls.birthYearMin != null) {
    where.push('p.birth_year >= ?');
    params.push(controls.birthYearMin);
  }
  if (controls.birthYearMax != null) {
    where.push('p.birth_year <= ?');
    params.push(controls.birthYearMax);
  }

  if (!controls.conditions.length) return;

  if (controls.conditionMode === 'all') {
    controls.conditions.forEach((code) => {
      where.push(`EXISTS (
        SELECT 1
        FROM PatientCondition pc_filter
        INNER JOIN ConditionType ct_filter
          ON ct_filter.condition_type_id = pc_filter.condition_type_id
        WHERE pc_filter.patient_id = p.patient_id
          AND ct_filter.condition_code = ?
      )`);
      params.push(code);
    });
    return;
  }

  where.push(`EXISTS (
    SELECT 1
    FROM PatientCondition pc_filter
    INNER JOIN ConditionType ct_filter
      ON ct_filter.condition_type_id = pc_filter.condition_type_id
    WHERE pc_filter.patient_id = p.patient_id
      AND ct_filter.condition_code IN (${sqlPlaceholders(controls.conditions.length)})
  )`);
  params.push(...controls.conditions);
}

function whereSql(where) {
  return where.length ? `WHERE ${where.join('\n    AND ')}` : '';
}

function buildPatientCount(controls) {
  const where = [];
  const params = [];
  addPatientFilters(where, params, controls);

  return {
    metric: 'patient_count',
    description: cohortDescription(controls),
    sql: `
      SELECT COUNT(DISTINCT p.patient_id) AS patient_count
      FROM Patient p
      ${whereSql(where)}
    `,
    params,
  };
}

function buildLabStat(controls) {
  if (!controls.labTest) {
    return {
      unsupported: true,
      reason: 'Choose a lab test or ask about one by name.',
    };
  }

  const where = ['tt.test_name = ?'];
  const params = [controls.labTest];
  addPatientFilters(where, params, controls);

  const aggregate =
    controls.statistic === 'count'
      ? 'COUNT(*)'
      : `${controls.statistic.toUpperCase()}(lr.value)`;

  return {
    metric: 'lab_stat',
    description: `${controls.statistic} ${controls.labTest} for ${cohortDescription(controls)}`,
    sql: `
      SELECT
        ROUND(${aggregate}, 2) AS value,
        COUNT(*) AS result_count,
        COUNT(DISTINCT p.patient_id) AS patient_count
      FROM Patient p
      INNER JOIN Encounter e ON e.patient_id = p.patient_id
      INNER JOIN LabResult lr ON lr.encounter_id = e.encounter_id
      INNER JOIN LabTestType tt ON tt.test_type_id = lr.test_type_id
      ${whereSql(where)}
    `,
    params,
  };
}

function buildConditionDistribution(controls) {
  const where = [];
  const params = [];
  addPatientFilters(where, params, controls);

  return {
    metric: 'condition_distribution',
    description: `condition distribution for ${cohortDescription(controls)}`,
    sql: `
      SELECT
        ct.condition_name,
        ct.condition_code,
        COUNT(DISTINCT p.patient_id) AS patient_count
      FROM Patient p
      INNER JOIN PatientCondition pc ON pc.patient_id = p.patient_id
      INNER JOIN ConditionType ct ON ct.condition_type_id = pc.condition_type_id
      ${whereSql(where)}
      GROUP BY ct.condition_type_id, ct.condition_name, ct.condition_code
      ORDER BY patient_count DESC, ct.condition_name
    `,
    params,
  };
}

function buildTopMedications(controls) {
  const where = [];
  const params = [];
  addPatientFilters(where, params, controls);
  const limit = controls.limit;

  return {
    metric: 'top_medications',
    description: `top ${limit} medications for ${cohortDescription(controls)}`,
    sql: `
      SELECT
        d.drug_name,
        COUNT(*) AS prescription_count,
        COUNT(DISTINCT p.patient_id) AS patient_count
      FROM Patient p
      INNER JOIN PatientMedication pm ON pm.patient_id = p.patient_id
      INNER JOIN Drug d ON d.drug_id = pm.drug_id
      ${whereSql(where)}
      GROUP BY d.drug_id, d.drug_name
      ORDER BY prescription_count DESC, d.drug_name
      LIMIT ${limit}
    `,
    params,
  };
}

export function buildQuery(rawControls = {}) {
  const controls = normalizeControls(rawControls);
  if (!controls.metric) {
    return {
      unsupported: true,
      metric: 'unsupported',
      reason: 'I could not match that to a supported analytics metric.',
      suggestions: EXAMPLE_PROMPTS,
    };
  }

  if (controls.metric === 'patient_count') return { ...buildPatientCount(controls), controls };
  if (controls.metric === 'lab_stat') return { ...buildLabStat(controls), controls };
  if (controls.metric === 'condition_distribution') {
    return { ...buildConditionDistribution(controls), controls };
  }
  if (controls.metric === 'top_medications') return { ...buildTopMedications(controls), controls };

  return {
    unsupported: true,
    metric: 'unsupported',
    reason: 'I could not match that to a supported analytics metric.',
    suggestions: EXAMPLE_PROMPTS,
  };
}

export function getCatalogOptions() {
  return {
    conditions: CONDITION_CATALOG.map((condition) => ({
      code: condition.code,
      name: condition.name,
    })),
    labs: LAB_CATALOG.map((lab) => lab.name),
  };
}