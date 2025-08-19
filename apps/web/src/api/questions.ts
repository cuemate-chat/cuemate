import { http } from './http';

export interface IQItem {
  id: string;
  title: string;
  description: string;
  created_at: number;
}

export async function listInterviewQuestions(
  jobId: string,
  page = 1,
  pageSize = 6,
  filters?: { day?: string; title?: string; description?: string; tagId?: string },
): Promise<{ items: IQItem[]; total: number }> {
  const params = new URLSearchParams({
    jobId,
    page: String(page),
    pageSize: String(pageSize),
  });
  if (filters?.day) params.set('day', filters.day);
  if (filters?.title) params.set('title', filters.title);
  if (filters?.description) params.set('description', filters.description);
  if (filters?.tagId) params.set('tagId', filters.tagId);
  return await http.get<{ items: IQItem[]; total: number }>(
    `/interview-questions?${params.toString()}`,
  );
}

export async function getInterviewQuestion(id: string): Promise<{ item: IQItem }> {
  return await http.get<{ item: IQItem }>(`/interview-questions/${id}`);
}

export async function updateInterviewQuestion(
  id: string,
  payload: { title: string; description: string; tagId?: string | null },
): Promise<{ success: boolean }> {
  return http.put(`/interview-questions/${id}`, payload);
}

export async function deleteInterviewQuestion(id: string): Promise<{ success: boolean }> {
  return http.delete(`/interview-questions/${id}`);
}

export async function createInterviewQuestion(payload: {
  jobId: string;
  title: string;
  description?: string;
  tagId?: string | null;
}): Promise<{ id: string }> {
  return await http.post<{ id: string }>('/interview-questions', payload);
}

export async function listTags(): Promise<{ items: Array<{ id: string; name: string }> }> {
  return await http.get<{ items: Array<{ id: string; name: string }> }>('/tags');
}
export async function createTag(name: string): Promise<{ id: string }> {
  return await http.post<{ id: string }>('/tags', { name });
}
export async function updateTag(id: string, name: string): Promise<{ success: boolean }> {
  return http.put(`/tags/${id}`, { name });
}
export async function deleteTag(id: string): Promise<{ success: boolean }> {
  return http.delete(`/tags/${id}`);
}

// 同步统计
export async function getIQSyncStats(
  jobId: string,
): Promise<{ total: number; synced: number; unsynced: number }> {
  return await http.get(`/interview-questions/sync-stats?jobId=${encodeURIComponent(jobId)}`);
}

// 批量同步
export async function syncIQBatch(
  jobId: string,
): Promise<{ success: number; failed: number; total: number }> {
  return await http.post('/interview-questions/sync-batch', { jobId });
}
