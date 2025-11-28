import { http } from './http';

export interface InterviewListItem {
  id: string;
  started_at: number;
  ended_at: number | null;
  selected_model_id?: string | null;
  model_name?: string | null;
  model_provider?: string | null;
  model_icon?: string | null;
  job_title: string;
  job_content?: string | null;
  question_count: number;
  resumes_id?: string | null;
  resumes_title?: string | null;
  resumes_content?: string | null;
  duration: number;
  interview_type: 'mock' | 'training';
  status: 'idle' | 'mock-interview-recording' | 'mock-interview-paused' | 'mock-interview-completed' | 'mock-interview-playing' | 'interview-training-recording' | 'interview-training-paused' | 'interview-training-completed' | 'interview-training-playing';
  message?: string | null;
  original_job_title?: string;
  total_score?: number;
  overall_summary?: string;
  overall_pros?: string;
  overall_cons?: string;
  overall_suggestions?: string;
  advantage_content?: string;
  disadvantage_content?: string;
  advantages_total?: number;
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
