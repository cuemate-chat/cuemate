import { CloseOutlined, FilterOutlined, SearchOutlined } from '@ant-design/icons';
import { Modal, Select } from 'antd';
import { useEffect, useState } from 'react';
import { listTags } from '../api/questions';
import {
  SearchFilters,
  VectorDocument,
  deleteDocument,
  deleteJob,
  deleteQuestion,
  searchAllDocuments,
  smartSearch
} from '../api/vector';
import { message } from '../components/Message';

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
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [currentDetailDoc, setCurrentDetailDoc] = useState<VectorDocument | null>(null);

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
      const result = await searchAllDocuments();
      
      if (result.success) {
        setDocuments(result.results);
        setTotal(result.total);
      } else {
        message.error(result.error || '加载所有文档失败');
      }
    } catch (error) {
      message.error('加载所有文档出错，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const data = await listTags();
      setTags(data.items || []);
    } catch (error) {
      message.error('获取标签失败: ' + error);
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
      const result = await smartSearch(filters);
      
      if (result.success) {
        setDocuments(result.results);
        setTotal(result.total);
        if (result.results.length === 0) {
          message.info('未找到相关数据');
        }
      } else {
        message.error(result.error || '搜索失败');
      }
    } catch (error) {
      message.error('搜索出错，请检查网络连接: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      type: 'all',
      query: '',
      tagId: undefined,
      jobTitle: undefined,
      questionTitle: undefined,
    });
    setDocuments([]);
    setTotal(0);
  };

  const getDocumentName = (doc: VectorDocument): string => {
    if (doc.metadata.title) return doc.metadata.title;
    if (doc.metadata.type === 'job' || doc.metadata.source === 'job_description') return '岗位名称';
    if (doc.metadata.type === 'resume' || doc.metadata.source === 'resume_content') return '简历名称';
    if (doc.metadata.type === 'interview_question') return '押题名称';
    return '文档名称';
  };

  const showDetail = (doc: VectorDocument) => {
    setCurrentDetailDoc(doc);
    setDetailModalVisible(true);
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
          if (doc.metadata.type === 'job') {
            result = await deleteJob(doc.id);
          } else if (doc.metadata.type === 'interview_question') {
            result = await deleteQuestion(doc.id);
          } else {
            result = await deleteDocument(doc.id, doc.metadata.type);
          }
          
          if (result.success) {
            // 从本地状态中移除
            setDocuments(prev => prev.filter(d => d.id !== doc.id));
            setTotal(prev => prev - 1);
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
      case 'job': return '岗位';
      case 'resume': return '简历';
      case 'resume_content': return '简历';
      case 'interview_question': return '押题';
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 数据类型 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">数据类型</label>
                  <Select
                    value={filters.type}
                    onChange={(value) => setFilters({ ...filters, type: value })}
                    className="w-full"
                    placeholder="选择数据类型"
                    style={{ height: '42px' }}
                  >
                    <Select.Option value="all">全部类型</Select.Option>
                    <Select.Option value="jobs">岗位信息</Select.Option>
                    <Select.Option value="questions">面试押题</Select.Option>
                    <Select.Option value="resumes">简历信息</Select.Option>
                  </Select>
                </div>

                {/* 标签筛选 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">标签</label>
                  <Select
                    value={filters.tagId}
                    onChange={(value) => setFilters({ ...filters, tagId: value })}
                    className="w-full"
                    placeholder="选择标签"
                    allowClear
                    style={{ height: '42px' }}
                  >
                    {tags.map((tag) => (
                      <Select.Option key={tag.id} value={tag.id}>
                        {tag.name}
                      </Select.Option>
                    ))}
                  </Select>
                </div>

                {/* 岗位名称 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">岗位名称</label>
                  <input
                    type="text"
                    placeholder="输入岗位名称"
                    value={filters.jobTitle || ''}
                    onChange={(e) => setFilters({ ...filters, jobTitle: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* 押题名称 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">押题名称</label>
                  <input
                    type="text"
                    placeholder="输入押题名称"
                    value={filters.questionTitle || ''}
                    onChange={(e) => setFilters({ ...filters, questionTitle: e.target.value || undefined })}
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
              {documents.map((doc, index) => (
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
                        相关度: {(doc.score * 100).toFixed(1)}%
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
                      <span>ID: {doc.id}</span>
                      {doc.metadata.source && <span>来源: {doc.metadata.source}</span>}
                      {doc.metadata.type && <span>类型: {doc.metadata.type}</span>}
                      <span>创建时间: {doc.metadata.timestamp || doc.metadata.processedAt ? formatDate(doc.metadata.processedAt || doc.metadata.timestamp) : '未知'}</span>
                      {doc.metadata.chunkIndex !== undefined && (
                        <span>
                          分块: {doc.metadata.chunkIndex + 1}/{doc.metadata.totalChunks}
                        </span>
                      )}
                      {doc.metadata.category && <span>分类: {doc.metadata.category}</span>}
                      {doc.metadata.company && <span>公司: {doc.metadata.company}</span>}
                      {doc.metadata.position && <span>职位: {doc.metadata.position}</span>}
                      {doc.metadata.location && <span>地点: {doc.metadata.location}</span>}
                      {doc.metadata.salary && <span>薪资: {doc.metadata.salary}</span>}
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
          width={800}
        >
          {currentDetailDoc && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">ID:</label>
                  <p className="text-sm text-slate-900">{currentDetailDoc.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">类型:</label>
                  <p className="text-sm text-slate-900">{currentDetailDoc.metadata.type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">来源:</label>
                  <p className="text-sm text-slate-900">{currentDetailDoc.metadata.source}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">创建时间:</label>
                  <p className="text-sm text-slate-900">
                    {currentDetailDoc.metadata.timestamp || currentDetailDoc.metadata.processedAt 
                      ? formatDate(currentDetailDoc.metadata.processedAt || currentDetailDoc.metadata.timestamp) 
                      : '未知'}
                  </p>
                </div>
                {currentDetailDoc.metadata.category && (
                  <div>
                    <label className="text-sm font-medium text-slate-700">分类:</label>
                    <p className="text-sm text-slate-900">{currentDetailDoc.metadata.category}</p>
                  </div>
                )}
                {currentDetailDoc.metadata.company && (
                  <div>
                    <label className="text-sm font-medium text-slate-700">公司:</label>
                    <p className="text-sm text-slate-900">{currentDetailDoc.metadata.company}</p>
                  </div>
                )}
                {currentDetailDoc.metadata.position && (
                  <div>
                    <label className="text-sm font-medium text-slate-700">职位:</label>
                    <p className="text-sm text-slate-900">{currentDetailDoc.metadata.position}</p>
                  </div>
                )}
                {currentDetailDoc.metadata.location && (
                  <div>
                    <label className="text-sm font-medium text-slate-700">地点:</label>
                    <p className="text-sm text-slate-900">{currentDetailDoc.metadata.location}</p>
                  </div>
                )}
                {currentDetailDoc.metadata.salary && (
                  <div>
                    <label className="text-sm font-medium text-slate-700">薪资:</label>
                    <p className="text-sm text-slate-900">{currentDetailDoc.metadata.salary}</p>
                  </div>
                )}
                {currentDetailDoc.metadata.requirements && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-slate-700">要求:</label>
                    <p className="text-sm text-slate-900">{currentDetailDoc.metadata.requirements}</p>
                  </div>
                )}
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-700">内容:</label>
                <div className="mt-2 p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-900 whitespace-pre-wrap">{currentDetailDoc.content}</p>
                </div>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}
