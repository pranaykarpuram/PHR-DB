import { X, TrendingUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  ResponsiveContainer,
} from 'recharts';
import type {
  PatientListItem,
  EncounterRow,
  LabsResponse,
  MedicationRow,
  ConditionRow,
  LabResultRow,
} from '../types';
import { LAB_SUMMARY_ORDER } from '../types';
import {
  fetchPatient,
  fetchPatientEncounters,
  fetchPatientLabs,
  fetchPatientMedications,
  fetchPatientConditions,
} from '../api/patients';

interface PatientDetailProps {
  patient: PatientListItem;
  onClose: () => void;
}

function sexLabel(sex: string) {
  if (sex === 'M') return 'Male';
  if (sex === 'F') return 'Female';
  return 'Other';
}

function sparklineForTest(results: LabResultRow[], testName: string) {
  const pts = results
    .filter((r) => r.test_name === testName)
    .sort((a, b) => a.lab_result_id - b.lab_result_id)
    .slice(-6)
    .map((r, i) => ({ x: i + 1, y: Number(r.value) }));
  return pts.length >= 2 ? pts : [];
}

export function PatientDetail({ patient, onClose }: PatientDetailProps) {
  const [activeTab, setActiveTab] = useState<
    'profile' | 'encounters' | 'labs' | 'medications' | 'conditions'
  >('profile');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<PatientListItem | null>(null);
  const [encounters, setEncounters] = useState<EncounterRow[]>([]);
  const [labs, setLabs] = useState<LabsResponse | null>(null);
  const [medications, setMedications] = useState<MedicationRow[]>([]);
  const [conditions, setConditions] = useState<ConditionRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const id = patient.patient_id;
        const [s, enc, lab, med, cond] = await Promise.all([
          fetchPatient(id),
          fetchPatientEncounters(id),
          fetchPatientLabs(id),
          fetchPatientMedications(id),
          fetchPatientConditions(id),
        ]);
        if (cancelled) return;
        setSummary(s);
        setEncounters(enc);
        setLabs(lab);
        setMedications(med);
        setConditions(cond);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load patient');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [patient.patient_id]);

  const tabs = [
    { id: 'profile' as const, label: 'Profile' },
    { id: 'encounters' as const, label: 'Encounters' },
    { id: 'labs' as const, label: 'Labs' },
    { id: 'medications' as const, label: 'Medications' },
    { id: 'conditions' as const, label: 'Conditions' },
  ];

  const head = summary ?? patient;
  const labResults = labs?.results ?? [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
      <div className="bg-background w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col">
        <div className="px-8 py-6 border-b border-border flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-3">
              <h2 className="text-2xl">{head.nhanes_seqn}</h2>
              <div className="px-3 py-1 bg-muted rounded-lg text-sm">
                {sexLabel(head.sex)}
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
              <div>
                <span className="text-foreground">{head.birth_year}</span> · Born
              </div>
              <div>
                <span className="text-foreground">{head.lab_count}</span> lab results
              </div>
              <div>
                <span className="text-foreground">{head.encounter_count}</span>{' '}
                encounters
              </div>
              <div>
                <span className="text-foreground">{head.condition_count}</span>{' '}
                conditions
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        <div className="px-8 border-b border-border">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm transition-colors relative ${
                  activeTab === tab.id
                    ? 'text-blue-600'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {loading && (
            <div className="text-center py-12 text-muted-foreground">Loading…</div>
          )}
          {!loading && error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}
          {!loading && !error && (
            <>
              {activeTab === 'profile' && (
                <div className="space-y-4">
                  <div className="bg-white rounded-xl p-6 border border-border">
                    <h3 className="mb-4">Patient Information</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2">
                        <span className="text-muted-foreground">patient_id</span>
                        <span className="font-medium">{head.patient_id}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-t border-border">
                        <span className="text-muted-foreground">NHANES SEQN</span>
                        <span className="font-medium">{head.nhanes_seqn}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-t border-border">
                        <span className="text-muted-foreground">Birth Year</span>
                        <span className="font-medium">{head.birth_year}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-t border-border">
                        <span className="text-muted-foreground">Sex</span>
                        <span className="font-medium">{sexLabel(head.sex)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="px-4 py-3 bg-blue-50 rounded-xl text-sm text-blue-700">
                    Data derived from NHANES survey (not clinical diagnosis)
                  </div>
                </div>
              )}

              {activeTab === 'encounters' && (
                <div className="bg-white rounded-xl border border-border overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-6 py-3 text-sm text-muted-foreground font-medium">
                          encounter_id
                        </th>
                        <th className="text-left px-6 py-3 text-sm text-muted-foreground font-medium">
                          Cycle
                        </th>
                        <th className="text-left px-6 py-3 text-sm text-muted-foreground font-medium">
                          Type
                        </th>
                        <th className="text-left px-6 py-3 text-sm text-muted-foreground font-medium">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {encounters.map((row, idx) => (
                        <tr
                          key={row.encounter_id}
                          className={idx % 2 === 0 ? 'bg-white' : 'bg-muted/20'}
                        >
                          <td className="px-6 py-4 text-sm">{row.encounter_id}</td>
                          <td className="px-6 py-4 text-sm">{row.cycle}</td>
                          <td className="px-6 py-4 text-sm">{row.encounter_type}</td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">
                            {row.encounter_date ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {encounters.length === 0 && (
                    <div className="px-6 py-12 text-center text-muted-foreground">
                      No encounters
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'labs' && labs && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {LAB_SUMMARY_ORDER.map((testName) => {
                      const latest = labs.latestByTest.find(
                        (r) => r.test_name === testName
                      );
                      const unit = latest?.unit ?? '';
                      const spark = sparklineForTest(labResults, testName);
                      return (
                        <div
                          key={testName}
                          className="bg-white rounded-xl p-5 border border-border"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="text-sm text-muted-foreground mb-1">
                                {testName}
                              </div>
                              <div className="text-2xl font-medium">
                                {latest != null ? latest.value : '—'}
                                <span className="text-base text-muted-foreground ml-2">
                                  {unit}
                                </span>
                              </div>
                            </div>
                            <div className="p-2 bg-green-50 rounded-lg">
                              <TrendingUp className="w-4 h-4 text-green-600" />
                            </div>
                          </div>
                          <div className="h-16">
                            {spark.length >= 2 ? (
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={spark}>
                                  <Line
                                    type="monotone"
                                    dataKey="y"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    dot={false}
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            ) : (
                              <div className="text-xs text-muted-foreground h-full flex items-center">
                                Not enough history for sparkline
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-white rounded-xl border border-border overflow-hidden">
                    <div className="px-6 py-4 border-b border-border">
                      <h3>All Lab Results</h3>
                    </div>
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-6 py-3 text-sm text-muted-foreground font-medium">
                            Test Name
                          </th>
                          <th className="text-left px-6 py-3 text-sm text-muted-foreground font-medium">
                            Value
                          </th>
                          <th className="text-left px-6 py-3 text-sm text-muted-foreground font-medium">
                            Unit
                          </th>
                          <th className="text-left px-6 py-3 text-sm text-muted-foreground font-medium">
                            Cycle
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {labResults.map((result, idx) => (
                          <tr
                            key={result.lab_result_id}
                            className={idx % 2 === 0 ? 'bg-white' : 'bg-muted/20'}
                          >
                            <td className="px-6 py-4 text-sm">{result.test_name}</td>
                            <td className="px-6 py-4 text-sm font-medium">
                              {result.value}
                            </td>
                            <td className="px-6 py-4 text-sm text-muted-foreground">
                              {result.unit ?? '—'}
                            </td>
                            <td className="px-6 py-4 text-sm">{result.cycle}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {labResults.length === 0 && (
                      <div className="px-6 py-12 text-center text-muted-foreground">
                        No lab results
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'medications' && (
                <div className="bg-white rounded-xl border border-border overflow-hidden">
                  {medications.length > 0 ? (
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-6 py-3 text-sm text-muted-foreground font-medium">
                            Drug Name
                          </th>
                          <th className="text-left px-6 py-3 text-sm text-muted-foreground font-medium">
                            Dosage
                          </th>
                          <th className="text-left px-6 py-3 text-sm text-muted-foreground font-medium">
                            Start Date
                          </th>
                          <th className="text-left px-6 py-3 text-sm text-muted-foreground font-medium">
                            End Date
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {medications.map((med, idx) => (
                          <tr
                            key={med.patient_med_id}
                            className={idx % 2 === 0 ? 'bg-white' : 'bg-muted/20'}
                          >
                            <td className="px-6 py-4 text-sm">{med.drug_name}</td>
                            <td className="px-6 py-4 text-sm">{med.dosage ?? '—'}</td>
                            <td className="px-6 py-4 text-sm">{med.start_date ?? '—'}</td>
                            <td className="px-6 py-4 text-sm">{med.end_date ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="px-6 py-12 text-center text-muted-foreground">
                      No medication records available
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'conditions' && (
                <div>
                  {conditions.length > 0 ? (
                    <div className="flex flex-wrap gap-3">
                      {conditions.map((c) => (
                        <div
                          key={c.patient_condition_id}
                          className="bg-white rounded-xl px-5 py-4 border border-border"
                        >
                          <div className="font-medium mb-2">{c.condition_name}</div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="px-2 py-0.5 bg-muted rounded text-xs">
                              {c.status ?? '—'}
                            </span>
                            <span>{c.cycle}</span>
                            <span className="text-xs">{c.condition_code}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-border px-6 py-12 text-center text-muted-foreground">
                      No conditions reported
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
