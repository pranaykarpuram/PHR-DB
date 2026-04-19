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
import { fetchMedicationsOverview } from '../api/globalViews';
import type { MedicationsOverview } from '../types';

function shortDrug(name: string, max = 22) {
  return name.length > max ? `${name.slice(0, max)}…` : name;
}

interface MedicationsBrowseProps {
  onOpenPatient: (patientId: number) => void;
}

export function MedicationsBrowse({ onOpenPatient }: MedicationsBrowseProps) {
  const [data, setData] = useState<MedicationsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const o = await fetchMedicationsOverview(250);
        if (!cancelled) setData(o);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load medications');
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
    data?.topDrugs.slice(0, 15).map((r) => ({
      name: shortDrug(r.drug_name),
      fullName: r.drug_name,
      count: r.prescription_count,
    })) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2">Medications</h2>
        <p className="text-muted-foreground">
          PatientMedication + Drug (cohort-level counts and recent rows)
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
              <div className="text-sm text-muted-foreground mb-2">Prescriptions</div>
              <div className="text-3xl font-medium">
                {data.summary.total_prescriptions}
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 border border-border">
              <div className="text-sm text-muted-foreground mb-2">Distinct drugs</div>
              <div className="text-3xl font-medium">{data.summary.distinct_drugs}</div>
            </div>
            <div className="bg-white rounded-xl p-6 border border-border">
              <div className="text-sm text-muted-foreground mb-2">Patients w/ meds</div>
              <div className="text-3xl font-medium">
                {data.summary.patients_with_meds}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-border">
            <h3 className="mb-1">Top drugs by prescription rows</h3>
            <p className="text-sm text-muted-foreground mb-4">Top 15 by COUNT(*)</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fill: '#71717a', fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    tick={{ fill: '#71717a', fontSize: 10 }}
                  />
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
                  <Bar dataKey="count" fill="#16a34a" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h3>Recent prescriptions</h3>
              <p className="text-sm text-muted-foreground">
                Newest PatientMedication rows with SEQN
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm text-muted-foreground font-medium">
                      SEQN
                    </th>
                    <th className="text-left px-4 py-3 text-sm text-muted-foreground font-medium">
                      Drug
                    </th>
                    <th className="text-left px-4 py-3 text-sm text-muted-foreground font-medium">
                      Dosage
                    </th>
                    <th className="text-left px-4 py-3 text-sm text-muted-foreground font-medium">
                      Start
                    </th>
                    <th className="text-left px-4 py-3 text-sm text-muted-foreground font-medium">
                      End
                    </th>
                    <th className="text-right px-4 py-3 text-sm text-muted-foreground font-medium">
                      Patient
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.map((r, idx) => (
                    <tr
                      key={r.patient_med_id}
                      className={idx % 2 === 0 ? 'bg-white' : 'bg-muted/15'}
                    >
                      <td className="px-4 py-3 text-sm">{r.nhanes_seqn}</td>
                      <td className="px-4 py-3 text-sm">{r.drug_name}</td>
                      <td className="px-4 py-3 text-sm">{r.dosage ?? '—'}</td>
                      <td className="px-4 py-3 text-sm">{r.start_date ?? '—'}</td>
                      <td className="px-4 py-3 text-sm">{r.end_date ?? '—'}</td>
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
                No medication rows in database
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
