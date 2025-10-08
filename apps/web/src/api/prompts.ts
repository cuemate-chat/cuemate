import { http } from './http';

export interface Prompt {
  id: string;
  content: string;
  description: string;
  variables: string;
  source: 'desktop' | 'web';
  default_content: string;
  history_pre: string | null;
  extra: string | null;
  created_at: number;
  updated_at: number;
}

export interface ListPromptsParams {
  source?: 'desktop' | 'web';
}

export interface ListPromptsResponse {
  list: Prompt[];
}

export interface GetPromptResponse {
  prompt: Prompt;
}

export interface CreatePromptParams {
  id: string;
  content: string;
  description?: string;
  variables?: string;
  source: 'desktop' | 'web';
  extra?: string;
}

export interface UpdatePromptParams {
  content: string;
  extra?: string;
}

export async function listPrompts(params?: ListPromptsParams): Promise<ListPromptsResponse> {
  return http.get('/prompts', { params });
}

export async function getPrompt(id: string): Promise<GetPromptResponse> {
  return http.get(`/prompts/${id}`);
}

export async function createPrompt(data: CreatePromptParams): Promise<{ success: boolean; message: string; id: string }> {
  return http.post('/prompts', data);
}

export async function updatePrompt(id: string, data: UpdatePromptParams): Promise<{ success: boolean; message: string }> {
  return http.put(`/prompts/${id}`, data);
}

export async function deletePrompt(id: string): Promise<{ success: boolean; message: string }> {
  return http.delete(`/prompts/${id}`);
}

export async function resetPrompt(id: string): Promise<{ success: boolean; message: string }> {
  return http.post(`/prompts/${id}/reset`);
}
