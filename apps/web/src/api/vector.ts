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
  questionTitle?: string;
}

export interface SearchResponse {
  success: boolean;
  results: VectorDocument[];
  total: number;
  error?: string;
}

// 搜索所有文档
export const searchAllDocuments = async (): Promise<SearchResponse> => {
  try {
    const url = `${RAG_SERVICE_BASE}/search?query=&topK=1000`;
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

// 搜索岗位信息
export const searchJobs = async (filters: SearchFilters): Promise<SearchResponse> => {
  try {
    const filterObj: Record<string, any> = {};
    if (filters.jobTitle) filterObj.title = filters.jobTitle;

    let url = `${RAG_SERVICE_BASE}/search?query=${encodeURIComponent(filters.query || '')}&topK=1000&collection=jobs`;
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
    if (filters.tagId) filterObj.tagId = filters.tagId;
    if (filters.questionTitle) filterObj.title = filters.questionTitle;

    let url = `${RAG_SERVICE_BASE}/search?query=${encodeURIComponent(filters.query || '')}&topK=1000&collection=questions`;
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
    if (filters.jobTitle) filterObj.title = filters.jobTitle;
    if (filters.tagId) filterObj.tagId = filters.tagId;

    let url = `${RAG_SERVICE_BASE}/search?query=${encodeURIComponent(filters.query || '')}&topK=1000&collection=resumes`;
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

// 通用搜索
export const searchDocuments = async (filters: SearchFilters): Promise<SearchResponse> => {
  try {
    let url = `${RAG_SERVICE_BASE}/search?query=${encodeURIComponent(filters.query)}&topK=1000`;
    if (filters.tagId) {
      url += `&filter=${encodeURIComponent(JSON.stringify({ tagId: filters.tagId }))}`;
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
