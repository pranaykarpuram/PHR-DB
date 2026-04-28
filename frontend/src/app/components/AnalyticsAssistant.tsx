import { FormEvent, useMemo, useState } from 'react';
import {
  Database,
  Play,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { askAnalyticsAssistant } from '../api/assistant';
import type {
  AnalyticsOverview,
  AssistantControls,
  AssistantMetric,
  AssistantResponse,
  AssistantStatistic,
} from '../types';
import { LAB_SUMMARY_ORDER } from '../types';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

interface AnalyticsAssistantProps {
  data: AnalyticsOverview | null;
}

const DEFAULT_CONDITIONS = ['Diabetes', 'Hypertension'];

function toNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? undefined : n;
}

function formatCell(value: unknown) {
  if (value == null) return '-';
  if (typeof value === 'number') return Number.isInteger(value) ? value : value.toFixed(2);
  return String(value);
}

function numberCell(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function shortLabel(value: unknown, max = 20) {
  const label = String(value ?? '');
  return label.length > max ? `${label.slice(0, max - 1)}...` : label;
}

function metricLabel(metric: AssistantMetric) {
  if (metric === 'patient_count') return 'Patient count';
  if (metric === 'lab_stat') return 'Lab statistic';
  if (metric === 'condition_distribution') return 'Condition distribution';
  return 'Top medications';
}

function AssistantResultVisualization({ response }: { response: AssistantResponse }) {
  const firstRow = response.rows[0];
  if (!firstRow || response.unsupported) return null;

  if (response.metric === 'patient_count') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border bg-blue-50/60 p-4">
          <div className="text-sm text-muted-foreground">Matched patients</div>
          <div className="mt-2 text-3xl font-medium">
            {formatCell(firstRow.patient_count)}
          </div>
        </div>
      </div>
    );
  }

  if (response.metric === 'lab_stat') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border bg-blue-50/60 p-4">
          <div className="text-sm text-muted-foreground">Statistic value</div>
          <div className="mt-2 text-3xl font-medium">{formatCell(firstRow.value)}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Lab results</div>
          <div className="mt-2 text-2xl font-medium">
            {formatCell(firstRow.result_count)}
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Patients included</div>
          <div className="mt-2 text-2xl font-medium">
            {formatCell(firstRow.patient_count)}
          </div>
        </div>
      </div>
    );
  }

  if (response.metric === 'condition_distribution') {
    const chartData = response.rows.map((row) => ({
      name: shortLabel(row.condition_name),
      value: numberCell(row.patient_count),
    }));

    return (
      <div className="rounded-lg border p-4">
        <div className="text-sm font-medium mb-3">Condition distribution</div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="name"
                tick={{ fill: '#71717a', fontSize: 12 }}
                axisLine={{ stroke: '#e5e5e5' }}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: '#71717a', fontSize: 12 }}
                axisLine={{ stroke: '#e5e5e5' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e5e5',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              />
              <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (response.metric === 'top_medications') {
    const chartData = response.rows.slice(0, 10).map((row) => ({
      name: shortLabel(row.drug_name, 18),
      value: numberCell(row.prescription_count),
    }));

    return (
      <div className="rounded-lg border p-4">
        <div className="text-sm font-medium mb-3">Top medications</div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fill: '#71717a', fontSize: 12 }}
                axisLine={{ stroke: '#e5e5e5' }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tick={{ fill: '#71717a', fontSize: 11 }}
                axisLine={{ stroke: '#e5e5e5' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e5e5',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              />
              <Bar dataKey="value" fill="#0f766e" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return null;
}

export function AnalyticsAssistant({ data }: AnalyticsAssistantProps) {
  const [question, setQuestion] = useState('');
  const [metric, setMetric] = useState<AssistantMetric>('patient_count');
  const [statistic, setStatistic] = useState<AssistantStatistic>('avg');
  const [conditions, setConditions] = useState<string[]>([]);
  const [conditionMode, setConditionMode] = useState<'any' | 'all'>('any');
  const [labTest, setLabTest] = useState<string>('Total Cholesterol');
  const [sex, setSex] = useState<'all' | 'M' | 'F' | 'O'>('all');
  const [birthYearMin, setBirthYearMin] = useState('');
  const [birthYearMax, setBirthYearMax] = useState('');
  const [limit, setLimit] = useState('10');
  const [response, setResponse] = useState<AssistantResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const conditionOptions = useMemo(() => {
    const fromData =
      data?.conditionDistribution.map((condition) => condition.condition_name) ?? [];
    return fromData.length ? fromData : DEFAULT_CONDITIONS;
  }, [data]);

  const labOptions = useMemo(() => {
    const fromData = data?.labDistribution.map((lab) => lab.test_name) ?? [];
    return fromData.length ? fromData : [...LAB_SUMMARY_ORDER];
  }, [data]);

  function toggleCondition(condition: string) {
    setConditions((current) =>
      current.includes(condition)
        ? current.filter((item) => item !== condition)
        : [...current, condition]
    );
  }

  function buildControls(): AssistantControls {
    return {
      metric,
      statistic,
      conditions,
      conditionMode,
      labTest: metric === 'lab_stat' ? labTest : undefined,
      sex: sex === 'all' ? undefined : sex,
      birthYearMin: toNumber(birthYearMin),
      birthYearMax: toNumber(birthYearMax),
      limit: toNumber(limit),
    };
  }

  async function runRequest(payload: { question?: string; controls?: AssistantControls }) {
    setLoading(true);
    setError(null);
    try {
      const result = await askAnalyticsAssistant(payload);
      setResponse(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to ask analytics assistant');
    } finally {
      setLoading(false);
    }
  }

  function submitQuestion(event: FormEvent) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) {
      setResponse({
        answer: 'Ask a question or use the guided controls below.',
        sql: '',
        params: [],
        metric: 'unsupported',
        rows: [],
        matchedContext: [],
        suggestions: [
          'How many diabetic patients are there?',
          'Average total cholesterol for diabetic patients',
          'Top medications for hypertensive patients',
        ],
        unsupported: true,
      });
      return;
    }
    runRequest({ question: trimmed });
  }

  const rowColumns = response?.rows?.[0] ? Object.keys(response.rows[0]) : [];

  return (
    <section className="bg-white rounded-xl p-6 border border-border space-y-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Database className="w-5 h-5 text-blue-600" strokeWidth={1.7} />
            <h3>Analytics Assistant</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Ask cohort questions or use guided filters. Results are computed with
            safe aggregate SQL.
          </p>
        </div>
        <Badge variant="outline">{metricLabel(metric)}</Badge>
      </div>

      <form onSubmit={submitQuestion} className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            className="pl-9"
            placeholder="Ask: Average total cholesterol for diabetic patients"
          />
        </div>
        <Button type="submit" disabled={loading}>
          <Play className="w-4 h-4" />
          Ask
        </Button>
      </form>

      <div className="border rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
          <div className="font-medium text-sm">Guided controls</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <label className="space-y-1.5 text-sm">
            <span className="text-muted-foreground">Metric</span>
            <Select value={metric} onValueChange={(value) => setMetric(value as AssistantMetric)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="patient_count">Patient count</SelectItem>
                <SelectItem value="lab_stat">Lab statistic</SelectItem>
                <SelectItem value="condition_distribution">Condition distribution</SelectItem>
                <SelectItem value="top_medications">Top medications</SelectItem>
              </SelectContent>
            </Select>
          </label>

          <label className="space-y-1.5 text-sm">
            <span className="text-muted-foreground">Statistic</span>
            <Select
              value={statistic}
              onValueChange={(value) => setStatistic(value as AssistantStatistic)}
              disabled={metric !== 'lab_stat'}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="avg">Average</SelectItem>
                <SelectItem value="min">Minimum</SelectItem>
                <SelectItem value="max">Maximum</SelectItem>
                <SelectItem value="count">Count</SelectItem>
              </SelectContent>
            </Select>
          </label>

          <label className="space-y-1.5 text-sm">
            <span className="text-muted-foreground">Lab test</span>
            <Select value={labTest} onValueChange={setLabTest} disabled={metric !== 'lab_stat'}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {labOptions.map((lab) => (
                  <SelectItem key={lab} value={lab}>
                    {lab}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="space-y-1.5 text-sm">
            <span className="text-muted-foreground">Sex</span>
            <Select value={sex} onValueChange={(value) => setSex(value as typeof sex)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="M">M</SelectItem>
                <SelectItem value="F">F</SelectItem>
                <SelectItem value="O">O</SelectItem>
              </SelectContent>
            </Select>
          </label>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_180px_220px] gap-4">
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Conditions</div>
            <div className="flex flex-wrap gap-3">
              {conditionOptions.map((condition) => (
                <label
                  key={condition}
                  className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <Checkbox
                    checked={conditions.includes(condition)}
                    onCheckedChange={() => toggleCondition(condition)}
                  />
                  <span>{condition}</span>
                </label>
              ))}
            </div>
          </div>

          <label className="space-y-1.5 text-sm">
            <span className="text-muted-foreground">Condition mode</span>
            <Select
              value={conditionMode}
              onValueChange={(value) => setConditionMode(value as 'any' | 'all')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any selected</SelectItem>
                <SelectItem value="all">All selected</SelectItem>
              </SelectContent>
            </Select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1.5 text-sm">
              <span className="text-muted-foreground">Birth year min</span>
              <Input
                value={birthYearMin}
                onChange={(event) => setBirthYearMin(event.target.value)}
                inputMode="numeric"
                placeholder="1900"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="text-muted-foreground">Birth year max</span>
              <Input
                value={birthYearMax}
                onChange={(event) => setBirthYearMax(event.target.value)}
                inputMode="numeric"
                placeholder="2026"
              />
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <label className="space-y-1.5 text-sm sm:w-32">
            <span className="text-muted-foreground">Top limit</span>
            <Input
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
              inputMode="numeric"
              disabled={metric !== 'top_medications'}
            />
          </label>
          <Button type="button" onClick={() => runRequest({ controls: buildControls() })} disabled={loading}>
            <Play className="w-4 h-4" />
            Run guided query
          </Button>
        </div>
      </div>

      {loading && <div className="text-sm text-muted-foreground">Running analytics query...</div>}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {response && !error && (
        <div className="border rounded-lg p-4 space-y-4">
          <div>
            <div className="text-sm text-muted-foreground mb-1">Answer</div>
            <p>{response.answer}</p>
          </div>

          {response.matchedContext.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {response.matchedContext.map((context) => (
                <Badge
                  key={`${context.table}-${context.field || context.label}`}
                  variant="secondary"
                >
                  {context.label}
                </Badge>
              ))}
            </div>
          )}

          <AssistantResultVisualization response={response} />

          {rowColumns.length > 0 && (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    {rowColumns.map((column) => (
                      <th key={column} className="px-3 py-2 text-left font-medium">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {response.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-t">
                      {rowColumns.map((column) => (
                        <td key={column} className="px-3 py-2">
                          {formatCell(row[column])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {response.sql && (
            <details className="rounded-md border bg-muted/20 p-3">
              <summary className="cursor-pointer text-sm font-medium">SQL used</summary>
              <pre className="mt-3 overflow-x-auto text-xs whitespace-pre-wrap">
                {response.sql}
              </pre>
            </details>
          )}

          {response.unsupported && response.suggestions.length > 0 && (
            <div>
              <div className="text-sm text-muted-foreground mb-2">Try one of these</div>
              <div className="flex flex-wrap gap-2">
                {response.suggestions.map((suggestion) => (
                  <Button
                    key={suggestion}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQuestion(suggestion);
                      runRequest({ question: suggestion });
                    }}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
