const RAG_SERVICE_BASE = import.meta.env.VITE_RAG_SERVICE_BASE || 'http://localhost:3003';

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
    chunkIndex?: number;
    totalChunks?: number;
    createdAt?: number;
    timestamp?: string;
    source?: string;
    category?: string;
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

    let url = `${RAG_SERVICE_BASE}/search/jobs?query=${encodeURIComponent(filters.query || '')}&k=1000`;
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

    let url = `${RAG_SERVICE_BASE}/search/questions?query=${encodeURIComponent(filters.query || '')}&k=1000`;
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

    let url = `${RAG_SERVICE_BASE}/search/resumes?query=${encodeURIComponent(filters.query || '')}&k=1000`;
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

// 通用搜索：根据type分发到对应路由
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
    // 根据文档类型确定集合名称
    let collection = 'default';
    if (!!type) {
      collection = type;
    }

    // 使用 by-filter 端点，通过 ID 过滤删除
    const url = `${RAG_SERVICE_BASE}/delete/by-filter`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        where: { id: docId },
        collection: collection,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        return { success: true };
      } else {
        return { success: false, error: data.error || '删除失败' };
      }
    } else {
      const errorText = await response.text();
      return { success: false, error: `请求失败: ${response.status} ${errorText}` };
    }
  } catch (error) {
    return { success: false, error: `网络错误: ${error}` };
  }
};

// 删除岗位
export const deleteJob = async (docId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // 使用 by-filter 端点，通过 ID 过滤删除
    const url = `${RAG_SERVICE_BASE}/delete/by-filter`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        where: { id: docId },
        collection: 'jobs',
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        return { success: true };
      } else {
        return { success: false, error: data.error || '删除失败' };
      }
    } else {
      const errorText = await response.text();
      return { success: false, error: `请求失败: ${response.status} ${errorText}` };
    }
  } catch (error) {
    return { success: false, error: `网络错误: ${error}` };
  }
};

// 删除面试押题
export const deleteQuestion = async (
  docId: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    // 使用 by-filter 端点，通过 ID 过滤删除
    const url = `${RAG_SERVICE_BASE}/delete/by-filter`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        where: { id: docId },
        collection: 'questions',
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        return { success: true };
      } else {
        return { success: false, error: data.error || '删除失败' };
      }
    } else {
      const errorText = await response.text();
      return { success: false, error: `请求失败: ${response.status} ${errorText}` };
    }
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
    const url = `${RAG_SERVICE_BASE}/documents/${docId}/related${collection ? `?collection=${collection}` : ''}`;
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
