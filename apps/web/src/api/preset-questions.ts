import { http } from './http';

export interface PresetQuestion {
  id: string;
  question: string;
  answer: string;
  tag_id?: string | null;
  is_builtin: boolean;
  synced_jobs: string[]; // 已同步的岗位 ID 列表
  created_at: number;
  updated_at?: number;
}

export interface PresetQuestionListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  tag_id?: string;
  is_builtin?: boolean;
  day?: string; // 按日期过滤：yyyy-mm-dd
  question?: string; // 按问题过滤
  answer?: string; // 按答案过滤
}

export interface PresetQuestionListResponse {
  items: PresetQuestion[];
  total: number;
  page: number;
  pageSize: number;
}

// 获取预置题库列表
export async function listPresetQuestions(
  params?: PresetQuestionListParams,
): Promise<PresetQuestionListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params?.keyword) searchParams.set('keyword', params.keyword);
  if (params?.tag_id) searchParams.set('tag_id', params.tag_id);
  if (params?.is_builtin !== undefined) searchParams.set('is_builtin', String(params.is_builtin));
  if (params?.day) searchParams.set('day', params.day);
  if (params?.question) searchParams.set('question', params.question);
  if (params?.answer) searchParams.set('answer', params.answer);

  const query = searchParams.toString();
  return await http.get<PresetQuestionListResponse>(
    `/preset-questions${query ? `?${query}` : ''}`,
  );
}

// 获取单个预置题目详情
export async function getPresetQuestion(id: string): Promise<{ item: PresetQuestion }> {
  return await http.get<{ item: PresetQuestion }>(`/preset-questions/${id}`);
}

// 创建预置题目
export async function createPresetQuestion(payload: {
  question: string;
  answer: string;
  tag_id?: string | null;
}): Promise<{ id: string }> {
  return await http.post<{ id: string }>('/preset-questions', payload);
}

// 更新预置题目
export async function updatePresetQuestion(
  id: string,
  payload: {
    question?: string;
    answer?: string;
    tag_id?: string | null;
  },
): Promise<{ success: boolean }> {
  return await http.put<{ success: boolean }>(`/preset-questions/${id}`, payload);
}

// 删除预置题目
export async function deletePresetQuestion(id: string): Promise<{ success: boolean }> {
  return await http.delete<{ success: boolean }>(`/preset-questions/${id}`);
}

// 批量删除预置题目
export async function batchDeletePresetQuestions(ids: string[]): Promise<{ success: boolean; deletedCount: number }> {
  return await http.post<{ success: boolean; deletedCount: number }>('/preset-questions/batch-delete', { ids });
}

// 获取岗位列表（用于同步时选择岗位）
export async function getJobsForSync(): Promise<{ items: Array<{ id: string; title: string }> }> {
  const result = await http.get<{ items: Array<{ id: string; title: string; [key: string]: any }> }>('/jobs');
  // 只返回需要的字段
  return {
    items: result.items.map(job => ({ id: job.id, title: job.title }))
  };
}

// 批量同步到面试题库
export async function batchSyncToInterviewQuestions(payload: {
  presetQuestionIds: string[];
  jobId: string;
}): Promise<{ success: boolean; syncedCount: number; skippedCount: number }> {
  return await http.post<{ success: boolean; syncedCount: number; skippedCount: number }>(
    '/preset-questions/batch-sync',
    payload,
  );
}

// 批量导入预置题目
export async function batchImportPresetQuestions(payload: {
  questions: Array<{
    question: string;
    answer: string;
    tag_name?: string | null;
  }>;
  overwrite?: boolean;
  is_builtin?: boolean; // 是否为内置题库（从 License 页面导入为 true）
}): Promise<{
  success: boolean;
  importedCount: number;
  skippedCount: number;
  totalCount: number;
  errors?: string[];
}> {
  return await http.post<{
    success: boolean;
    importedCount: number;
    skippedCount: number;
    totalCount: number;
    errors?: string[];
  }>('/preset-questions/batch-import', payload);
}

// 根据标签获取匹配的题目数量
export async function countQuestionsByTags(tagIds: string[]): Promise<{ count: number }> {
  const searchParams = new URLSearchParams();
  searchParams.set('tagIds', tagIds.join(','));
  return await http.get<{ count: number }>(`/preset-questions/count-by-tags?${searchParams.toString()}`);
}

// 按标签批量同步到面试题库
export async function batchSyncByTags(payload: {
  tagIds: string[];
  jobIds: string[];
}): Promise<{
  success: boolean;
  totalQuestions: number;
  totalJobs: number;
  syncedCount: number;
  skippedCount: number;
}> {
  return await http.post<{
    success: boolean;
    totalQuestions: number;
    totalJobs: number;
    syncedCount: number;
    skippedCount: number;
  }>('/preset-questions/batch-sync-by-tags', payload);
}