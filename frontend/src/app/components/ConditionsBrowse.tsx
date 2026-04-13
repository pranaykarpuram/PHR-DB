import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { fetchConditionsOverview } from '../api/globalViews';
import type { ConditionsOverview } from '../types';

interface ConditionsBrowseProps {
  onOpenPatient: (patientId: number) => void;
}

export function ConditionsBrowse({ onOpenPatient }: ConditionsBrowseProps) {
  const [data, setData] = useState<ConditionsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const o = await fetchConditionsOverview(250);
        if (!cancelled) setData(o);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load conditions');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const barData =
    data?.byCondition.map((r) => ({
      name: r.condition_name,
      code: r.condition_code,
      count: r.count,
    })) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2">Conditions</h2>
        <p className="text-muted-foreground">
          PatientCondition + ConditionType (survey-linked flags)
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-6 border border-border">
              <div className="text-sm text-muted-foreground mb-2">Condition rows</div>
              <div className="text-3xl font-medium">{data.summary.total_rows}</div>
            </div>
            <div className="bg-white rounded-xl p-6 border border-border">
              <div className="text-sm text-muted-foreground mb-2">Condition types</div>
              <div className="text-3xl font-medium">
                {data.summary.distinct_condition_types}
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 border border-border">
              <div className="text-sm text-muted-foreground mb-2">Patients w/ conditions</div>
              <div className="text-3xl font-medium">
                {data.summary.patients_with_conditions}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-border">
            <h3 className="mb-1">Rows by condition</h3>
            <p className="text-sm text-muted-foreground mb-4">
              COUNT(*) grouped by condition_name / code
            </p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#71717a', fontSize: 11 }}
                    interval={0}
                    angle={-18}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis tick={{ fill: '#71717a', fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => [value, 'rows']}
                    labelFormatter={(label, payload) => {
                      const code = payload?.[0]?.payload?.code;
                      return code ? `${label} (${code})` : label;
                    }}
                    contentStyle={{
                      border: '1px solid #e5e5e5',
                      borderRadius: 8,
                      fontSize: 14,
                    }}
                  />
                  <Bar dataKey="count" fill="#9333ea" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h3>Recent condition rows</h3>
              <p className="text-sm text-muted-foreground">
                Newest PatientCondition with SEQN, status, cycle
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm text-muted-foreground font-medium">
                      SEQN
                    </th>
                    <th className="text-left px-4 py-3 text-sm text-muted-foreground font-medium">
                      Condition
                    </th>
                    <th className="text-left px-4 py-3 text-sm text-muted-foreground font-medium">
                      Code
                    </th>
                    <th className="text-left px-4 py-3 text-sm text-muted-foreground font-medium">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-sm text-muted-foreground font-medium">
                      Cycle
                    </th>
                    <th className="text-right px-4 py-3 text-sm text-muted-foreground font-medium">
                      Patient
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.map((r, idx) => (
                    <tr
                      key={r.patient_condition_id}
                      className={idx % 2 === 0 ? 'bg-white' : 'bg-muted/15'}
                    >
                      <td className="px-4 py-3 text-sm">{r.nhanes_seqn}</td>
                      <td className="px-4 py-3 text-sm">{r.condition_name}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {r.condition_code}
                      </td>
                      <td className="px-4 py-3 text-sm">{r.status ?? '—'}</td>
                      <td className="px-4 py-3 text-sm">{r.cycle}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => onOpenPatient(r.patient_id)}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.recent.length === 0 && (
              <div className="px-6 py-12 text-center text-muted-foreground">
                No condition rows in database
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
