import { config } from '../config';
import { http } from './http';

// 从环境变量获取 RAG 服务地址，如果没有则使用默认值
const RAG_SERVICE_URL = config.RAG_SERVICE_URL || 'http://localhost:3003';

export interface VectorDocument {
  id: string;
  content: string;
  metadata: {
    type: string;
    title?: string;
    jobId?: string;
    resumeId?: string;
    questionId?: string;
    tagId?: string;
    tagName?: string;
    jobTitle?: string;
    resumeTitle?: string;
    filePath?: string;
    chunkIndex?: number;
    totalChunks?: number;
    createdAt?: number;
    timestamp?: string;
    source?: string;
    category?: string;
    // 相关数量字段
    relatedJobs?: number;
    relatedResumes?: number;
    relatedQuestions?: number;
    // AI 向量记录字段
    note_type?: string;
    interview_id?: string;
    resource_id?: string;
    question_id?: string;
    question?: string;
    answer?: string;
    asked_question?: string;
    candidate_answer?: string;
    pros?: string;
    cons?: string;
    suggestions?: string;
    key_points?: string;
    assessment?: string;
    reference_answer?: string;
    other_id?: string;
    other_content?: string;
    created_at?: number;
  };
  score: number;
}

export interface SearchFilters {
  type: string;
  query: string;
  tagId?: string;
  jobTitle?: string;
  jobDescription?: string;
  resumeTitle?: string;
  resumeDescription?: string;
  questionTitle?: string;
  questionDescription?: string;
  createdFrom?: number; // 时间戳（起）
  createdTo?: number; // 时间戳（止）
}

export interface SearchResponse {
  success: boolean;
  results: VectorDocument[];
  total: number;
  error?: string;
}

export interface SyncStatusResponse {
  job: { synced: boolean } | { total: number; synced: number; unsynced: number };
  resume: { synced: boolean } | { total: number; synced: number; unsynced: number };
  questions: { total: number; synced: number; unsynced: number };
}

export const getSyncStatus = async (jobId?: string): Promise<SyncStatusResponse> => {
  const url = jobId
    ? `/vectors/sync-status?jobId=${encodeURIComponent(jobId)}`
    : '/vectors/sync-status';
  const data = await http.get(url);
  return data as SyncStatusResponse;
};

export async function syncAll(jobId?: string): Promise<any> {
  const response = await http.post('/vectors/sync-all', { jobId });
  return response;
}

export async function cleanAllVectorData(): Promise<{
  success: boolean;
  message: string;
  totalDeleted: number;
  results: any;
  error?: string;
}> {
  const response = await http.post('/vectors/clean-all');
  return response;
}

// 搜索所有文档
export const searchAllDocuments = async (): Promise<SearchResponse> => {
  return searchJobs({ type: 'jobs', query: '' } as any);
};

// 搜索岗位信息
export const searchJobs = async (filters: SearchFilters): Promise<SearchResponse> => {
  try {
    const filterObj: Record<string, any> = {};
    // 关键词型筛选，后端做包含匹配与打分增强
    if (filters.jobTitle) filterObj.titleKeyword = filters.jobTitle;
    if (filters.jobDescription) filterObj.descriptionKeyword = filters.jobDescription;
    // 时间范围筛选 - 修复时间戳格式
    if (filters.createdFrom || filters.createdTo) {
      if (filters.createdFrom) filterObj.createdFrom = filters.createdFrom;
      if (filters.createdTo) filterObj.createdTo = filters.createdTo;
    }

    let url = `${RAG_SERVICE_URL}/search/jobs?query=${encodeURIComponent(filters.query || '')}&k=1000`;
    if (Object.keys(filterObj).length > 0) {
      url += `&filter=${encodeURIComponent(JSON.stringify(filterObj))}`;
    }

    const response = await fetch(url);

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        const results = data.results || [];
        return {
          success: true,
          results,
          total: results.length,
        };
      } else {
        return {
          success: false,
          results: [],
          total: 0,
          error: data.error || '搜索失败',
        };
      }
    } else {
      const errorText = await response.text();
      return {
        success: false,
        results: [],
        total: 0,
        error: `请求失败: ${response.status} ${errorText}`,
      };
    }
  } catch (error) {
    return {
      success: false,
      results: [],
      total: 0,
      error: `网络错误: ${error}`,
    };
  }
};

// 搜索面试押题
export const searchQuestions = async (filters: SearchFilters): Promise<SearchResponse> => {
  try {
    const filterObj: Record<string, any> = {};
    if (filters.tagId) filterObj.tagId = filters.tagId; // 仅押题页支持标签
    if (filters.questionTitle) filterObj.titleKeyword = filters.questionTitle;
    if (filters.questionDescription) filterObj.descriptionKeyword = filters.questionDescription;
    // 时间范围筛选 - 修复时间戳格式
    if (filters.createdFrom || filters.createdTo) {
      if (filters.createdFrom) filterObj.createdFrom = filters.createdFrom;
      if (filters.createdTo) filterObj.createdTo = filters.createdTo;
    }

    let url = `${RAG_SERVICE_URL}/search/questions?query=${encodeURIComponent(filters.query || '')}&k=1000`;
    if (Object.keys(filterObj).length > 0) {
      url += `&filter=${encodeURIComponent(JSON.stringify(filterObj))}`;
    }

    const response = await fetch(url);

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        const results = data.results || [];
        return {
          success: true,
          results,
          total: results.length,
        };
      } else {
        return {
          success: false,
          results: [],
          total: 0,
          error: data.error || '搜索失败',
        };
      }
    } else {
      const errorText = await response.text();
      return {
        success: false,
        results: [],
        total: 0,
        error: `请求失败: ${response.status} ${errorText}`,
      };
    }
  } catch (error) {
    return {
      success: false,
      results: [],
      total: 0,
      error: `网络错误: ${error}`,
    };
  }
};

// 搜索简历信息
export const searchResumes = async (filters: SearchFilters): Promise<SearchResponse> => {
  try {
    const filterObj: Record<string, any> = {};
    if (filters.resumeTitle) filterObj.titleKeyword = filters.resumeTitle;
    if (filters.resumeDescription) filterObj.descriptionKeyword = filters.resumeDescription;
    // 时间范围筛选 - 修复时间戳格式
    if (filters.createdFrom || filters.createdTo) {
      if (filters.createdFrom) filterObj.createdFrom = filters.createdFrom;
      if (filters.createdTo) filterObj.createdTo = filters.createdTo;
    }

    let url = `${RAG_SERVICE_URL}/search/resumes?query=${encodeURIComponent(filters.query || '')}&k=1000`;
    if (Object.keys(filterObj).length > 0) {
      url += `&filter=${encodeURIComponent(JSON.stringify(filterObj))}`;
    }

    const response = await fetch(url);

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        const results = data.results || [];
        return {
          success: true,
          results,
          total: results.length,
        };
      } else {
        return {
          success: false,
          results: [],
          total: 0,
          error: data.error || '搜索失败',
        };
      }
    } else {
      const errorText = await response.text();
      return {
        success: false,
        results: [],
        total: 0,
        error: `请求失败: ${response.status} ${errorText}`,
      };
    }
  } catch (error) {
    return {
      success: false,
      results: [],
      total: 0,
      error: `网络错误: ${error}`,
    };
  }
};

// 通用搜索：根据 type 分发到对应路由
export const searchDocuments = async (filters: SearchFilters): Promise<SearchResponse> => {
  if (filters.type === 'jobs') return searchJobs(filters);
  if (filters.type === 'resumes') return searchResumes(filters);
  if (filters.type === 'questions') return searchQuestions(filters);
  // 默认：返回空集或某一集合
  return searchJobs({ ...filters, type: 'jobs' });
};

// 智能搜索（根据类型选择不同的搜索方法）
export const smartSearch = async (filters: SearchFilters): Promise<SearchResponse> => {
  if (filters.type === 'jobs') {
    return await searchJobs(filters);
  } else if (filters.type === 'questions') {
    return await searchQuestions(filters);
  } else if (filters.type === 'resumes') {
    return await searchResumes(filters);
  } else {
    return await searchDocuments(filters);
  }
};

// 删除文档
export const deleteDocument = async (
  docId: string,
  type?: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    const data: any = await http.post('/vectors/delete', { id: docId, type });
    return data?.success ? { success: true } : { success: false, error: data?.error || '删除失败' };
  } catch (error) {
    return { success: false, error: `网络错误: ${error}` };
  }
};

// 删除岗位
export const deleteJob = async (docId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const data: any = await http.post('/vectors/delete', { id: docId, type: 'jobs' });
    return data?.success ? { success: true } : { success: false, error: data?.error || '删除失败' };
  } catch (error) {
    return { success: false, error: `网络错误: ${error}` };
  }
};

// 删除面试押题
export const deleteQuestion = async (
  docId: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    const data: any = await http.post('/vectors/delete', { id: docId, type: 'questions' });
    return data?.success ? { success: true } : { success: false, error: data?.error || '删除失败' };
  } catch (error) {
    return { success: false, error: `网络错误: ${error}` };
  }
};

// 获取文档的关联信息
export const getRelatedDocuments = async (
  docId: string,
  collection?: string,
): Promise<{
  success: boolean;
  document?: VectorDocument;
  related?: {
    jobs?: VectorDocument[];
    resumes?: VectorDocument[];
    questions?: VectorDocument[];
  };
  error?: string;
}> => {
  try {
    const url = `${RAG_SERVICE_URL}/documents/${docId}/related${collection ? `?collection=${collection}` : ''}`;
    const response = await fetch(url);

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        return {
          success: true,
          document: data.document,
          related: data.related,
        };
      } else {
        return { success: false, error: data.error || '获取关联信息失败' };
      }
    } else {
      const errorText = await response.text();
      return { success: false, error: `请求失败: ${response.status} ${errorText}` };
    }
  } catch (error) {
    return { success: false, error: `网络错误: ${error}` };
  }
};

// 其他文件相关 API

// 上传其他文件
export const uploadOtherFile = async (file: File): Promise<{ success: boolean; message: string; id?: string; error?: string }> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await http.post('/vectors/other-files/upload', formData);
    return response as { success: boolean; message: string; id?: string; error?: string };
  } catch (error) {
    return { success: false, message: '', error: `上传失败: ${error}` };
  }
};

// 添加其他文本内容
export const addOtherFileText = async (title: string, content: string): Promise<{ success: boolean; message: string; id?: string; error?: string }> => {
  try {
    const response = await http.post('/vectors/other-files/text', { title, content });
    return response as { success: boolean; message: string; id?: string; error?: string };
  } catch (error) {
    return { success: false, message: '', error: `添加失败: ${error}` };
  }
};

// 获取其他文件列表
export const listOtherFiles = async (): Promise<SearchResponse> => {
  try {
    const url = `${RAG_SERVICE_URL}/search/other-files?query=&k=1000`;
    const response = await fetch(url);

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        const results = data.results || [];
        return {
          success: true,
          results,
          total: results.length,
        };
      } else {
        return {
          success: false,
          results: [],
          total: 0,
          error: data.error || '获取列表失败',
        };
      }
    } else {
      const errorText = await response.text();
      return {
        success: false,
        results: [],
        total: 0,
        error: `请求失败: ${response.status} ${errorText}`,
      };
    }
  } catch (error) {
    return {
      success: false,
      results: [],
      total: 0,
      error: `网络错误: ${error}`,
    };
  }
};

// 删除其他文件
export const deleteOtherFile = async (docId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const data: any = await http.post('/vectors/delete', { id: docId, type: 'other-files' });
    return data?.success ? { success: true } : { success: false, error: data?.error || '删除失败' };
  } catch (error) {
    return { success: false, error: `网络错误: ${error}` };
  }
};

// 获取 AI 向量记录列表
export const listAIVectorRecords = async (params?: {
  query?: string;
  note_type?: string;
  createdFrom?: number;
  createdTo?: number;
}): Promise<SearchResponse> => {
  try {
    let url = `${RAG_SERVICE_URL}/search/ai-vector-records?k=1000`;
    if (params?.query) url += `&query=${encodeURIComponent(params.query)}`;
    if (params?.note_type) url += `&note_type=${params.note_type}`;
    if (params?.createdFrom) url += `&createdFrom=${params.createdFrom}`;
    if (params?.createdTo) url += `&createdTo=${params.createdTo}`;

    const response = await fetch(url);

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        const results = data.results || [];
        return {
          success: true,
          results,
          total: results.length,
        };
      } else {
        return {
          success: false,
          results: [],
          total: 0,
          error: data.error || '获取列表失败',
        };
      }
    } else {
      const errorText = await response.text();
      return {
        success: false,
        results: [],
        total: 0,
        error: `请求失败: ${response.status} ${errorText}`,
      };
    }
  } catch (error) {
    return {
      success: false,
      results: [],
      total: 0,
      error: `网络错误: ${error}`,
    };
  }
};

// 删除 AI 向量记录
export const deleteAIVectorRecord = async (docId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(`${RAG_SERVICE_URL}/ai-vector-records/${docId}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      const data = await response.json();
      return data?.success ? { success: true } : { success: false, error: data?.error || '删除失败' };
    } else {
      const errorText = await response.text();
      return { success: false, error: `删除失败: ${response.status} ${errorText}` };
    }
  } catch (error) {
    return { success: false, error: `网络错误: ${error}` };
  }
};
