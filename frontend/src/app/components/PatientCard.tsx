import { FlaskConical, Pill, HeartPulse } from 'lucide-react';
import type { PatientListItem } from '../types';

interface PatientCardProps {
  patient: PatientListItem;
  onClick: () => void;
}

export function PatientCard({ patient, onClick }: PatientCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full bg-white rounded-2xl p-5 border border-border hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 text-left group"
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm text-muted-foreground mb-1">NHANES SEQN</div>
            <div className="font-medium text-foreground group-hover:text-blue-600 transition-colors">
              {patient.nhanes_seqn}
            </div>
          </div>
          <div className="px-2.5 py-1 bg-muted rounded-lg text-xs">
            {patient.sex}
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Born</span>
          <span className="font-medium text-foreground">{patient.birth_year}</span>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 rounded-lg text-xs text-blue-700">
            <FlaskConical className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>{patient.lab_count}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-50 rounded-lg text-xs text-purple-700">
            <HeartPulse className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>{patient.condition_count}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 rounded-lg text-xs text-green-700">
            <Pill className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>{patient.medication_count}</span>
          </div>
        </div>
      </div>
    </button>
  );
}
