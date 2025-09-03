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
import FullScreenOverlay from '../components/FullScreenOverlay';
import { WarningIcon } from '../components/Icons';
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
  const [currentTab, setCurrentTab] = useState('jobs'); // 控制主标签页：jobs, resumes, questions, sync-status
  
  // 同步和清空的加载状态
  const [syncLoading, setSyncLoading] = useState(false);
  const [cleanLoading, setCleanLoading] = useState(false);

  // 获取标签列表和默认加载所有内容
  useEffect(() => {
    fetchTags();
    if (currentTab !== 'sync-status') {
      loadDocumentsByTab();
    }
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
        // 为每个文档添加相关数量信息
        const enrichedList = await Promise.all(
          list.map(async (doc) => {
            try {
              const relatedResult = await getRelatedDocuments(doc.id, doc.metadata.type);
              if (relatedResult.success && relatedResult.related) {
                // 从关联数据推断岗位/简历标题
                const firstJob = relatedResult.related.jobs?.[0];
                const firstResume = relatedResult.related.resumes?.[0];
                return {
                  ...doc,
                  metadata: {
                    ...doc.metadata,
                    relatedJobs: relatedResult.related.jobs?.length || 0,
                    relatedResumes: relatedResult.related.resumes?.length || 0,
                    relatedQuestions: relatedResult.related.questions?.length || 0,
                    jobTitle: firstJob?.metadata?.title,
                    resumeTitle: firstResume?.metadata?.title,
                  }
                };
              }
            } catch (error) {
              console.error('获取相关文档失败:', error);
            }
            return doc;
          })
        );
        setSearchResults(enrichedList);
        setTotalResults(enrichedList.length);
      } else {
        setSearchResults([]);
        setTotalResults(0);
      }
    } catch (error) {
      console.error('搜索出错:', error);
      setSearchResults([]);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  };

  // 标签页切换处理
  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
    if (tab !== 'sync-status') {
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
    }
  };

  const fetchTags = async () => {
    try {
      const data = await listTags();
      setTags(data.items || []);
    } catch (error) {
      console.error('获取标签失败:', error);
    }
  };

  // 搜索文档（支持传入局部覆盖，便于在交互事件里立刻生效）
  const searchDocuments = async (overrides?: Partial<SearchFilters>) => {
    try {
      setLoading(true);
      let result;
      const finalFilters: SearchFilters = overrides ? { ...filters, ...overrides } : filters;
      if (overrides) {
        setFilters(finalFilters);
      }

      // 根据当前标签页调用不同的搜索函数，同时应用搜索关键词和筛选条件
      if (currentTab === 'jobs') {
        result = await searchJobs(finalFilters);
      } else if (currentTab === 'resumes') {
        result = await searchResumes(finalFilters);
      } else if (currentTab === 'questions') {
        result = await searchQuestions(finalFilters);
      } else {
        result = await searchJobs(finalFilters);
      }

      if (result.success) {
        const list = result.results || [];
        // 为每个文档添加相关数量信息
        const enrichedList = await Promise.all(
          list.map(async (doc) => {
            try {
              const relatedResult = await getRelatedDocuments(doc.id, doc.metadata.type);
              if (relatedResult.success && relatedResult.related) {
                const firstJob = relatedResult.related.jobs?.[0];
                const firstResume = relatedResult.related.resumes?.[0];
                return {
                  ...doc,
                  metadata: {
                    ...doc.metadata,
                    relatedJobs: relatedResult.related.jobs?.length || 0,
                    relatedResumes: relatedResult.related.resumes?.length || 0,
                    relatedQuestions: relatedResult.related.questions?.length || 0,
                    jobTitle: firstJob?.metadata?.title,
                    resumeTitle: firstResume?.metadata?.title,
                  }
                };
              }
            } catch (error) {
              message.error('获取相关文档失败:' + error);
            }
            return doc;
          })
        );
        setSearchResults(enrichedList);
        setTotalResults(enrichedList.length);
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
    const newFilters: SearchFilters = {
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
    };
    setFilters(newFilters);
    // 清除筛选后立即搜索
    searchDocuments(newFilters);
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
    setActiveTab('document'); // 重置到第一个标签页

    try {
      // 获取关联信息
      const result = await getRelatedDocuments(
        doc.id,
        doc.metadata.type === 'jobs'
          ? 'jobs'
          : doc.metadata.type === 'questions'
            ? 'questions'
            : doc.metadata.type === 'resumes'
              ? 'resumes'
              : 'default',
      );

      if (result.success && result.related) {
        setRelatedData(result.related);
      } else {
        // 即使没有关联数据，也要设置一个空的结构
        setRelatedData({
          jobs: doc.metadata.type === 'jobs' ? [doc] : [],
          resumes: doc.metadata.type === 'resumes' ? [doc] : [],
          questions: doc.metadata.type === 'questions' ? [doc] : [],
        });
      }
    } catch (error) {
      console.error('获取关联信息失败:', error);
      // 设置默认的关联数据结构
      setRelatedData({
        jobs: doc.metadata.type === 'jobs' ? [doc] : [],
        resumes: doc.metadata.type === 'resumes' ? [doc] : [],
        questions: doc.metadata.type === 'questions' ? [doc] : [],
      });
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
            setSearchResults((prev) => prev.filter((d) => d.id !== doc.id));
            setTotalResults((prev) => prev - 1);
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
      case 'jobs':
        return '岗位信息';
      case 'resumes':
        return '简历信息';
      case 'questions':
        return '押题信息';
      default:
        return '文档';
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
      case 'job_description':
        return '岗位描述';
      case 'resume_content':
        return '简历内容';
      case 'interview_question':
        return '面试押题';
      default:
        return source;
    }
  };

  const getTypeDisplayName = (type: string): string => {
    switch (type) {
      case 'jobs':
        return '岗位';
      case 'resumes':
        return '简历';
      case 'questions':
        return '押题';
      default:
        return type;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        style={{ position: 'relative', zIndex: 1 }}
      >
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
            <button
              onClick={() => handleTabChange('sync-status')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                currentTab === 'sync-status'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              同步状态
            </button>
          </nav>
        </div>

        {/* 同步状态页面 */}
        {currentTab === 'sync-status' && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-2">数据同步状态</h2>
            </div>
            
            <SyncStatusOverview 
              onSyncStart={() => setSyncLoading(true)}
              onSyncEnd={() => setSyncLoading(false)}
              onCleanStart={() => setCleanLoading(true)}
              onCleanEnd={() => setCleanLoading(false)}
            />
          </div>
        )}

        {/* 搜索区域 - 只在非同步状态页面显示 */}
        {currentTab !== 'sync-status' && (
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
                      onClick={() => searchDocuments({ query: '' })}
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
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          创建时间
                        </label>
                        <div className="flex gap-2">
                          <Input
                            type="date"
                            value={
                              filters.createdFrom
                                ? new Date(filters.createdFrom).toISOString().slice(0, 10)
                                : ''
                            }
                            onChange={(e) => {
                              const ts = e.target.value
                                ? new Date(e.target.value + 'T00:00:00').getTime()
                                : undefined;
                              searchDocuments({ createdFrom: ts });
                            }}
                            style={{ height: '42px' }}
                          />
                          <Input
                            type="date"
                            value={
                              filters.createdTo
                                ? new Date(filters.createdTo).toISOString().slice(0, 10)
                                : ''
                            }
                            onChange={(e) => {
                              const ts = e.target.value
                                ? new Date(e.target.value + 'T23:59:59').getTime()
                                : undefined;
                              searchDocuments({ createdTo: ts });
                            }}
                            style={{ height: '42px' }}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {currentTab === 'resumes' && (
                    <>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          创建时间
                        </label>
                        <div className="flex gap-2">
                          <Input
                            type="date"
                            value={
                              filters.createdFrom
                                ? new Date(filters.createdFrom).toISOString().slice(0, 10)
                                : ''
                            }
                            onChange={(e) => {
                              const ts = e.target.value
                                ? new Date(e.target.value + 'T00:00:00').getTime()
                                : undefined;
                              searchDocuments({ createdFrom: ts });
                            }}
                            style={{ height: '42px' }}
                          />
                          <Input
                            type="date"
                            value={
                              filters.createdTo
                                ? new Date(filters.createdTo).toISOString().slice(0, 10)
                                : ''
                            }
                            onChange={(e) => {
                              const ts = e.target.value
                                ? new Date(e.target.value + 'T23:59:59').getTime()
                                : undefined;
                              searchDocuments({ createdTo: ts });
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          押题标签
                        </label>
                        <Select
                          value={filters.tagId}
                          onChange={(value) => searchDocuments({ tagId: value })}
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
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          创建时间
                        </label>
                        <div className="flex gap-2">
                          <Input
                            type="date"
                            value={
                              filters.createdFrom
                                ? new Date(filters.createdFrom).toISOString().slice(0, 10)
                                : ''
                            }
                            onChange={(e) => {
                              const ts = e.target.value
                                ? new Date(e.target.value + 'T00:00:00').getTime()
                                : undefined;
                              searchDocuments({ createdFrom: ts });
                            }}
                            style={{ height: '42px' }}
                          />
                          <Input
                            type="date"
                            value={
                              filters.createdTo
                                ? new Date(filters.createdTo).toISOString().slice(0, 10)
                                : ''
                            }
                            onChange={(e) => {
                              const ts = e.target.value
                                ? new Date(e.target.value + 'T23:59:59').getTime()
                                : undefined;
                              searchDocuments({ createdTo: ts });
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
        )}

        {/* 搜索结果 - 只在非同步状态页面显示 */}
        {currentTab !== 'sync-status' && searchResults.length > 0 && (
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
                        相关度:{' '}
                        {(
                          Math.max(0, Math.min(1, Number.isFinite(doc.score) ? doc.score : 0)) * 100
                        ).toFixed(1)}
                        %
                      </span>
                      {/* 相关数量显示 */}
                      {doc.metadata.type === 'jobs' && (
                        <>
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-50 text-green-700 rounded-full border border-green-200">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 2a1 1 0 011-1h4a1 1 0 011 1v1H7V6z" clipRule="evenodd" />
                            </svg>
                            相关简历 {doc.metadata.relatedResumes || 0}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-50 text-purple-700 rounded-full border border-purple-200">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            相关押题 {doc.metadata.relatedQuestions || 0}
                          </span>
                        </>
                      )}
                      {doc.metadata.type === 'resumes' && (
                        <>
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 2a1 1 0 011-1h4a1 1 0 011 1v1H7V6z" clipRule="evenodd" />
                            </svg>
                            相关岗位 {doc.metadata.relatedJobs || 0}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-50 text-purple-700 rounded-full border border-purple-200">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            相关押题 {doc.metadata.relatedQuestions || 0}
                          </span>
                        </>
                      )}
                       {doc.metadata.tagName && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                          {doc.metadata.tagName}
                        </span>
                      )}
                      {doc.metadata.type === 'questions' && (
                        <>
                          {/* 岗位名称 */}
                          {doc.metadata.jobTitle && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 2a1 1 0 011-1h4a1 1 0 011 1v1H7V6z" clipRule="evenodd" />
                              </svg>
                              {doc.metadata.jobTitle}
                            </span>
                          )}
                          {/* 简历名称 */}
                          {doc.metadata.resumeTitle && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-50 text-green-700 rounded-full border border-green-200">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 2a1 1 0 011-1h4a1 1 0 011 1v1H7V6z" clipRule="evenodd" />
                              </svg>
                              {doc.metadata.resumeTitle}
                            </span>
                          )}
                        </>
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
                                const modal = document.createElement('div');
                                modal.className =
                                  'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
                                modal.innerHTML = `
                                  <div class="bg-white rounded-lg shadow-xl w-[720px] h-[520px] overflow-hidden">
                                    <div class="flex justify-between items-center px-5 py-3 border-b">
                                      <h3 class="text-base font-semibold">${getDocumentName(doc)}</h3>
                                      <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
                                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                      </button>
                                    </div>
                                    <div class="p-5 h-[calc(520px-48px)] overflow-y-auto">
                                      <div class="text-sm text-gray-600 mb-2"><span class="font-medium">来源:</span> ${getSourceDisplayName(doc.metadata.source || '')}</div>
                                      <div class="text-sm text-gray-600 mb-2"><span class="font-medium">类型:</span> ${getTypeDisplayName(doc.metadata.type || '')}</div>
                                      <div class="text-sm text-gray-600 mb-4"><span class="font-medium">创建时间:</span> ${formatDate(doc.metadata.createdAt || doc.metadata.timestamp || '')}</div>
                                      <div class="bg-gray-50 border rounded-md p-4 text-sm text-gray-900 whitespace-pre-wrap">${doc.content}
                                      </div>
                                    </div>
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
                      <span>
                        创建时间:{' '}
                        {doc.metadata.timestamp || doc.metadata.createdAt
                          ? formatDate(doc.metadata.createdAt || doc.metadata.timestamp)
                          : '未知'}
                      </span>
                      {doc.metadata.source && (
                        <span>来源: {getSourceDisplayName(doc.metadata.source)}</span>
                      )}
                      {doc.metadata.type && (
                        <span>类型: {getTypeDisplayName(doc.metadata.type)}</span>
                      )}
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

        {/* 空状态 - 只在非同步状态页面显示 */}
        {currentTab !== 'sync-status' && !loading && searchResults.length === 0 && (
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
              {/* 顶部标签：按文档类型显示 */}
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  {(() => {
                    const type = currentDetailDoc.metadata.type;
                    const tabs: { key: string; label: string }[] = [];
                    if (type === 'jobs') {
                      tabs.push({ key: 'document', label: '岗位信息' });
                      tabs.push({
                        key: 'resumes',
                        label: `相关简历 (${relatedData?.resumes?.length || 0})`,
                      });
                      tabs.push({
                        key: 'questions',
                        label: `相关押题 (${relatedData?.questions?.length || 0})`,
                      });
                    } else if (type === 'resumes') {
                      tabs.push({ key: 'document', label: '简历信息' });
                      tabs.push({
                        key: 'jobs',
                        label: `相关岗位 (${relatedData?.jobs?.length || 0})`,
                      });
                      tabs.push({
                        key: 'questions',
                        label: `相关押题 (${relatedData?.questions?.length || 0})`,
                      });
                    } else if (type === 'questions') {
                      tabs.push({ key: 'document', label: '押题信息' });
                      tabs.push({
                        key: 'jobs',
                        label: `相关岗位 (${relatedData?.jobs?.length || 0})`,
                      });
                      tabs.push({
                        key: 'resumes',
                        label: `相关简历 (${relatedData?.resumes?.length || 0})`,
                      });
                    } else {
                      tabs.push({ key: 'document', label: '文档信息' });
                    }
                    return tabs.map((t) => (
                      <button
                        key={t.key}
                        onClick={() => setActiveTab(t.key)}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                          activeTab === t.key
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {t.label}
                      </button>
                    ));
                  })()}
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
                      <span className="ml-2 text-gray-900">
                        {getTypeDisplayName(currentDetailDoc.metadata.type || '')}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">来源:</span>
                      <span className="ml-2 text-gray-900">
                        {getSourceDisplayName(currentDetailDoc.metadata.source || '')}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">创建时间:</span>
                      <span className="ml-2 text-gray-900">
                        {currentDetailDoc.metadata.timestamp || currentDetailDoc.metadata.createdAt
                          ? formatDate(
                              currentDetailDoc.metadata.createdAt ||
                                currentDetailDoc.metadata.timestamp,
                            )
                          : '未知'}
                      </span>
                    </div>
                  </div>

                  {/* 文档内容 */}
                  <div>
                    <div className="font-medium text-gray-700 mb-2">内容:</div>
                    <div className="bg-gray-50 p-4 rounded-md text-sm text-gray-900 whitespace-pre-wrap max-h-70 overflow-y-auto">
                      {currentDetailDoc.content}
                    </div>
                  </div>
                </div>
              )}

              {/* 相关简历标签页 */}
              {activeTab === 'resumes' && (
                <div className="space-y-4">
                  {relatedData?.resumes && relatedData.resumes.length > 0 ? (
                    // 只展示一条的精致卡片
                    <div className="border rounded-lg overflow-hidden">
                      <div className="px-4 py-3 bg-slate-50 border-b flex items-center justify-between">
                        <h4 className="font-medium text-slate-900">
                          {relatedData.resumes[0].metadata.title || '简历标题'}
                        </h4>
                        <span className="text-xs text-slate-500">
                          ID: {relatedData.resumes[0].id}
                        </span>
                      </div>
                      <div className="p-4 text-sm text-slate-700 whitespace-pre-wrap max-h-100 overflow-y-auto">
                        {relatedData.resumes[0].content}
                      </div>
                    </div>
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
                      <div key={question.id} className="border rounded-lg p-4 relative">
                        {/* 左上角序号 */}
                        <div className="absolute left-0 top-0">
                          <div className="bg-blue-600 text-white text-[10px] font-semibold px-2 py-1 rounded-br">
                            {index + 1}
                          </div>
                          <div className="w-0 h-0 border-t-8 border-t-blue-700 border-r-8 border-r-transparent"></div>
                        </div>
                        <div className="flex justify-between items-start mb-2 ml-6">
                          <h4 className="font-medium text-gray-900">
                            {question.metadata.title || '押题标题'}
                          </h4>
                          <span className="text-xs text-gray-500">ID: {question.id}</span>
                        </div>
                        <div className="text-sm text-gray-600 mb-2 ml-6">
                          {question.metadata.tagName && (
                            <span className="font-medium">标签: {question.metadata.tagName}</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-80 overflow-y-auto ml-6">
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
                    // 只展示一条岗位信息的精致卡片
                    <div className="border rounded-lg overflow-hidden">
                      <div className="px-4 py-3 bg-slate-50 border-b flex items-center justify-between">
                        <h4 className="font-medium text-slate-900">
                          {relatedData.jobs[0].metadata.title || '岗位标题'}
                        </h4>
                        <span className="text-xs text-slate-500">ID: {relatedData.jobs[0].id}</span>
                      </div>
                      <div className="p-4 text-sm text-slate-700 whitespace-pre-wrap max-h-100 overflow-y-auto">
                        {relatedData.jobs[0].content}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8">暂无相关岗位信息</div>
                  )}
                </div>
              )}
            </div>
          )}
        </Modal>
        
        {/* 全屏遮罩组件 */}
        <FullScreenOverlay
          visible={syncLoading}
          title="正在同步所有数据"
          subtitle="请稍候，这可能需要几秒钟的时间..."
          type="loading"
        />
        
        <FullScreenOverlay
          visible={cleanLoading}
          title="正在清空所有数据"
          subtitle="请稍候，正在删除向量库中的所有数据..."
          type="loading"
        />
      </div>
    </div>
  );
}

// 同步状态概览组件
const SyncStatusOverview = ({ 
  onSyncStart, 
  onSyncEnd, 
  onCleanStart, 
  onCleanEnd 
}: {
  onSyncStart?: () => void;
  onSyncEnd?: () => void;
  onCleanStart?: () => void;
  onCleanEnd?: () => void;
}) => {
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [cleanLoading, setCleanLoading] = useState(false);

  useEffect(() => {
    loadSyncStatus();
  }, []);

  const loadSyncStatus = async () => {
    try {
      const { getSyncStatus } = await import('../api/vector');
      // 不传jobId获取汇总统计
      const status = await getSyncStatus();
      // 转换API返回的类型格式
      const jobStats = 'total' in status.job ? status.job : { total: 0, synced: 0, unsynced: 0 };
      const resumeStats = 'total' in status.resume ? status.resume : { total: 0, synced: 0, unsynced: 0 };
      
      setSyncStatus({
        job: jobStats,
        resume: resumeStats,
        questions: status.questions
      });
    } catch (error) {
      message.error('获取同步状态失败:' + error);
    }
  };

  const handleSyncAll = async () => {
    try {
      setLoading(true);
      onSyncStart?.();
      const { syncAll } = await import('../api/vector');
      // 不传jobId同步所有数据
      const result = await syncAll('');
      if (result.success) {
        message.success('同步完成！');
        loadSyncStatus(); // 重新加载状态
      } else {
        message.error('同步失败：' + (result.error || '未知错误'));
      }
    } catch (error: any) {
      let errorMessage = '同步失败：';
      
      if (error.response?.status === 401) {
        errorMessage += '登录已过期，请重新登录';
      } else if (error.response?.status === 503) {
        errorMessage += 'RAG服务不可用，请检查服务是否正常运行';
      } else if (error.response?.data?.error) {
        errorMessage += error.response.data.error;
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += '未知错误';
      }
      
      message.error(errorMessage);
    } finally {
      setLoading(false);
      onSyncEnd?.();
    }
  };

  const handleCleanAll = async () => {
    Modal.confirm({
      title: '确认清空所有向量数据',
      content: (
        <div className="space-y-3">
          <div className="text-red-600 font-medium">
            此操作将永久删除向量库中的所有数据，且无法恢复！
          </div>
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs">1</span>
              <span>所有岗位的向量数据</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs">2</span>
              <span>所有简历的向量数据</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs">3</span>
              <span>所有面试押题的向量数据</span>
            </div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800">
            <div className="font-medium mb-1"><WarningIcon className="w-4 h-4 inline mr-1" />重要提醒：</div>
            <div>清空后，所有向量库数据将被永久清除，需要重新同步才能恢复搜索功能！</div>
          </div>
        </div>
      ),
      okText: '确认清空',
      okType: 'danger',
      cancelText: '取消',
      width: 500,
      onOk: async () => {
        try {
          setCleanLoading(true);
          onCleanStart?.();
          const { cleanAllVectorData } = await import('../api/vector');
          const result = await cleanAllVectorData();
          if (result.success) {
            message.success(result.message);
            // 刷新同步状态
            loadSyncStatus();
          } else {
            message.error('清空失败：' + (result.error || '未知错误'));
          }
        } catch (error: any) {
          let errorMessage = '清空失败：';
          
          if (error.response?.status === 401) {
            errorMessage += '登录已过期，请重新登录';
          } else if (error.response?.status === 503) {
            errorMessage += 'RAG服务不可用，请检查服务是否正常运行';
          } else if (error.response?.data?.error) {
            errorMessage += error.response.data.error;
          } else if (error.message) {
            errorMessage += error.message;
          } else {
            errorMessage += '未知错误';
          }
          
          message.error(errorMessage);
        } finally {
          setCleanLoading(false);
          onCleanEnd?.();
        }
      },
    });
  };

  if (!syncStatus) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalItems = syncStatus.job.total + syncStatus.resume.total + syncStatus.questions.total;
  const totalSynced = syncStatus.job.synced + syncStatus.resume.synced + syncStatus.questions.synced;
  const totalUnsynced = totalItems - totalSynced;

  return (
    <div className="space-y-6">
      {/* 一键同步按钮 */}
      <div className="text-center">
        <div className="flex gap-4 justify-center">
          <button
            onClick={handleSyncAll}
            disabled={loading || cleanLoading}
            className={`px-8 py-3 text-lg font-medium rounded-lg transition-all ${
              loading || cleanLoading
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg transform hover:scale-105'
            }`}
          >
            一键同步所有数据
          </button>
          
          <button
            onClick={handleCleanAll}
            disabled={loading || cleanLoading}
            className={`px-8 py-3 text-lg font-medium rounded-lg transition-all ${
              loading || cleanLoading
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700 hover:shadow-lg transform hover:scale-105'
            }`}
          >
            一键清空所有数据
          </button>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          一键同步所有数据将同步岗位信息、简历信息、面试押题三个模块的数据到向量库，同步完成后，可以进行搜索。
        </p>
        <p className="mt-2 text-sm text-slate-500">
          一键清空所有数据将清空向量库中的所有数据，清空后需要重新同步才能恢复搜索功能。
        </p>
      </div>

      {/* 总体统计 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">总体同步状态</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{totalItems}</div>
            <div className="text-sm text-blue-700">总数据量</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{totalSynced}</div>
            <div className="text-sm text-green-700">已同步</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{totalUnsynced}</div>
            <div className="text-sm text-orange-700">未同步</div>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-blue-700">
            <span>同步进度</span>
            <span>{totalItems > 0 ? Math.round((totalSynced / totalItems) * 100) : 0}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2 mt-1">
            <div
              className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${totalItems > 0 ? (totalSynced / totalItems) * 100 : 0}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* 各模块详细状态 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 岗位信息 */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 2a1 1 0 011-1h4a1 1 0 011 1v1H7V6z" clipRule="evenodd" />
              </svg>
              <h4 className="font-medium text-slate-900">岗位信息</h4>
            </div>
            <span className={`px-2 py-1 text-xs rounded-full ${
              syncStatus.job.unsynced === 0 
                ? 'bg-green-100 text-green-800' 
                : 'bg-orange-100 text-orange-800'
            }`}>
              {syncStatus.job.unsynced === 0 ? '已同步' : `${syncStatus.job.unsynced} 条未同步`}
            </span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">总数:</span>
              <span className="font-medium">{syncStatus.job.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">已同步:</span>
              <span className="font-medium text-green-600">{syncStatus.job.synced}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">未同步:</span>
              <span className="font-medium text-orange-600">{syncStatus.job.unsynced}</span>
            </div>
          </div>
        </div>

        {/* 简历信息 */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 2a1 1 0 011-1h4a1 1 0 011 1v1H7V6z" clipRule="evenodd" />
              </svg>
              <h4 className="font-medium text-slate-900">简历信息</h4>
            </div>
            <span className={`px-2 py-1 text-xs rounded-full ${
              syncStatus.resume.unsynced === 0 
                ? 'bg-green-100 text-green-800' 
                : 'bg-orange-100 text-orange-800'
            }`}>
              {syncStatus.resume.unsynced === 0 ? '已同步' : `${syncStatus.resume.unsynced} 条未同步`}
            </span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">总数:</span>
              <span className="font-medium">{syncStatus.resume.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">已同步:</span>
              <span className="font-medium text-green-600">{syncStatus.resume.synced}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">未同步:</span>
              <span className="font-medium text-orange-600">{syncStatus.resume.unsynced}</span>
            </div>
          </div>
        </div>

        {/* 面试押题 */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <h4 className="font-medium text-slate-900">面试押题</h4>
            </div>
            <span className={`px-2 py-1 text-xs rounded-full ${
              syncStatus.questions.unsynced === 0 
                ? 'bg-green-100 text-green-800' 
                : 'bg-orange-100 text-orange-800'
            }`}>
              {syncStatus.questions.unsynced === 0 ? '已同步' : `${syncStatus.questions.unsynced} 条未同步`}
            </span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">总数:</span>
              <span className="font-medium">{syncStatus.questions.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">已同步:</span>
              <span className="font-medium text-green-600">{syncStatus.questions.synced}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">未同步:</span>
              <span className="font-medium text-orange-600">{syncStatus.questions.unsynced}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 同步说明 */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <h4 className="text-lg font-semibold text-slate-900">同步说明</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-green-200 shadow-sm">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-green-800 mb-1">新增同步</div>
                <div className="text-sm text-green-700">数据库有但向量库没有：新插入到向量库</div>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-blue-200 shadow-sm">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-blue-800 mb-1">更新同步</div>
                <div className="text-sm text-blue-700">数据库有且向量库也有：更新向量库（先删除后插入）</div>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-orange-200 shadow-sm">
              <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-orange-800 mb-1">清理同步</div>
                <div className="text-sm text-orange-700">数据库没有但向量库有：从向量库删除</div>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-purple-200 shadow-sm">
              <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-purple-800 mb-1">数据一致性</div>
                <div className="text-sm text-purple-700">同步完成后，所有数据将保持一致性</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <div className="font-medium text-blue-900">AI 面试训练</div>
              <div className="text-sm text-blue-700">向量知识库所有数据，将用于 AI 面试训练</div>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
};
