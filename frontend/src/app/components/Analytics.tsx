import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { fetchAnalyticsOverview } from '../api/analytics';
import type { AnalyticsOverview } from '../types';

export function Analytics() {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const o = await fetchAnalyticsOverview();
        if (!cancelled) setData(o);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load analytics');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cholLine =
    data?.avgCholesterol.slice(0, 40).map((r, i) => ({
      idx: i + 1,
      seqn: r.nhanes_seqn,
      value: r.avg_total_cholesterol,
    })) ?? [];

  const labBars =
    data?.labDistribution.map((r) => ({
      name:
        r.test_name.length > 18
          ? `${r.test_name.slice(0, 16)}…`
          : r.test_name,
      count: r.count,
    })) ?? [];

  const avgLabsPerPatient =
    data && data.summary.patient_count > 0
      ? (
          data.summary.lab_result_count / data.summary.patient_count
        ).toFixed(1)
      : '0';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2">Analytics Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of patient health metrics and distributions (live from MySQL)
        </p>
      </div>

      {loading && (
        <div className="text-center py-12 text-muted-foreground">Loading…</div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 border border-border">
              <div className="mb-6">
                <h3 className="mb-1">Avg total cholesterol (first 40 patients)</h3>
                <p className="text-sm text-muted-foreground">
                  One point per patient with at least one Total Cholesterol result
                </p>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={cholLine}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="idx"
                      tick={{ fill: '#71717a', fontSize: 12 }}
                      axisLine={{ stroke: '#e5e5e5' }}
                    />
                    <YAxis
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
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={{ fill: '#3b82f6', r: 3 }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-border">
              <div className="mb-6">
                <h3 className="mb-1">Lab result distribution</h3>
                <p className="text-sm text-muted-foreground">
                  Row count per LabTestType.test_name
                </p>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={labBars}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#71717a', fontSize: 11 }}
                      axisLine={{ stroke: '#e5e5e5' }}
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis
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
                    <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-6 border border-border">
              <div className="text-sm text-muted-foreground mb-2">Total Patients</div>
              <div className="text-3xl font-medium">{data.summary.patient_count}</div>
            </div>
            <div className="bg-white rounded-xl p-6 border border-border">
              <div className="text-sm text-muted-foreground mb-2">Lab Results</div>
              <div className="text-3xl font-medium">{data.summary.lab_result_count}</div>
            </div>
            <div className="bg-white rounded-xl p-6 border border-border">
              <div className="text-sm text-muted-foreground mb-2">Encounters</div>
              <div className="text-3xl font-medium">{data.summary.encounter_count}</div>
            </div>
            <div className="bg-white rounded-xl p-6 border border-border">
              <div className="text-sm text-muted-foreground mb-2">
                Avg labs / patient
              </div>
              <div className="text-3xl font-medium">{avgLabsPerPatient}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white rounded-xl p-4 border border-border">
              <div className="font-medium mb-2">Overall avg Total Cholesterol</div>
              <div className="text-2xl">
                {data.overallAvgTotalCholesterol ?? '—'}
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-border">
              <div className="font-medium mb-2">By sex</div>
              <ul className="space-y-1 text-muted-foreground">
                {data.sexDistribution.map((s) => (
                  <li key={s.sex}>
                    {s.sex}: {s.count}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded-xl p-4 border border-border">
              <div className="font-medium mb-2">Top conditions</div>
              <ul className="space-y-1 text-muted-foreground">
                {data.conditionDistribution.slice(0, 5).map((c) => (
                  <li key={c.condition_name}>
                    {c.condition_name}: {c.count}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
