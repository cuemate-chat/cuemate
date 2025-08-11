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
