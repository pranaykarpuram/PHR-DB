import { apiGet } from './client';
import type { LabsOverview, MedicationsOverview, ConditionsOverview } from '../types';

export function fetchLabsOverview(recentLimit = 200) {
  return apiGet<LabsOverview>('/labs/overview', { recentLimit });
}

export function fetchMedicationsOverview(recentLimit = 200) {
  return apiGet<MedicationsOverview>('/medications/overview', { recentLimit });
}

export function fetchConditionsOverview(recentLimit = 200) {
  return apiGet<ConditionsOverview>('/conditions/overview', { recentLimit });
}
