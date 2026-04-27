function formatNumber(value) {
  if (value == null) return 'N/A';
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  // keep decimals for lab values, whole numbers stay clean
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

const pl = (n, word) => `${n === 1 ? word : word + 's'}`;

function cleanSql(sql) {
  return sql
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}

export { cleanSql };

export function formatAnswer(metric, rows, description) {
  if (!rows?.length) return `No data found for ${description}.`;

  if (metric === 'patient_count') {
    const count = Number(rows[0]?.patient_count ?? 0);
    return `Found ${count} ${pl(count, 'patient')} — ${description}.`;
  }

  if (metric === 'lab_stat') {
    const row = rows[0];
    return `${description}: ${formatNumber(row.value)}, from ${formatNumber(row.result_count)} ${pl(row.result_count, 'result')} across ${formatNumber(row.patient_count)} ${pl(row.patient_count, 'patient')}.`;
  }

  if (metric === 'condition_distribution') {
    const top = rows[0];
    return `Biggest group is ${top.condition_name} with ${formatNumber(top.patient_count)} ${pl(top.patient_count, 'patient')}.`;
  }

  if (metric === 'top_medications') {
    const top = rows[0];
    return `Top med is ${top.drug_name} — ${formatNumber(top.prescription_count)} ${pl(top.prescription_count, 'prescription')} across ${formatNumber(top.patient_count)} ${pl(top.patient_count, 'patient')}.`;
  }

  return `Got ${rows.length} ${pl(rows.length, 'row')} for ${description}.`;
}