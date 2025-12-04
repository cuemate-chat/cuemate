import { http } from './http';

export interface InterviewListItem {
  id: string;
  startedAt: number;
  endedAt: number | null;
  selectedModelId?: string | null;
  modelName?: string | null;
  modelProvider?: string | null;
  modelIcon?: string | null;
  jobTitle: string;
  jobContent?: string | null;
  questionCount: number;
  resumesId?: string | null;
  resumesTitle?: string | null;
  resumesContent?: string | null;
  duration: number;
  interviewType: 'mock' | 'training';
  status: 'idle' | 'mock-interview-recording' | 'mock-interview-paused' | 'mock-interview-completed' | 'mock-interview-playing' | 'mock-interview-error' | 'mock-interview-expired' | 'interview-training-recording' | 'interview-training-paused' | 'interview-training-completed' | 'interview-training-playing' | 'interview-training-error' | 'interview-training-expired';
  message?: string | null;
  interviewState?: string | null;
  originalJobTitle?: string;
  totalScore?: number;
  overallSummary?: string;
  overallPros?: string;
  overallCons?: string;
  overallSuggestions?: string;
  advantageContent?: string;
  disadvantageContent?: string;
  advantagesTotal?: number;
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
