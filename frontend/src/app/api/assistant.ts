import { apiPost } from './client';
import type { AssistantRequest, AssistantResponse } from '../types';

export function askAnalyticsAssistant(payload: AssistantRequest) {
  return apiPost<AssistantResponse>('/assistant/ask', payload);
}
