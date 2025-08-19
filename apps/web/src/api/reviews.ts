import { http } from './http';

export interface InterviewListItem {
  id: string;
  started_at: number;
  ended_at: number | null;
  job_title: string;
  total_score?: number;
  overall_summary?: string;
  overall_pros?: string;
  overall_cons?: string;
  overall_suggestions?: string;
  advantage_content?: string;
  disadvantage_content?: string;
}

export async function listInterviews(
  page = 1,
  pageSize = 10,
): Promise<{ items: InterviewListItem[]; total: number }> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  return await http.get<{ items: InterviewListItem[]; total: number }>(`/interviews?${params.toString()}`);
}

export async function getInterviewDetail(id: string): Promise<any> {
  return http.get(`/interviews/${id}`);
}

export async function deleteInterview(id: string): Promise<{ success: boolean }> {
  return http.delete(`/interviews/${id}`);
}
