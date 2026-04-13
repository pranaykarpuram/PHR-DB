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
import { fetchLabsOverview } from '../api/globalViews';
import type { LabsOverview } from '../types';

function shortLabel(name: string, max = 16) {
  return name.length > max ? `${name.slice(0, max)}…` : name;
}

interface LabsBrowseProps {
  onOpenPatient: (patientId: number) => void;
}

export function LabsBrowse({ onOpenPatient }: LabsBrowseProps) {
  const [data, setData] = useState<LabsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const o = await fetchLabsOverview(250);
        if (!cancelled) setData(o);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load labs');
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
    data?.byTest.map((r) => ({
      name: shortLabel(r.test_name),
      fullName: r.test_name,
      count: r.count,
    })) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2">Labs</h2>
        <p className="text-muted-foreground">
          Cohort lab results from LabResult + LabTestType + Encounter (live DB)
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
              <div className="text-sm text-muted-foreground mb-2">Lab rows</div>
              <div className="text-3xl font-medium">{data.summary.total_results}</div>
            </div>
            <div className="bg-white rounded-xl p-6 border border-border">
              <div className="text-sm text-muted-foreground mb-2">Test types</div>
              <div className="text-3xl font-medium">
                {data.summary.distinct_test_types}
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 border border-border">
              <div className="text-sm text-muted-foreground mb-2">Patients w/ labs</div>
              <div className="text-3xl font-medium">
                {data.summary.patients_with_labs}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-border">
            <h3 className="mb-1">Results by test name</h3>
            <p className="text-sm text-muted-foreground mb-4">Row counts per LabTestType</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#71717a', fontSize: 11 }}
                    height={70}
                    interval={0}
                    angle={-22}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fill: '#71717a', fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => [value, 'rows']}
                    labelFormatter={(_, payload) =>
                      payload?.[0]?.payload?.fullName ?? ''
                    }
                    contentStyle={{
                      border: '1px solid #e5e5e5',
                      borderRadius: 8,
                      fontSize: 14,
                    }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3>Recent lab results</h3>
                <p className="text-sm text-muted-foreground">
                  Newest rows (SEQN + test + value + cycle)
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm text-muted-foreground font-medium">
                      SEQN
                    </th>
                    <th className="text-left px-4 py-3 text-sm text-muted-foreground font-medium">
                      Test
                    </th>
                    <th className="text-left px-4 py-3 text-sm text-muted-foreground font-medium">
                      Value
                    </th>
                    <th className="text-left px-4 py-3 text-sm text-muted-foreground font-medium">
                      Unit
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
                      key={r.lab_result_id}
                      className={idx % 2 === 0 ? 'bg-white' : 'bg-muted/15'}
                    >
                      <td className="px-4 py-3 text-sm">{r.nhanes_seqn}</td>
                      <td className="px-4 py-3 text-sm">{r.test_name}</td>
                      <td className="px-4 py-3 text-sm font-medium">
                        {r.value ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {r.unit ?? '—'}
                      </td>
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
                No lab rows in database
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
