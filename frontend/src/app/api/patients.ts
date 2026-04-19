import { apiGet } from './client';
import type {
  PatientListItem,
  EncounterRow,
  LabsResponse,
  MedicationRow,
  ConditionRow,
} from '../types';

export interface PatientListParams {
  search?: string;
  sex?: string;
  birthYearMin?: number;
  birthYearMax?: number;
  conditionCode?: string;
  limit?: number;
  offset?: number;
}

export function fetchPatients(params: PatientListParams = {}) {
  return apiGet<PatientListItem[]>('/patients', {
    search: params.search,
    sex: params.sex,
    birthYearMin: params.birthYearMin,
    birthYearMax: params.birthYearMax,
    conditionCode: params.conditionCode,
    limit: params.limit ?? 500,
    offset: params.offset ?? 0,
  });
}

export function fetchPatient(patientId: number) {
  return apiGet<PatientListItem>(`/patients/${patientId}`);
}

export function fetchPatientEncounters(patientId: number) {
  return apiGet<EncounterRow[]>(`/patients/${patientId}/encounters`);
}

export function fetchPatientLabs(patientId: number) {
  return apiGet<LabsResponse>(`/patients/${patientId}/labs`);
}

export function fetchPatientMedications(patientId: number) {
  return apiGet<MedicationRow[]>(`/patients/${patientId}/medications`);
}

export function fetchPatientConditions(patientId: number) {
  return apiGet<ConditionRow[]>(`/patients/${patientId}/conditions`);
}
