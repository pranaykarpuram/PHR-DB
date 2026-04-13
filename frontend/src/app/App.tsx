import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { FilterBar } from './components/FilterBar';
import { PatientCard } from './components/PatientCard';
import { PatientDetail } from './components/PatientDetail';
import { Analytics } from './components/Analytics';
import { LabsBrowse } from './components/LabsBrowse';
import { MedicationsBrowse } from './components/MedicationsBrowse';
import { ConditionsBrowse } from './components/ConditionsBrowse';
import type { PatientListItem } from './types';
import { fetchPatients, fetchPatient } from './api/patients';

function parseBirthYearRange(range: string): {
  birthYearMin?: number;
  birthYearMax?: number;
} {
  if (!range) return {};
  const parts = range.split('-').map((x) => Number(x.trim()));
  if (parts.length !== 2 || parts.some((n) => Number.isNaN(n))) return {};
  return { birthYearMin: parts[0], birthYearMax: parts[1] };
}

export default function App() {
  const [activeView, setActiveView] = useState('patients');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sexFilter, setSexFilter] = useState('');
  const [birthYearFilter, setBirthYearFilter] = useState('');
  const [conditionFilter, setConditionFilter] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientListItem | null>(
    null
  );

  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const loadPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { birthYearMin, birthYearMax } = parseBirthYearRange(birthYearFilter);
      const rows = await fetchPatients({
        search: debouncedSearch || undefined,
        sex: sexFilter || undefined,
        birthYearMin,
        birthYearMax,
        conditionCode: conditionFilter || undefined,
      });
      setPatients(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load patients');
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, sexFilter, birthYearFilter, conditionFilter]);

  useEffect(() => {
    if (activeView !== 'patients') return;
    loadPatients();
  }, [activeView, loadPatients]);

  const openPatientById = useCallback(async (patientId: number) => {
    try {
      const p = await fetchPatient(patientId);
      setSelectedPatient(p);
    } catch (e) {
      console.error(e);
    }
  }, []);

  return (
    <div className="h-screen flex bg-background">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-8">
            {activeView === 'patients' && (
              <>
                <div className="mb-6">
                  <h2 className="mb-2">Patients</h2>
                  <p className="text-muted-foreground">
                    Browse patient records from NHANES database
                  </p>
                </div>

                <FilterBar
                  sexFilter={sexFilter}
                  onSexFilterChange={setSexFilter}
                  birthYearFilter={birthYearFilter}
                  onBirthYearFilterChange={setBirthYearFilter}
                  conditionFilter={conditionFilter}
                  onConditionFilterChange={setConditionFilter}
                />

                {error && (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    {error}
                  </div>
                )}

                {loading ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Loading patients…
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {patients.map((patient) => (
                        <PatientCard
                          key={patient.patient_id}
                          patient={patient}
                          onClick={() => setSelectedPatient(patient)}
                        />
                      ))}
                    </div>

                    {patients.length === 0 && !error && (
                      <div className="text-center py-12 text-muted-foreground">
                        No patients found matching your criteria
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {activeView === 'analytics' && <Analytics />}

            {activeView === 'labs' && (
              <LabsBrowse onOpenPatient={openPatientById} />
            )}

            {activeView === 'medications' && (
              <MedicationsBrowse onOpenPatient={openPatientById} />
            )}

            {activeView === 'conditions' && (
              <ConditionsBrowse onOpenPatient={openPatientById} />
            )}
          </div>
        </main>
      </div>

      {selectedPatient && (
        <PatientDetail
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
        />
      )}
    </div>
  );
}
