import { WEB_API_BASE } from '../config';
import type { CreateJobRequest, Job, PaginatedResponse } from '../types';
import { http } from './http';

export interface CreateJobPayload extends CreateJobRequest {
  resumeTitle?: string;
  resumeContent: string;
  resumeFilePath?: string;
}

export interface JobWithResume extends Job {
  createdAt: number;
  resumeId?: string;
  resumeTitle?: string;
  resumeContent?: string;
  resumeFilePath?: string;
  vectorStatus?: number;
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

export async function extractResumeText(file: File, jobId?: string): Promise<{ text: string; filePath?: string }> {
  const token = localStorage.getItem('auth_token');
  const form = new FormData();
  form.append('file', file);

  // jobId 通过 URL query 参数传递，而不是 FormData
  const url = jobId
    ? `${WEB_API_BASE}/files/extract-text?jobId=${encodeURIComponent(jobId)}`
    : `${WEB_API_BASE}/files/extract-text`;

  const res = await fetch(url, {
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

// 简历优化相关接口
export interface ResumeOptimization {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  originalResume: string;
  originalWordCount: number;
  optimizedResume: string | null;
  optimizedWordCount: number;
  modelId: string | null;
  modelName: string | null;
  suggestion: string | null;
  optimizationCount: number;
  errorMessage: string | null;
  jobId?: string;
}

export interface CreateResumeOptimizationPayload {
  originalResume: string;
  optimizedResume?: string;
  suggestion?: string;
  modelId?: string;
  modelName?: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
}

export interface UpdateResumeOptimizationPayload {
  optimizedResume?: string;
  suggestion?: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
}

// 获取岗位的简历优化记录列表
export async function listResumeOptimizations(jobId: string): Promise<PaginatedResponse<ResumeOptimization>> {
  return await http.get<PaginatedResponse<ResumeOptimization>>(`/jobs/${jobId}/resume-optimizations`);
}

// 获取单个简历优化记录详情
export async function getResumeOptimization(optimizationId: string): Promise<{ optimization: ResumeOptimization }> {
  return await http.get<{ optimization: ResumeOptimization }>(`/resume-optimizations/${optimizationId}`);
}

// 创建新的简历优化记录
export async function createResumeOptimization(
  jobId: string,
  payload: CreateResumeOptimizationPayload
): Promise<{ optimizationId: string; message: string }> {
  return await http.post<{ optimizationId: string; message: string }>(
    `/jobs/${jobId}/resume-optimizations`,
    payload
  );
}

// 更新简历优化记录
export async function updateResumeOptimization(
  optimizationId: string,
  payload: UpdateResumeOptimizationPayload
): Promise<{ success: boolean; message: string }> {
  return await http.put<{ success: boolean; message: string }>(
    `/resume-optimizations/${optimizationId}`,
    payload
  );
}

// 上传简历文件到指定岗位
export async function uploadJobResume(
  jobId: string,
  file: File
): Promise<{ success: boolean; message: string; filePath: string; textLength: number }> {
  const token = localStorage.getItem('auth_token');
  const form = new FormData();
  form.append('file', file);

  const url = `${WEB_API_BASE}/jobs/${encodeURIComponent(jobId)}/upload-resume`;

  const res = await fetch(url, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || '简历上传失败');
  }

  return await res.json();
}

// 删除岗位的简历文件
export async function deleteJobResume(jobId: string): Promise<{ success: boolean; message: string }> {
  return await http.delete<{ success: boolean; message: string }>(`/jobs/${jobId}/resume-file`);
}

// 删除简历优化记录
export async function deleteResumeOptimization(optimizationId: string): Promise<{ success: boolean; message: string }> {
  return await http.delete<{ success: boolean; message: string }>(`/resume-optimizations/${optimizationId}`);
}
