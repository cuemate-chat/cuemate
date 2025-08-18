import { CloseOutlined, FilterOutlined, SearchOutlined } from '@ant-design/icons';
import { Input, Modal, Select } from 'antd';
import { useEffect, useState } from 'react';
import { listTags } from '../api/questions';
import {
  SearchFilters,
  VectorDocument,
  deleteDocument,
  deleteJob,
  deleteQuestion,
  getRelatedDocuments,
  searchJobs,
  searchQuestions,
  searchResumes
} from '../api/vector';
import { message } from '../components/Message';

export default function VectorKnowledge() {
  const [searchResults, setSearchResults] = useState<VectorDocument[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [tags, setTags] = useState<{ id: string; name: string }[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({
    type: 'all',
    query: '',
    tagId: undefined,
    jobTitle: undefined,
    jobDescription: undefined,
    resumeTitle: undefined,
    resumeDescription: undefined,
    questionTitle: undefined,
    questionDescription: undefined,
    createdFrom: undefined,
    createdTo: undefined,
  });
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [currentDetailDoc, setCurrentDetailDoc] = useState<VectorDocument | null>(null);
  const [relatedData, setRelatedData] = useState<{
    jobs?: VectorDocument[];
    resumes?: VectorDocument[];
    questions?: VectorDocument[];
  } | null>(null);
  const [activeTab, setActiveTab] = useState('document'); // 控制标签页
  const [currentTab, setCurrentTab] = useState('jobs'); // 控制主标签页：jobs, resumes, questions

  // 获取标签列表和默认加载所有内容
  useEffect(() => {
    fetchTags();
    loadDocumentsByTab();
  }, [currentTab]); // 当标签页切换时重新加载数据

  // 根据当前标签页加载对应数据
  const loadDocumentsByTab = async () => {
    try {
      setLoading(true);
      let result;

      // 根据当前标签页调用不同的搜索函数，同时应用当前筛选条件
      if (currentTab === 'jobs') {
        result = await searchJobs({ ...filters, query: '' });
      } else if (currentTab === 'resumes') {
        result = await searchResumes({ ...filters, query: '' });
      } else if (currentTab === 'questions') {
        result = await searchQuestions({ ...filters, query: '' });
      } else {
        result = await searchJobs({ ...filters, query: '' });
      }

      if (result.success) {
        const list = result.results || [];
        setSearchResults(list);
        setTotalResults(list.length);
      } else {
        setSearchResults([]);
        setTotalResults(0);
      }
    } catch (error) {
      setSearchResults([]);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  };

  // 标签页切换处理
  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
    // 切换标签页时重置筛选条件
    setFilters({
      type: 'all',
      query: '',
      tagId: undefined,
      jobTitle: undefined,
      jobDescription: undefined,
      resumeTitle: undefined,
      resumeDescription: undefined,
      questionTitle: undefined,
      questionDescription: undefined,
      createdFrom: undefined,
      createdTo: undefined,
    });
    // 清空搜索结果
    setSearchResults([]);
    setTotalResults(0);
  };

  const fetchTags = async () => {
    try {
      const data = await listTags();
      setTags(data.items || []);
    } catch (error) {
      message.error('获取标签失败: ' + error);
    }
  };

  // 搜索文档
  const searchDocuments = async () => {
    try {
      setLoading(true);
      let result;

      // 根据当前标签页调用不同的搜索函数，同时应用搜索关键词和筛选条件
      if (currentTab === 'jobs') {
        result = await searchJobs(filters);
      } else if (currentTab === 'resumes') {
        result = await searchResumes(filters);
      } else if (currentTab === 'questions') {
        result = await searchQuestions(filters);
      } else {
        result = await searchJobs(filters);
      }

      if (result.success) {
        const list = result.results || [];
        setSearchResults(list);
        setTotalResults(list.length);
      } else {
        setSearchResults([]);
        setTotalResults(0);
        message.error('搜索失败:' + result.error);
      }
    } catch (error) {
      message.error('搜索出错:' + error);
      setSearchResults([]);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  };

  // 清除筛选条件
  const clearFilters = () => {
    setFilters({
      type: 'all',
      query: '',
      tagId: undefined,
      jobTitle: undefined,
      jobDescription: undefined,
      resumeTitle: undefined,
      resumeDescription: undefined,
      questionTitle: undefined,
      questionDescription: undefined,
      createdFrom: undefined,
      createdTo: undefined,
    });
    // 清除筛选后重新搜索
    setTimeout(() => {
      searchDocuments();
    }, 100);
  };

  const getDocumentName = (doc: VectorDocument): string => {
    if (doc.metadata.title) return doc.metadata.title;
    if (doc.metadata.type === 'jobs') return '岗位名称';
    if (doc.metadata.type === 'resumes') return '简历名称';
    if (doc.metadata.type === 'questions') return '押题名称';
    return '文档名称';
  };

  const showDetail = async (doc: VectorDocument) => {
    setCurrentDetailDoc(doc);
    setDetailModalVisible(true);
    setRelatedData(null);
    
    try {
      // 获取关联信息
      const result = await getRelatedDocuments(doc.id, doc.metadata.type === 'jobs' ? 'jobs' : 
        doc.metadata.type === 'questions' ? 'questions' : 
        doc.metadata.type === 'resumes' ? 'resumes' : 'default');
      
      if (result.success && result.related) {
        setRelatedData(result.related);
      }
    } catch (error) {
      message.error('获取关联信息失败:' + error);
    } finally {
      // setLoadingRelated(false); // This line is removed
    }
  };

  const handleDelete = async (doc: VectorDocument) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条数据吗？删除后无法恢复。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          let result;
          
          // 根据文档类型调用相应的删除 API
          if (doc.metadata.type === 'jobs') {
            result = await deleteJob(doc.id);
          } else if (doc.metadata.type === 'questions') {
            result = await deleteQuestion(doc.id);
          } else {
            result = await deleteDocument(doc.id, doc.metadata.type);
          }
          
          if (result.success) {
            // 从本地状态中移除
            setSearchResults(prev => prev.filter(d => d.id !== doc.id));
            setTotalResults(prev => prev - 1);
            message.success('删除成功');
          } else {
            message.error('删除失败: ' + result.error);
          }
        } catch (error) {
          message.error('删除失败: ' + error);
        }
      },
    });
  };

  const getDocumentTypeLabel = (type: string): string => {
    switch (type) {
      case 'jobs': return '岗位信息';
      case 'resumes': return '简历信息';
      case 'questions': return '押题信息';
      default: return '文档';
    }
  };

  const formatDate = (timestamp?: number | string): string => {
    if (!timestamp) return '未知时间';
    if (typeof timestamp === 'string') {
      return timestamp;
    }
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  const getSourceDisplayName = (source: string): string => {
    switch (source) {
      case 'job_description': return '岗位描述';
      case 'resume_content': return '简历内容';
      case 'interview_question': return '面试押题';
      default: return source;
    }
  };

  const getTypeDisplayName = (type: string): string => {
    switch (type) {
      case 'jobs': return '岗位';
      case 'resumes': return '简历';
      case 'questions': return '押题';
      default: return type;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ position: 'relative', zIndex: 1 }}>
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">向量知识库</h1>
          <p className="mt-2 text-slate-600">查询和检索存储在向量数据库中的知识内容</p>
        </div>

        {/* 主标签页 */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => handleTabChange('jobs')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                currentTab === 'jobs'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              岗位信息
            </button>
            <button
              onClick={() => handleTabChange('resumes')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                currentTab === 'resumes'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              简历信息
            </button>
            <button
              onClick={() => handleTabChange('questions')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                currentTab === 'questions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              面试押题
            </button>
          </nav>
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
                  className="w-full pl-10 pr-12 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && searchDocuments()}
                />
                {filters.query && (
                  <button
                    onClick={() => setFilters({ ...filters, query: '' })}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <CloseOutlined />
                  </button>
                )}
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 根据当前标签页显示不同的筛选字段 */}
                {currentTab === 'jobs' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">创建时间</label>
                      <div className="flex gap-2">
                        <Input
                          type="date"
                          value={filters.createdFrom ? new Date(filters.createdFrom).toISOString().slice(0,10) : ''}
                          onChange={(e) => {
                            const ts = e.target.value ? new Date(e.target.value + 'T00:00:00').getTime() : undefined;
                            setFilters({ ...filters, createdFrom: ts });
                          }}
                          style={{ height: '42px' }}
                        />
                        <Input
                          type="date"
                          value={filters.createdTo ? new Date(filters.createdTo).toISOString().slice(0,10) : ''}
                          onChange={(e) => {
                            const ts = e.target.value ? new Date(e.target.value + 'T23:59:59').getTime() : undefined;
                            setFilters({ ...filters, createdTo: ts });
                          }}
                          style={{ height: '42px' }}
                        />
                      </div>
                    </div>
                  </>
                )}

                {currentTab === 'resumes' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">创建时间</label>
                      <div className="flex gap-2">
                        <Input
                          type="date"
                          value={filters.createdFrom ? new Date(filters.createdFrom).toISOString().slice(0,10) : ''}
                          onChange={(e) => {
                            const ts = e.target.value ? new Date(e.target.value + 'T00:00:00').getTime() : undefined;
                            setFilters({ ...filters, createdFrom: ts });
                          }}
                          style={{ height: '42px' }}
                        />
                        <Input
                          type="date"
                          value={filters.createdTo ? new Date(filters.createdTo).toISOString().slice(0,10) : ''}
                          onChange={(e) => {
                            const ts = e.target.value ? new Date(e.target.value + 'T23:59:59').getTime() : undefined;
                            setFilters({ ...filters, createdTo: ts });
                          }}
                          style={{ height: '42px' }}
                        />
                      </div>
                    </div>
                  </>
                )}

                {currentTab === 'questions' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">押题标签</label>
                      <Select
                        value={filters.tagId}
                        onChange={(value) => setFilters({ ...filters, tagId: value })}
                        allowClear
                        placeholder="选择标签"
                        style={{ height: '42px', width: '100%' }}
                      >
                        {tags.map((tag) => (
                          <Select.Option key={tag.id} value={tag.id}>
                            {tag.name}
                          </Select.Option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">创建时间</label>
                      <div className="flex gap-2">
                        <Input
                          type="date"
                          value={filters.createdFrom ? new Date(filters.createdFrom).toISOString().slice(0,10) : ''}
                          onChange={(e) => {
                            const ts = e.target.value ? new Date(e.target.value + 'T00:00:00').getTime() : undefined;
                            setFilters({ ...filters, createdFrom: ts });
                          }}
                          style={{ height: '42px' }}
                        />
                        <Input
                          type="date"
                          value={filters.createdTo ? new Date(filters.createdTo).toISOString().slice(0,10) : ''}
                          onChange={(e) => {
                            const ts = e.target.value ? new Date(e.target.value + 'T23:59:59').getTime() : undefined;
                            setFilters({ ...filters, createdTo: ts });
                          }}
                          style={{ height: '42px' }}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* 筛选操作按钮 */}
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  × 清除筛选
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 搜索结果 */}
        {searchResults.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-medium text-slate-900">
                搜索结果 (共 {totalResults} 条)
              </h3>
            </div>
            <div className="divide-y divide-slate-200">
              {searchResults.map((doc, index) => (
                <div key={doc.id} className="p-6 hover:bg-slate-50 relative">
                  {/* 左上角序号 */}
                  <div className="absolute left-0 top-0">
                    <div className="bg-blue-600 text-white text-[10px] font-semibold px-2 py-1 rounded-br">
                      {index + 1}
                    </div>
                    <div className="w-0 h-0 border-t-8 border-t-blue-700 border-r-8 border-r-transparent"></div>
                  </div>
                  
                  {/* 右上角按钮 */}
                  <div className="absolute right-6 top-6 flex items-center gap-2">
                    <button
                      onClick={() => showDetail(doc)}
                      className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      详情
                    </button>
                    <button
                      onClick={() => handleDelete(doc)}
                      className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      删除
                    </button>
                  </div>
                  
                  <div className="flex-1 pr-32 ml-8">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {getDocumentTypeLabel(doc.metadata.type)}
                      </span>
                      <span className="text-sm text-slate-500">
                        相关度: {(Math.max(0, Math.min(1, Number.isFinite(doc.score) ? doc.score : 0)) * 100).toFixed(1)}%
                      </span>
                      {doc.metadata.tagName && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                          {doc.metadata.tagName}
                        </span>
                      )}
                    </div>
                    
                    {/* 名称 */}
                    <h4 className="text-lg font-medium text-slate-900 mb-2">
                      {getDocumentName(doc)}
                    </h4>
                    
                    {/* 描述内容 */}
                    <div className="mb-3">
                      <p className="text-slate-600 whitespace-pre-wrap">
                        {doc.content.length > 200 ? (
                          <>
                            {doc.content.substring(0, 200)}...
                            <button
                              onClick={() => {
                                // 创建弹出框显示完整内容
                                const modal = document.createElement('div');
                                modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
                                modal.innerHTML = `
                                  <div class="bg-white rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-y-auto">
                                    <div class="flex justify-between items-center mb-4">
                                      <h3 class="text-lg font-medium">${getDocumentName(doc)}</h3>
                                      <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
                                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                        </svg>
                                      </button>
                                    </div>
                                    <div class="whitespace-pre-wrap text-sm">${doc.content}</div>
                                  </div>
                                `;
                                document.body.appendChild(modal);
                                modal.addEventListener('click', (e) => {
                                  if (e.target === modal) modal.remove();
                                });
                              }}
                              className="ml-2 text-blue-600 hover:text-blue-800 underline"
                            >
                              查看完整内容
                            </button>
                          </>
                        ) : (
                          doc.content
                        )}
                      </p>
                    </div>
                    
                    {/* 基础信息 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-slate-500">
                      <span>创建时间: {doc.metadata.timestamp || doc.metadata.createdAt ? formatDate(doc.metadata.createdAt || doc.metadata.timestamp) : '未知'}</span>
                      {doc.metadata.source && <span>来源: {getSourceDisplayName(doc.metadata.source)}</span>}
                      {doc.metadata.type && <span>类型: {getTypeDisplayName(doc.metadata.type)}</span>}
                      {doc.metadata.chunkIndex !== undefined && (
                        <span>
                          分块: {doc.metadata.chunkIndex + 1}/{doc.metadata.totalChunks}
                        </span>
                      )}
                      <span className="md:col-span-2 lg:col-span-2">ID: {doc.id}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 空状态 */}
        {!loading && searchResults.length === 0 && (
          <div className="text-center py-12">
            <SearchOutlined className="mx-auto text-6xl text-slate-400" />
            <h3 className="mt-2 text-sm font-medium text-slate-900">
              {filters.query ? '未找到相关结果' : '暂无数据'}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {filters.query ? '请尝试其他关键词或调整筛选条件' : '请先添加一些数据或进行搜索'}
            </p>
          </div>
        )}

        {/* 详情弹窗 */}
        <Modal
          title="详细信息"
          open={detailModalVisible}
          onCancel={() => setDetailModalVisible(false)}
          footer={null}
          width={960}
          centered
          zIndex={5000}
          styles={{ body: { height: '60vh', overflow: 'auto' } }}
        >
          {currentDetailDoc && (
            <div className="space-y-6">
              {/* 关联信息标签页 */}
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab('document')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'document'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    文档信息
                  </button>
                  <button
                    onClick={() => setActiveTab('resumes')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'resumes'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    相关简历 ({relatedData?.resumes?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveTab('questions')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'questions'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    相关押题 ({relatedData?.questions?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveTab('jobs')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'jobs'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    相关岗位 ({relatedData?.jobs?.length || 0})
                  </button>
                </nav>
              </div>

              {/* 标签页内容 */}
              {activeTab === 'document' && (
                <div className="space-y-4">
                  {/* 文档基本信息 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="md:col-span-2">
                      <span className="font-medium text-gray-700">ID:</span>
                      <span className="ml-2 text-gray-900 break-all">{currentDetailDoc.id}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">类型:</span>
                      <span className="ml-2 text-gray-900">{getTypeDisplayName(currentDetailDoc.metadata.type || '')}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">来源:</span>
                      <span className="ml-2 text-gray-900">{getSourceDisplayName(currentDetailDoc.metadata.source || '')}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">创建时间:</span>
                      <span className="ml-2 text-gray-900">
                        {currentDetailDoc.metadata.timestamp || currentDetailDoc.metadata.createdAt
                          ? formatDate(currentDetailDoc.metadata.createdAt || currentDetailDoc.metadata.timestamp)
                          : '未知'}
                      </span>
                    </div>
                  </div>

                  {/* 文档内容 */}
                  <div>
                    <div className="font-medium text-gray-700 mb-2">内容:</div>
                    <div className="bg-gray-50 p-4 rounded-md text-sm text-gray-900 whitespace-pre-wrap max-h-60 overflow-y-auto">
                      {currentDetailDoc.content}
                    </div>
                  </div>
                </div>
              )}

              {/* 相关简历标签页 */}
              {activeTab === 'resumes' && (
                <div className="space-y-4">
                  {relatedData?.resumes && relatedData.resumes.length > 0 ? (
                    relatedData.resumes.map((resume, index) => (
                      <div key={resume.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-900">{resume.metadata.title || '简历标题'}</h4>
                          <span className="text-xs text-gray-500">#{index + 1}</span>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          <span className="font-medium">ID:</span> {resume.id}
                        </div>
                        <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-32 overflow-y-auto">
                          {resume.content}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-8">暂无相关简历信息</div>
                  )}
                </div>
              )}

              {/* 相关押题标签页 */}
              {activeTab === 'questions' && (
                <div className="space-y-4">
                  {relatedData?.questions && relatedData.questions.length > 0 ? (
                    relatedData.questions.map((question, index) => (
                      <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-900">{question.metadata.title || '押题标题'}</h4>
                          <span className="text-xs text-gray-500">#{index + 1}</span>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          <span className="font-medium">ID:</span> {question.id}
                          {question.metadata.tagName && (
                            <span className="ml-4">
                              <span className="font-medium">标签:</span> {question.metadata.tagName}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-32 overflow-y-auto">
                          {question.content}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-8">暂无相关押题信息</div>
                  )}
                </div>
              )}

              {/* 相关岗位标签页 */}
              {activeTab === 'jobs' && (
                <div className="space-y-4">
                  {relatedData?.jobs && relatedData.jobs.length > 0 ? (
                    relatedData.jobs.map((job, index) => (
                      <div key={job.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-900">{job.metadata.title || '岗位标题'}</h4>
                          <span className="text-xs text-gray-500">#{index + 1}</span>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          <span className="font-medium">ID:</span> {job.id}
                        </div>
                        <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-32 overflow-y-auto">
                          {job.content}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-8">暂无相关岗位信息</div>
                  )}
                </div>
              )}
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}
