import { CloseOutlined, FilterOutlined, SearchOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { message } from '../components/Message';

interface VectorDocument {
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
    userId?: string;
    chunkIndex?: number;
    totalChunks?: number;
    createdAt?: number;
    source?: string;
  };
  score: number;
}

interface SearchFilters {
  type: string;
  query: string;
  tagId?: string;
  userId?: string;
  jobId?: string;
}

export default function VectorKnowledge() {
  const [documents, setDocuments] = useState<VectorDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    type: 'all',
    query: '',
  });
  const [tags, setTags] = useState<Array<{ id: string; name: string }>>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [total, setTotal] = useState(0);

  // 获取标签列表和默认加载所有内容
  useEffect(() => {
    fetchTags();
    loadAllDocuments(); // 默认加载所有内容
  }, []);

  // 当页码改变时重新搜索（暂时禁用，因为 RAG Service 可能不支持 offset）
  // useEffect(() => {
  //   if (filters.query.trim() || filters.type !== 'all') {
  //     searchDocuments();
  //   }
  // }, [currentPage, pageSize]);

  const loadAllDocuments = async () => {
    setLoading(true);
    try {
      const base = import.meta.env.VITE_RAG_SERVICE_BASE || 'http://localhost:3003';
      const url = `${base}/search?query=&topK=1000`; // 空查询返回所有内容
      
      console.log('Loading all documents with URL:', url);
      const response = await fetch(url);
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Response data:', data);
        
        if (data.success) {
          setDocuments(data.results || []);
          setTotal(data.total || data.results?.length || 0);
        } else {
          console.error('Load all documents failed:', data.error);
          message.error(data.error || '加载所有文档失败');
        }
      } else {
        const errorText = await response.text();
        console.error('Load all documents request failed:', response.status, errorText);
        message.error(`加载所有文档请求失败: ${response.status}`);
      }
    } catch (error) {
      console.error('Load all documents error:', error);
      message.error('加载所有文档出错，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      // 使用正确的 API 基础路径
      const base = import.meta.env.VITE_API_BASE || 'http://localhost:3004';
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.warn('No token found, skipping tags fetch');
        return;
      }

      const response = await fetch(`${base}/tags`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setTags(data.items || []);
      } else if (response.status === 401) {
        console.warn('Unauthorized, token may be expired');
      }
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    }
  };

  const searchDocuments = async () => {
    if (!filters.query.trim() && filters.type === 'all') {
      // 如果没有查询条件，加载所有内容
      loadAllDocuments();
      return;
    }

    setLoading(true);
    try {
      const base = import.meta.env.VITE_RAG_SERVICE_BASE || 'http://localhost:3003';
      let url = `${base}/search?query=${encodeURIComponent(filters.query)}&topK=1000`;
      
      // 根据类型选择不同的端点
      if (filters.type === 'jobs') {
        url = `${base}/jobs/search?query=${encodeURIComponent(filters.query)}&topK=1000`;
        if (filters.jobId) url += `&jobId=${filters.jobId}`;
        if (filters.userId) url += `&userId=${filters.userId}`;
      } else if (filters.type === 'questions') {
        url = `${base}/questions/search?query=${encodeURIComponent(filters.query)}&topK=1000`;
        if (filters.jobId) url += `&jobId=${filters.jobId}`;
        if (filters.tagId) url += `&tagId=${filters.tagId}`;
        if (filters.userId) url += `&userId=${filters.userId}`;
      } else if (filters.type === 'documents') {
        url = `${base}/search?query=${encodeURIComponent(filters.query)}&topK=1000`;
        if (filters.tagId) url += `&filter=${encodeURIComponent(JSON.stringify({ tagId: filters.tagId }))}`;
      }

      console.log('Searching with URL:', url);
      const response = await fetch(url);
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Response data:', data);
        
        if (data.success) {
          setDocuments(data.results || []);
          setTotal(data.total || data.results?.length || 0);
          if (data.results?.length === 0) {
            message.info('未找到相关数据');
          }
        } else {
          console.error('Search failed:', data.error);
          message.error(data.error || '搜索失败');
        }
      } else {
        const errorText = await response.text();
        console.error('Search request failed:', response.status, errorText);
        message.error(`搜索请求失败: ${response.status}`);
      }
    } catch (error) {
      console.error('Search error:', error);
      message.error('搜索出错，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      type: 'all',
      query: '',
    });
    setDocuments([]);
    setTotal(0);
  };

  const getDocumentTitle = (doc: VectorDocument): string => {
    if (doc.metadata.title) return doc.metadata.title;
    if (doc.metadata.type === 'job') return '岗位信息';
    if (doc.metadata.type === 'resume') return '简历内容';
    if (doc.metadata.type === 'interview_question') return '面试押题';
    return '文档内容';
  };

  const getDocumentTypeLabel = (type: string): string => {
    switch (type) {
      case 'job': return '岗位';
      case 'resume': return '简历';
      case 'interview_question': return '押题';
      default: return '文档';
    }
  };

  const formatDate = (timestamp?: number): string => {
    if (!timestamp) return '未知时间';
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">向量知识库</h1>
          <p className="mt-2 text-slate-600">查询和检索存储在向量数据库中的知识内容</p>
        </div>

        {/* 搜索区域 */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* 搜索输入框 */}
            <div className="flex-1">
              <div className="relative">
                <SearchOutlined className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="输入关键词搜索知识内容..."
                  value={filters.query}
                  onChange={(e) => setFilters({ ...filters, query: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && searchDocuments()}
                />
              </div>
            </div>

            {/* 搜索按钮 */}
            <button
              onClick={searchDocuments}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  搜索中...
                </>
              ) : (
                <>
                  <SearchOutlined />
                  搜索
                </>
              )}
            </button>

            {/* 筛选按钮 */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 border rounded-lg flex items-center gap-2 ${
                showFilters
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
            <FilterOutlined />
            筛选
            </button>
          </div>

          {/* 筛选条件 */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 数据类型 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">数据类型</label>
                  <select
                    value={filters.type}
                    onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">全部类型</option>
                    <option value="jobs">岗位信息</option>
                    <option value="questions">面试押题</option>
                    <option value="documents">通用文档</option>
                  </select>
                </div>

                {/* 标签筛选 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">标签</label>
                  <select
                    value={filters.tagId || ''}
                    onChange={(e) => setFilters({ ...filters, tagId: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">全部标签</option>
                    {tags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 用户ID */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">用户ID</label>
                  <input
                    type="text"
                    placeholder="输入用户ID"
                    value={filters.userId || ''}
                    onChange={(e) => setFilters({ ...filters, userId: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* 岗位ID */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">岗位ID</label>
                  <input
                    type="text"
                    placeholder="输入岗位ID"
                    value={filters.jobId || ''}
                    onChange={(e) => setFilters({ ...filters, jobId: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* 清除筛选按钮 */}
              <div className="mt-4 flex justify-end">
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 flex items-center gap-2"
                >
                  <CloseOutlined />
                  清除筛选
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 搜索结果 */}
        {documents.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-medium text-slate-900">
                搜索结果 (共 {total} 条)
              </h3>
            </div>
            <div className="divide-y divide-slate-200">
              {documents.map((doc) => (
                <div key={doc.id} className="p-6 hover:bg-slate-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {getDocumentTypeLabel(doc.metadata.type)}
                        </span>
                        <span className="text-sm text-slate-500">
                          相关度: {(doc.score * 100).toFixed(1)}%
                        </span>
                        {doc.metadata.tagName && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                            {doc.metadata.tagName}
                          </span>
                        )}
                      </div>
                      <h4 className="text-lg font-medium text-slate-900 mb-2">
                        {getDocumentTitle(doc)}
                      </h4>
                      <p className="text-slate-600 mb-3 line-clamp-3">{doc.content}</p>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span>ID: {doc.id}</span>
                        {doc.metadata.createdAt && (
                          <span>创建时间: {formatDate(doc.metadata.createdAt)}</span>
                        )}
                        {doc.metadata.chunkIndex !== undefined && (
                          <span>
                            分块: {doc.metadata.chunkIndex + 1}/{doc.metadata.totalChunks}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            

          </div>
        )}

        {/* 空状态 */}
        {!loading && documents.length === 0 && (
          <div className="text-center py-12">
            <SearchOutlined className="mx-auto text-6xl text-slate-400" />
            <h3 className="mt-2 text-sm font-medium text-slate-900">
              {filters.query ? '未找到相关结果' : '暂无数据'}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {filters.query 
                ? '尝试调整搜索关键词或筛选条件'
                : '请先添加一些岗位、简历或面试押题数据'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
