import { ArrowDownTrayIcon, EyeIcon, TrashIcon } from '@heroicons/react/24/outline';
import {
  ChartBarIcon,
  CheckCircleIcon,
  PlayIcon,
  XCircleIcon,
} from '@heroicons/react/24/solid';
import { Button, DatePicker, Popconfirm, Select, Space, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import {
  batchDeleteOperationLogs,
  deleteOperationLog,
  exportOperationLogs,
  fetchOperationLogs,
  fetchOperationStats,
  type OperationLog,
  type OperationStats,
} from '../../api/operation-logs';
import { message } from '../../components/Message';
import PageLoading from '../../components/PageLoading';
import PaginationBar from '../../components/PaginationBar';
import { useLoading } from '../../hooks/useLoading';
import OperationLogDetailDrawer from './OperationLogDetailDrawer';

export default function OperationLogsList() {
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const { loading, start: startLoading, end: endLoading } = useLoading();
  const { loading: operationLoading, start: startOperation, end: endOperation } = useLoading();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<OperationStats | null>(null);

  // 筛选条件
  const [filters, setFilters] = useState({
    menu: '',
    type: '',
    operation: '',
    status: '',
    userId: '',
    keyword: '',
    startTime: '',
    endTime: '',
  });

  // 详情侧拉弹框状态
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [viewingLog, setViewingLog] = useState<OperationLog | null>(null);

  // 菜单选项 - 根据 Header.tsx 和 UserMenu.tsx 的实际菜单结构
  const menuOptions = [
    { value: '', label: '全部' },
    { value: '主页', label: '主页' },
    { value: '新建岗位', label: '新建岗位' },
    { value: '岗位列表', label: '岗位列表' },
    { value: '面试押题', label: '面试押题' },
    { value: '面试复盘', label: '面试复盘' },
    { value: '帮助中心', label: '帮助中心' },
    { value: '系统设置', label: '系统设置' },
    { value: '模型设置', label: '模型设置' },
    { value: '语音设置', label: '语音设置' },
    { value: '日志管理', label: '日志管理' },
    { value: '操作记录', label: '操作记录' },
    { value: '容器监控', label: '容器监控' },
    { value: '预置题库', label: '预置题库' },
    { value: '向量知识库', label: '向量知识库' },
    { value: 'AI 对话记录', label: 'AI 对话记录' },
    { value: '像素广告', label: '像素广告' },
    { value: '广告管理', label: '广告管理' },
    { value: 'License 管理', label: 'License 管理' },
  ];

  const operationOptions = [
    { label: '全部操作', value: '' },
    { label: '登录', value: 'login' },
    { label: '创建', value: 'create' },
    { label: '更新', value: 'update' },
    { label: '删除', value: 'delete' },
    { label: '查看', value: 'view' },
    { label: '导出', value: 'export' },
    { label: '导入', value: 'import' },
    { label: '备份', value: 'backup' },
    { label: '恢复', value: 'restore' },
  ];

  const statusOptions = [
    { label: '全部状态', value: '' },
    { label: '成功', value: 'success' },
    { label: '失败', value: 'failed' },
  ];

  // Ant Design Table 列定义 - 统一使用百分比宽度
  const columns: ColumnsType<OperationLog> = [
    {
      title: '序号',
      key: 'index',
      width: '8%',
      render: (_value: any, _record: any, index: number) => (
        <div className="text-center">
          {(page - 1) * pageSize + index + 1}
        </div>
      ),
    },
    {
      title: '操作信息',
      key: 'operation',
      width: '25%',
      render: (record: OperationLog) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{record.menu}</span>
            <span className={getOperationBadge(record.operation)}>
              {record.operation}
            </span>
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-200 mt-1">
            {record.message || record.resource_name}
          </div>
        </div>
      ),
    },
    {
      title: '用户',
      key: 'user',
      width: '10%',
      render: (record: OperationLog) => (
        <div>
          <div className="text-sm text-slate-900 dark:text-slate-100">{record.user_name || '未知用户'}</div>
          <div className="text-sm text-slate-500 dark:text-slate-200">{record.user_id}</div>
        </div>
      ),
    },
    {
      title: '时间',
      key: 'time',
      width: '17%',
      render: (record: OperationLog) => (
        <div className="text-sm text-slate-900 dark:text-slate-100">
          {dayjs(record.time * 1000).format('YYYY-MM-DD HH:mm:ss')}
        </div>
      ),
    },
    {
      title: '来源 IP',
      key: 'source_ip',
      width: '12%',
      render: (record: OperationLog) => (
        <div className="text-sm text-slate-900 dark:text-slate-100">{record.source_ip}</div>
      ),
    },
    {
      title: '状态',
      key: 'status',
      width: '8%',
      render: (record: OperationLog) => (
        <span className={getStatusBadge(record.status)}>
          {record.status === 'success' ? '成功' : '失败'}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: '20%',
      render: (record: OperationLog) => (
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
            onClick={() => openDetailDrawer(record)}
          >
            <EyeIcon className="w-4 h-4" /> 查看
          </button>
          <Popconfirm
            title="确定要删除这条操作记录吗？"
            onConfirm={() => handleDeleteSingle(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <button className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-md hover:bg-red-100 dark:hover:bg-red-900/50 hover:border-red-300 dark:hover:border-red-600 transition-colors">
              <TrashIcon className="w-4 h-4" /> 删除
            </button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  // 加载操作记录
  const loadOperationLogs = async (showSuccessMessage: boolean = false) => {
    startLoading();
    try {
      const params = {
        page,
        pageSize,
        ...filters,
        startTime: filters.startTime ? dayjs(filters.startTime).unix() : undefined,
        endTime: filters.endTime ? dayjs(filters.endTime).unix() : undefined,
      };

      const response = await fetchOperationLogs(params);
      setLogs(response.list);
      setTotal(response.pagination.total);

      if (showSuccessMessage) {
        message.success('已刷新操作记录');
      }
    } catch (error) {
      console.error('加载操作记录失败：', error);
      message.error('加载操作记录失败');
    } finally {
      await endLoading();
    }
  };

  // 加载统计信息
  const loadStats = async () => {
    try {
      const response = await fetchOperationStats(7);
      setStats(response);
    } catch (error) {
      console.error('加载统计信息失败：', error);
    }
  };

  useEffect(() => {
    loadOperationLogs();
  }, [page, pageSize, filters]);

  useEffect(() => {
    loadStats();
  }, []);

  // 搜索操作
  const handleSearch = () => {
    setPage(1);
    loadOperationLogs();
  };

  // 重置筛选
  const handleReset = () => {
    setFilters({
      menu: '',
      type: '',
      operation: '',
      status: '',
      userId: '',
      keyword: '',
      startTime: '',
      endTime: '',
    });
    setPage(1);
  };

  // 导出操作记录
  const handleExport = async () => {
    try {
      await exportOperationLogs({
        startTime: filters.startTime ? dayjs(filters.startTime).unix() : undefined,
        endTime: filters.endTime ? dayjs(filters.endTime).unix() : undefined,
        format: 'csv',
      });
      message.success('导出成功');
    } catch (error) {
      console.error('导出失败：', error);
      message.error('导出失败');
    }
  };

  // 删除指定时间之前的记录
  const handleDeleteBefore = async (beforeDays: number) => {
    startOperation();
    try {
      const beforeTime = dayjs().subtract(beforeDays, 'day').unix();
      const response = await batchDeleteOperationLogs({ beforeTime });
      message.success(`删除了 ${response.deletedCount} 条记录`);
      loadOperationLogs();
    } catch (error) {
      console.error('删除失败：', error);
      message.error('删除失败');
    } finally {
      await endOperation();
    }
  };

  // 删除单条记录
  const handleDeleteSingle = async (id: number) => {
    startOperation();
    try {
      await deleteOperationLog(id);
      message.success('删除成功');
      loadOperationLogs();
    } catch (error) {
      console.error('删除失败：', error);
      message.error('删除失败');
    } finally {
      await endOperation();
    }
  };

  // 打开详情侧拉弹框
  const openDetailDrawer = (log: OperationLog) => {
    setViewingLog(log);
    setDetailDrawerOpen(true);
  };

  // 获取操作状态标签样式
  const getStatusBadge = (status: string) => {
    const baseClass = 'px-2 py-1 rounded-full text-xs font-medium';
    switch (status) {
      case 'success':
        return `${baseClass} bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300`;
      case 'failed':
        return `${baseClass} bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300`;
      default:
        return `${baseClass} bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-300`;
    }
  };

  // 获取操作类型标签样式
  const getOperationBadge = (operation: string) => {
    const baseClass = 'px-2 py-1 rounded-full text-xs font-medium';
    switch (operation) {
      case 'login':
        return `${baseClass} bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300`;
      case 'create':
        return `${baseClass} bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300`;
      case 'update':
        return `${baseClass} bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300`;
      case 'delete':
        return `${baseClass} bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300`;
      case 'view':
        return `${baseClass} bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-300`;
      default:
        return `${baseClass} bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300`;
    }
  };

  // 加载时显示全屏 loading
  if (loading) {
    return <PageLoading tip="正在加载操作记录..." />;
  }

  // 删除操作时显示全屏 loading
  if (operationLoading) {
    return <PageLoading tip="正在删除，请稍候..." type="saving" />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">操作记录</h1>
        <p className="text-slate-600 dark:text-slate-200 mt-1">查看用户操作记录和系统审计信息</p>
      </div>

      {/* 统计面板 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-200">今日操作总数</h3>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.todayTotal}
                </p>
              </div>
              <ChartBarIcon className="w-8 h-8 text-blue-500 dark:text-blue-400" />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-200">成功操作数</h3>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {stats.todaySuccess}
                </p>
              </div>
              <CheckCircleIcon className="w-8 h-8 text-green-500 dark:text-green-400" />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-200">失败操作数</h3>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {stats.todayFailed}
                </p>
              </div>
              <XCircleIcon className="w-8 h-8 text-red-500 dark:text-red-400" />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-200">今日面试次数</h3>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {stats.interviewCount}
                </p>
              </div>
              <PlayIcon className="w-8 h-8 text-purple-500 dark:text-purple-400" />
            </div>
          </div>
        </div>
      )}

      {/* 筛选区域 */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow border border-slate-200 dark:border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">操作菜单</label>
            <Select
              value={filters.menu}
              onChange={(value) => setFilters(prev => ({ ...prev, menu: value }))}
              options={menuOptions}
              className="w-full"
              style={{ height: 42 }}
              placeholder="选择菜单"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">操作类型</label>
            <Select
              value={filters.operation}
              onChange={(value) => setFilters(prev => ({ ...prev, operation: value }))}
              options={operationOptions}
              className="w-full"
              style={{ height: 42 }}
              placeholder="选择操作类型"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">状态</label>
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
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">关键词</label>
            <input
              type="text"
              value={filters.keyword}
              onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
              className="w-full px-3 py-2 h-[42px] border border-gray-300 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="搜索操作信息、资源名称或用户名"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">开始时间</label>
            <DatePicker
              value={filters.startTime ? dayjs(filters.startTime) : null}
              onChange={(date) => setFilters(prev => ({ ...prev, startTime: date ? date.format('YYYY-MM-DD') : '' }))}
              className="w-full [&_.ant-picker]:!h-[42px]"
              placeholder="选择开始时间"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">结束时间</label>
            <DatePicker
              value={filters.endTime ? dayjs(filters.endTime) : null}
              onChange={(date) => setFilters(prev => ({ ...prev, endTime: date ? date.format('YYYY-MM-DD') : '' }))}
              className="w-full [&_.ant-picker]:!h-[42px]"
              placeholder="选择结束时间"
            />
          </div>
          <div className="col-span-2 flex items-end gap-2">
            <Button type="primary" onClick={handleSearch} className="h-[42px]">搜索</Button>
            <Button onClick={handleReset} className="h-[42px]">重置</Button>
            <Button onClick={() => loadOperationLogs(true)} disabled={loading} className="h-[42px]">刷新</Button>
            <Button icon={<ArrowDownTrayIcon className="w-4 h-4" />} onClick={handleExport} className="h-[42px]">导出</Button>
            <Space.Compact>
              <Popconfirm title="确定要删除 7 天前的记录吗？" onConfirm={() => handleDeleteBefore(7)}>
                <Button danger className="h-[42px]">删除 7 天前</Button>
              </Popconfirm>
              <Popconfirm title="确定要删除 30 天前的记录吗？" onConfirm={() => handleDeleteBefore(30)}>
                <Button danger className="h-[42px]">删除 30 天前</Button>
              </Popconfirm>
            </Space.Compact>
          </div>
        </div>
      </div>

      {/* Ant Design Table 自适应表格 */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 overflow-hidden">
        <Table
          columns={columns}
          dataSource={logs}
          rowKey={(record: OperationLog) => record.id.toString()}
          pagination={false}
          loading={loading}
          scroll={{ x: 800 }}
          size="middle"
        />
      </div>

      {/* 外部分页组件 */}
      <div className="flex justify-between items-center mt-3 text-sm">
        <div className="text-slate-500 dark:text-slate-200">共 {total} 条</div>
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

      {/* 操作记录详情侧拉弹框 */}
      <OperationLogDetailDrawer
        open={detailDrawerOpen}
        onClose={() => {
          setDetailDrawerOpen(false);
          setViewingLog(null);
        }}
        logItem={viewingLog}
      />
    </div>
  );
}
