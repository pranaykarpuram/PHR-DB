import {
  CONDITION_CATALOG,
  EXAMPLE_PROMPTS,
  LAB_CATALOG,
  METRIC_CATALOG,
  TABLE_CONTEXT,
  contextForCondition,
  contextForLab,
  normalizeCondition,
  normalizeLabTest,
  normalizeText,
  tokenize,
} from './catalog.js';

const UNSUPPORTED_TERMS = [
  'predict',
  'prediction',
  'risk',
  'diagnose',
  'recommend',
  'treatment',
  'should',
  'future',
];

function hasPhrase(text, phrase) {
  return normalizeText(text).includes(normalizeText(phrase));
}

function scoreEntry(questionTokens, terms) {
  const tokenSet = new Set(questionTokens);
  return terms.reduce((score, term) => {
    const normalized = normalizeText(term);
    const termTokens = tokenize(normalized);
    const overlap = termTokens.filter((token) => tokenSet.has(token)).length;
    return score + overlap + (termTokens.length > 1 && hasPhrase(questionTokens.join(' '), normalized) ? 2 : 0);
  }, 0);
}

function uniqueBy(items, getKey) {
  const seen = new Set();
  // dedup by composite key so the same table+field doesn't show twice
  return items.filter((item) => {
    const k = getKey(item);
    return seen.has(k) ? false : !!seen.add(k);
  });
}

function findConditions(question) {
  const text = normalizeText(question);
  return CONDITION_CATALOG.filter((condition) => {
    if (hasPhrase(text, condition.code) || hasPhrase(text, condition.name)) return true;
    return condition.aliases.some((alias) => hasPhrase(text, alias));
  });
}

function findLab(question) {
  const text = normalizeText(question);
  const matches = LAB_CATALOG.filter((lab) => {
    if (hasPhrase(text, lab.name)) return true;
    return lab.aliases.some((alias) => hasPhrase(text, alias));
  });
  return matches[0] || null;
}

function findSex(question) {
  const tokens = new Set(tokenize(question));
  if (tokens.has('male') || tokens.has('men') || tokens.has('man')) return 'M';
  if (tokens.has('female') || tokens.has('women') || tokens.has('woman')) return 'F';
  if (tokens.has('other') || tokens.has('nonbinary') || tokens.has('non')) return 'O';
  return undefined;
}

function findBirthYears(question) {
  const text = normalizeText(question);
  const years = [...text.matchAll(/\b(19\d{2}|20[01]\d|202[0-6])\b/g)].map((match) =>
    Number(match[1])
  );

  if (!years.length) return {};
  if (text.includes('after') || text.includes('since') || text.includes('older than')) {
    return { birthYearMin: years[0] };
  }
  if (text.includes('before') || text.includes('until') || text.includes('younger than')) {
    return { birthYearMax: years[0] };
  }
  if (years.length >= 2) {
    return {
      birthYearMin: Math.min(years[0], years[1]),
      birthYearMax: Math.max(years[0], years[1]),
    };
  }
  return {};
}

function findStatistic(question) {
  const tokens = new Set(tokenize(question));
  if (tokens.has('min') || tokens.has('minimum') || tokens.has('lowest')) return 'min';
  if (tokens.has('max') || tokens.has('maximum') || tokens.has('highest')) return 'max';
  if (tokens.has('count') || tokens.has('number')) return 'count';
  // default to avg if nothing explicit found
  return 'avg';
}

function findMetric(question, lab, conditions) {
  const text = normalizeText(question);
  const tokens = tokenize(text);

  if (
    text.includes('top medication') ||
    text.includes('top drug') ||
    tokens.includes('medications') ||
    tokens.includes('drugs') ||
    tokens.includes('prescriptions')
  ) {
    return 'top_medications';
  }

  if (
    text.includes('condition distribution') ||
    text.includes('condition breakdown') ||
    (tokens.includes('distribution') && tokens.includes('condition'))
  ) {
    return 'condition_distribution';
  }

  if (lab || tokens.some((token) => ['average', 'avg', 'mean', 'minimum', 'maximum', 'min', 'max'].includes(token))) {
    return 'lab_stat';
  }

  if (
    tokens.includes('patients') ||
    tokens.includes('patient') ||
    tokens.includes('count') ||
    text.includes('how many') ||
    conditions.length > 0
  ) {
    return 'patient_count';
  }

  const scored = METRIC_CATALOG.map((entry) => ({
    metric: entry.metric,
    score: scoreEntry(tokens, entry.terms),
  })).sort((a, b) => b.score - a.score);
  return scored[0]?.score > 0 ? scored[0].metric : null;
}

export function matchedContextForControls(controls = {}) {
  const context = [];
  const metric = METRIC_CATALOG.find((entry) => entry.metric === controls.metric);
  if (metric) {
    context.push({ label: metric.label, table: metric.table });
  }

  (controls.conditions || [])
    .map((condition) => normalizeCondition(condition))
    .filter(Boolean)
    .forEach((condition) => context.push(contextForCondition(condition)));

  const lab = normalizeLabTest(controls.labTest);
  if (lab) context.push(contextForLab(lab));

  if (controls.sex) {
    context.push({ label: `Sex ${controls.sex}`, table: 'Patient', field: 'sex' });
  }
  if (controls.birthYearMin || controls.birthYearMax) {
    context.push({ label: 'Birth year range', table: 'Patient', field: 'birth_year' });
  }

  return uniqueBy(context, (item) => `${item.table}:${item.field || ''}:${item.label}`);
}

export function resolveQuestion(question) {
  const text = normalizeText(question);
  const tokens = tokenize(text);
  const unsupported = UNSUPPORTED_TERMS.some((term) => tokens.includes(term));

  const conditions = findConditions(text);
  const lab = findLab(text);
  const metric = findMetric(text, lab, conditions);
  const statistic = findStatistic(text);
  // "and" means they want patients with ALL of these, otherwise match any
  const conditionMode = text.includes(' and ') || tokens.includes('both') ? 'all' : 'any';

  const tableMatches = TABLE_CONTEXT.map((entry) => ({
    entry,
    score: scoreEntry(tokens, entry.terms),
  }))
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((match) => ({
      label: match.entry.label,
      table: match.entry.table,
      field: match.entry.field,
    }));

  const controls = {
    metric,
    statistic,
    conditions: conditions.map((condition) => condition.code),
    conditionMode,
    labTest: lab?.name,
    sex: findSex(text),
    ...findBirthYears(text),
  };

  const matchedContext = uniqueBy(
    [
      ...matchedContextForControls(controls),
      ...tableMatches,
    ],
    (item) => `${item.table}:${item.field || ''}:${item.label}`
  );

  const unknownClinicalFilter =
    conditions.length === 0 &&
    (tokens.includes('heart') ||
      tokens.includes('cardiac') ||
      tokens.includes('cancer') ||
      tokens.includes('asthma') ||
      (tokens.includes('condition') && metric !== 'condition_distribution') ||
      (tokens.includes('conditions') && metric !== 'condition_distribution'));

  return {
    controls,
    matchedContext,
    unsupported: unsupported || unknownClinicalFilter || !metric,
    suggestions: EXAMPLE_PROMPTS,
  };
}