import { WEB_API_BASE } from '../config';
import type { CreateJobRequest, Job, PaginatedResponse } from '../types';
import { http } from './http';

export interface CreateJobPayload extends CreateJobRequest {
  resumeTitle?: string;
  resumeContent: string;
}

export interface JobWithResume extends Job {
  created_at: number; // 兼容现有页面的字段名
  resumeId?: string;
  resumeTitle?: string;
  resumeContent?: string;
  vector_status?: number;
}

export async function createJob(
  payload: CreateJobPayload,
): Promise<{ jobId: string; resumeId: string }> {
  return await http.post<{ jobId: string; resumeId: string }>('/jobs/new', payload);
}

export async function listJobs(): Promise<PaginatedResponse<JobWithResume>> {
  return await http.get<PaginatedResponse<JobWithResume>>('/jobs');
}

export async function getJob(jobId: string): Promise<{ job: JobWithResume }> {
  return await http.get<{ job: JobWithResume }>(`/jobs/${jobId}`);
}

export async function updateJob(
  jobId: string,
  payload: CreateJobPayload,
): Promise<{ success: boolean }> {
  return await http.put<{ success: boolean }>(`/jobs/${jobId}`, payload);
}

export async function deleteJob(jobId: string): Promise<{ success: boolean }> {
  return await http.delete<{ success: boolean }>(`/jobs/${jobId}`);
}

export async function extractResumeText(file: File): Promise<{ text: string }> {
  const token = localStorage.getItem('auth_token');
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${WEB_API_BASE}/files/extract-text`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || '解析失败');
  }
  return await res.json();
}
