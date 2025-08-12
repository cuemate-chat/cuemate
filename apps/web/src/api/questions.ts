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
): Promise<{ items: IQItem[]; total: number }> {
  return http.get(
    `/interview-questions?jobId=${encodeURIComponent(jobId)}&page=${page}&pageSize=${pageSize}`,
  );
}

export async function getInterviewQuestion(id: string): Promise<{ item: IQItem }> {
  return http.get(`/interview-questions/${id}`);
}

export async function updateInterviewQuestion(
  id: string,
  payload: { title: string; description: string },
): Promise<{ success: boolean }> {
  return http.put(`/interview-questions/${id}`, payload);
}

export async function deleteInterviewQuestion(id: string): Promise<{ success: boolean }> {
  return http.delete(`/interview-questions/${id}`);
}
