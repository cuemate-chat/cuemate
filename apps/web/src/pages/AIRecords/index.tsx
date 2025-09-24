import { EyeIcon, TrashIcon } from '@heroicons/react/24/outline';
import {
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  HashtagIcon,
  PlayIcon,
  QuestionMarkCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/solid';
import { Button, Popconfirm, Select, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import {
  deleteAIConversation,
  fetchAIConversations,
  fetchAIConversationStats,
  type AIConversation,
  type AIConversationStats,
} from '../../api/ai-conversations';
import { listModels } from '../../api/models';
import { message } from '../../components/Message';
import PaginationBar from '../../components/PaginationBar';
import { findProvider } from '../../providers';
import AIConversationDetailDrawer from './AIConversationDetailDrawer';

export default function AIRecordsList() {
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<AIConversationStats | null>(null);

  // 筛选条件
  const [filters, setFilters] = useState({
    status: '',
    model_id: '',
    keyword: '',
  });

  // 详情侧拉弹框状态
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [viewingConversation, setViewingConversation] = useState<AIConversation | null>(null);

  // 模型列表状态
  const [modelOptions, setModelOptions] = useState<Array<{label: string, value: string, icon?: string}>>([
    { label: '全部模型', value: '' }
  ]);

  // 状态选项
  const statusOptions = [
    { label: '全部状态', value: '' },
    { label: '进行中', value: 'active' },
    { label: '已完成', value: 'completed' },
    { label: '出错', value: 'error' },
  ];

  // Ant Design Table 列定义
  const columns: ColumnsType<AIConversation> = [
    {
      title: '序号',
      key: 'index',
      width: '5%',
      render: (_value: any, _record: any, index: number) => (
        <div className="text-center">
          {(page - 1) * pageSize + index + 1}
        </div>
      ),
    },
    {
      title: '对话信息',
      key: 'conversation',
      width: '30%',
      render: (record: AIConversation) => {
        // 获取provider的图标内容用于显示
        const provider = findProvider(record.model_provider);
        const iconContent = provider?.icon;
        const iconSrc = iconContent ? `data:image/svg+xml;utf8,${encodeURIComponent(iconContent)}` : null;
        
        return (
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <ChatBubbleLeftRightIcon className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-900 truncate">
                {record.title}
              </span>
            </div>
            <div className="flex flex-col gap-1 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                {iconSrc && (
                  <img 
                    src={iconSrc} 
                    alt={record.model_provider}
                    className="w-4 h-4 rounded flex-shrink-0"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
                <span className="font-medium">{record.model_title}</span>
                <span>·</span>
                <span>{record.model_name}</span>
                <span>·</span>
                <span>{record.model_provider}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span>类型: {record.model_type}</span>
                {record.model_version && (
                  <>
                    <span>·</span>
                    <span>版本: {record.model_version}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      title: '消息统计',
      key: 'stats',
      width: '12%',
      render: (record: AIConversation) => (
        <div className="flex flex-col">
          <div className="text-sm text-gray-900">
            {record.message_count} 条对话
          </div>
          <div className="text-sm text-gray-500">
            {record.token_used} tokens
          </div>
        </div>
      ),
    },
    {
      title: '创建时间',
      key: 'created_at',
      width: '15%',
      render: (record: AIConversation) => (
        <div className="text-sm text-gray-900">
          {dayjs(record.created_at * 1000).format('YYYY-MM-DD HH:mm:ss')}
        </div>
      ),
    },
    {
      title: '更新时间',
      key: 'updated_at',
      width: '15%',
      render: (record: AIConversation) => (
        <div className="text-sm text-gray-900">
          {dayjs(record.updated_at * 1000).format('YYYY-MM-DD HH:mm:ss')}
        </div>
      ),
    },
    {
      title: '状态',
      key: 'status',
      width: '8%',
      render: (record: AIConversation) => (
        <span className={getStatusBadge(record.status)}>
          {getStatusText(record.status)}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: '15%',
      render: (record: AIConversation) => (
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 hover:border-blue-300 transition-colors"
            onClick={() => openDetailDrawer(record)}
          >
            <EyeIcon className="w-4 h-4" /> 详情
          </button>
          <Popconfirm
            title="确定要删除这条AI对话记录吗？"
            description="删除后将无法恢复对话内容"
            onConfirm={() => handleDeleteSingle(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <button className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 hover:border-red-300 transition-colors">
              <TrashIcon className="w-4 h-4" /> 删除
            </button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  // 加载AI对话记录
  const loadAIConversations = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        pageSize,
        ...filters,
      };
      
      const response = await fetchAIConversations(params);
      setConversations(response.items || []);
      setTotal(response.total || 0);
    } catch (error) {
      console.error('加载AI对话记录失败：', error);
      message.error('加载AI对话记录失败');
      setConversations([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // 加载统计信息
  const loadStats = async () => {
    try {
      const response = await fetchAIConversationStats();
      setStats(response);
    } catch (error) {
      console.error('加载统计信息失败：', error);
      // 设置默认统计数据
      setStats({
        total: 0,
        active: 0,
        completed: 0,
        error: 0,
        totalTokens: 0,
        todayConversations: 0,
        todayQuestions: 0,
        totalQuestions: 0,
        failedConversations: 0
      });
    }
  };

  useEffect(() => {
    loadAIConversations();
  }, [page, pageSize, filters.status, filters.model_id, filters.keyword]);

  useEffect(() => {
    loadStats();
    loadModelOptions();
  }, []);

  // 加载模型选项
  const loadModelOptions = async () => {
    try {
      const response = await listModels({});
      if (response && response.list) {
        // 构建模型选项，包含详细信息
        const options = [
          { label: '全部模型', value: '' },
          ...response.list.map((model: any) => {
            // 获取provider的图标内容
            const provider = findProvider(model.provider);
            const iconContent = provider?.icon;
            return {
              label: `${model.provider} - ${model.name}`,
              value: model.id,
              icon: iconContent ? `data:image/svg+xml;utf8,${encodeURIComponent(iconContent)}` : null,
            };
          })
        ];
        setModelOptions(options);
      }
    } catch (error) {
      console.error('加载模型列表失败:', error);
    }
  };

  // 搜索操作
  const handleSearch = () => {
    setPage(1);
    loadAIConversations();
  };

  // 重置筛选
  const handleReset = () => {
    setFilters({
      status: '',
      model_id: '',
      keyword: '',
    });
    setPage(1);
  };

  // 删除单条记录
  const handleDeleteSingle = async (id: number) => {
    try {
      await deleteAIConversation(id);
      message.success('删除成功');
      loadAIConversations();
      loadStats(); // 重新加载统计信息
    } catch (error) {
      console.error('删除失败：', error);
      message.error('删除失败');
    }
  };

  // 打开详情侧拉弹框
  const openDetailDrawer = (conversation: AIConversation) => {
    setViewingConversation(conversation);
    setDetailDrawerOpen(true);
  };

  // 获取状态标签样式
  const getStatusBadge = (status: string) => {
    const baseClass = 'px-2 py-1 rounded-full text-xs font-medium';
    switch (status) {
      case 'active':
        return `${baseClass} bg-blue-100 text-blue-800`;
      case 'completed':
        return `${baseClass} bg-green-100 text-green-800`;
      case 'error':
        return `${baseClass} bg-red-100 text-red-800`;
      default:
        return `${baseClass} bg-gray-100 text-gray-800`;
    }
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return '进行中';
      case 'completed':
        return '已完成';
      case 'error':
        return '出错';
      default:
        return '未知';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI 对话记录</h1>
        <p className="text-gray-600 mt-1">查看和管理AI对话记录</p>
      </div>

      {/* 统计面板 */}
      {(
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500">今天对话数</h3>
                <p className="text-2xl font-bold text-blue-600">
                  {stats?.todayConversations || 0}
                </p>
              </div>
              <CalendarDaysIcon className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500">今天提问数</h3>
                <p className="text-2xl font-bold text-indigo-600">
                  {stats?.todayQuestions || 0}
                </p>
              </div>
              <QuestionMarkCircleIcon className="w-8 h-8 text-indigo-500" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500">总对话数</h3>
                <p className="text-2xl font-bold text-green-600">
                  {stats?.total || 0}
                </p>
              </div>
              <ChatBubbleLeftRightIcon className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500">总提问数</h3>
                <p className="text-2xl font-bold text-cyan-600">
                  {stats?.totalQuestions || 0}
                </p>
              </div>
              <HashtagIcon className="w-8 h-8 text-cyan-500" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500">进行中</h3>
                <p className="text-2xl font-bold text-orange-600">
                  {stats?.active || 0}
                </p>
              </div>
              <PlayIcon className="w-8 h-8 text-orange-500" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500">已完成</h3>
                <p className="text-2xl font-bold text-emerald-600">
                  {stats?.completed || 0}
                </p>
              </div>
              <CheckCircleIcon className="w-8 h-8 text-emerald-500" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500">失败对话数</h3>
                <p className="text-2xl font-bold text-red-600">
                  {stats?.failedConversations || 0}
                </p>
              </div>
              <XCircleIcon className="w-8 h-8 text-red-500" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500">消耗Token</h3>
                <p className="text-2xl font-bold text-purple-600">
                  {(stats?.totalTokens || 0).toLocaleString()}
                </p>
              </div>
              <ExclamationTriangleIcon className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>
      )}

      {/* 筛选区域 */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
            <Select
              value={filters.status}
              onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              options={statusOptions}
              className="w-full"
              style={{ height: 42 }}
              placeholder="选择状态"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">模型供应商</label>
            <Select
              value={filters.model_id}
              onChange={(value) => setFilters(prev => ({ ...prev, model_id: value }))}
              className="w-full"
              style={{ height: 42 }}
              placeholder="选择模型"
              optionLabelProp="label"
            >
              {modelOptions.map((option) => (
                <Select.Option key={option.value} value={option.value} label={option.label}>
                  <div className="flex items-center gap-2 py-1">
                    {option.icon && (
                      <img 
                        src={option.icon} 
                        alt=""
                        className="w-4 h-4 rounded flex-shrink-0"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                    <span className="truncate">{option.label}</span>
                  </div>
                </Select.Option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">关键词</label>
            <input
              type="text"
              value={filters.keyword}
              onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
              className="w-full px-3 py-2 h-[42px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="搜索对话标题或模型名称"
            />
          </div>
          <div className="flex items-end">
            <Button type="primary" onClick={handleSearch} className="h-[42px] mr-2">搜索</Button>
            <Button onClick={handleReset} className="h-[42px] mr-2">重置</Button>
            <Button onClick={loadAIConversations} disabled={loading} className="h-[42px]">刷新</Button>
          </div>
        </div>
      </div>

      {/* 表格区域 */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <Table
          columns={columns}
          dataSource={conversations}
          rowKey={(record: AIConversation) => record.id.toString()}
          pagination={false}
          loading={loading}
          scroll={{ x: 800 }}
          size="middle"
          locale={{
            emptyText: (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <ChatBubbleLeftRightIcon className="w-12 h-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium mb-2">暂无AI对话记录</h3>
                <p className="text-sm">当有AI对话时，记录会显示在这里</p>
              </div>
            )
          }}
        />
      </div>

      {/* 分页组件 */}
      <div className="flex justify-between items-center mt-3 text-sm">
        <div className="text-slate-500">共 {total} 条</div>
        <PaginationBar 
          page={page} 
          pageSize={pageSize} 
          total={total} 
          onChange={(p: number) => setPage(p)}
          onPageSizeChange={(_: number, size: number) => {
            setPageSize(size);
            setPage(1);
          }}
          showSizeChanger={true}
          pageSizeOptions={['10', '20', '50', '100']}
        />
      </div>

      {/* AI对话详情侧拉弹框 */}
      <AIConversationDetailDrawer
        open={detailDrawerOpen}
        onClose={() => {
          setDetailDrawerOpen(false);
          setViewingConversation(null);
        }}
        conversation={viewingConversation}
      />
    </div>
  );
}