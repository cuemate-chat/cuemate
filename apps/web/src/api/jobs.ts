import { http } from './http';

export interface CreateJobPayload {
  title: string;
  description: string;
  resumeTitle?: string;
  resumeContent: string;
}

export async function createJob(
  payload: CreateJobPayload,
): Promise<{ jobId: string; resumeId: string }> {
  return http.post('/jobs/new', payload);
}

export async function listJobs(): Promise<{
  items: Array<{
    id: string;
    title: string;
    description: string;
    created_at: number;
    resumeId?: string;
    resumeTitle?: string;
    resumeContent?: string;
  }>;
}> {
  return http.get('/jobs');
}

export async function getJob(jobId: string): Promise<{ job: any }> {
  return http.get(`/jobs/${jobId}`);
}

export async function updateJob(
  jobId: string,
  payload: CreateJobPayload,
): Promise<{ success: boolean }> {
  return http.put(`/jobs/${jobId}`, payload);
}

export async function deleteJob(jobId: string): Promise<{ success: boolean }> {
  return http.delete(`/jobs/${jobId}` as any);
}
