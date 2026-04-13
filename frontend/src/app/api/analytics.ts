import { apiGet } from './client';
import type { AnalyticsOverview } from '../types';

export function fetchAnalyticsOverview() {
  return apiGet<AnalyticsOverview>('/analytics/overview');
}
