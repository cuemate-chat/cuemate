import { EyeIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { DatePicker, Modal, Select, Space, Button, Popconfirm } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import {
  fetchOperationLogs,
  fetchOperationStats,
  exportOperationLogs,
  batchDeleteOperationLogs,
  type OperationLog,
  type OperationStats,
} from '../api/operation-logs';
import { message } from '../components/Message';
import PaginationBar from '../components/PaginationBar';


export default function OperationLogs() {
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
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

  // 详情弹窗
  const [viewingLog, setViewingLog] = useState<OperationLog | null>(null);

  // 常量定义
  const menuOptions = [
    { label: '全部菜单', value: '' },
    { label: '认证授权', value: '认证授权' },
    { label: '用户管理', value: '用户管理' },
    { label: '模型管理', value: '模型管理' },
    { label: 'ASR设置', value: 'ASR设置' },
    { label: '面试任务', value: '面试任务' },
    { label: '题库管理', value: '题库管理' },
    { label: '预设问题', value: '预设问题' },
    { label: '面试评价', value: '面试评价' },
    { label: '日志管理', value: '日志管理' },
    { label: '许可证管理', value: '许可证管理' },
    { label: '向量知识库', value: '向量知识库' },
    { label: '广告管理', value: '广告管理' },
    { label: '系统设置', value: '系统设置' },
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

  // 加载操作记录
  const loadOperationLogs = async () => {
    setLoading(true);
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
    } catch (error) {
      console.error('加载操作记录失败：', error);
      message.error('加载操作记录失败');
    } finally {
      setLoading(false);
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
  }, [page, pageSize]);

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
    setTimeout(() => {
      loadOperationLogs();
    }, 100);
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
    try {
      const beforeTime = dayjs().subtract(beforeDays, 'day').unix();
      const response = await batchDeleteOperationLogs({ beforeTime });
      message.success(`删除了 ${response.deletedCount} 条记录`);
      loadOperationLogs();
    } catch (error) {
      console.error('删除失败：', error);
      message.error('删除失败');
    }
  };

  // 获取操作状态标签样式
  const getStatusBadge = (status: string) => {
    const baseClass = 'px-2 py-1 rounded-full text-xs font-medium';
    switch (status) {
      case 'success':
        return `${baseClass} bg-green-100 text-green-800`;
      case 'failed':
        return `${baseClass} bg-red-100 text-red-800`;
      default:
        return `${baseClass} bg-gray-100 text-gray-800`;
    }
  };

  // 获取操作类型标签样式
  const getOperationBadge = (operation: string) => {
    const baseClass = 'px-2 py-1 rounded-full text-xs font-medium';
    switch (operation) {
      case 'login':
        return `${baseClass} bg-blue-100 text-blue-800`;
      case 'create':
        return `${baseClass} bg-green-100 text-green-800`;
      case 'update':
        return `${baseClass} bg-yellow-100 text-yellow-800`;
      case 'delete':
        return `${baseClass} bg-red-100 text-red-800`;
      case 'view':
        return `${baseClass} bg-gray-100 text-gray-800`;
      default:
        return `${baseClass} bg-purple-100 text-purple-800`;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">操作记录</h1>
        <p className="text-gray-600 mt-1">查看用户操作记录和系统审计信息</p>
      </div>

      {/* 统计面板 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow border">
            <h3 className="text-sm font-medium text-gray-500">今日操作总数</h3>
            <p className="text-2xl font-bold text-blue-600">
              {stats.dailyStats[0]?.count || 0}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <h3 className="text-sm font-medium text-gray-500">成功操作</h3>
            <p className="text-2xl font-bold text-green-600">
              {stats.statusStats.find(s => s.status === 'success')?.count || 0}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <h3 className="text-sm font-medium text-gray-500">失败操作</h3>
            <p className="text-2xl font-bold text-red-600">
              {stats.statusStats.find(s => s.status === 'failed')?.count || 0}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <h3 className="text-sm font-medium text-gray-500">活跃用户</h3>
            <p className="text-2xl font-bold text-purple-600">
              {stats.userStats.length}
            </p>
          </div>
        </div>
      )}

      {/* 筛选区域 */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">操作菜单</label>
            <Select
              value={filters.menu}
              onChange={(value) => setFilters(prev => ({ ...prev, menu: value }))}
              options={menuOptions}
              className="w-full"
              placeholder="选择菜单"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">操作类型</label>
            <Select
              value={filters.operation}
              onChange={(value) => setFilters(prev => ({ ...prev, operation: value }))}
              options={operationOptions}
              className="w-full"
              placeholder="选择操作类型"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
            <Select
              value={filters.status}
              onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              options={statusOptions}
              className="w-full"
              placeholder="选择状态"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">关键词</label>
            <input
              type="text"
              value={filters.keyword}
              onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="搜索操作信息、资源名称或用户名"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">开始时间</label>
            <DatePicker
              value={filters.startTime ? dayjs(filters.startTime) : null}
              onChange={(date) => setFilters(prev => ({ ...prev, startTime: date ? date.format('YYYY-MM-DD') : '' }))}
              className="w-full"
              placeholder="选择开始时间"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">结束时间</label>
            <DatePicker
              value={filters.endTime ? dayjs(filters.endTime) : null}
              onChange={(date) => setFilters(prev => ({ ...prev, endTime: date ? date.format('YYYY-MM-DD') : '' }))}
              className="w-full"
              placeholder="选择结束时间"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="primary" onClick={handleSearch}>搜索</Button>
          <Button onClick={handleReset}>重置</Button>
          <Button icon={<ArrowDownTrayIcon className="w-4 h-4" />} onClick={handleExport}>导出</Button>
          <Space.Compact>
            <Popconfirm title="确定要删除7天前的记录吗？" onConfirm={() => handleDeleteBefore(7)}>
              <Button danger>删除7天前</Button>
            </Popconfirm>
            <Popconfirm title="确定要删除30天前的记录吗？" onConfirm={() => handleDeleteBefore(30)}>
              <Button danger>删除30天前</Button>
            </Popconfirm>
          </Space.Compact>
        </div>
      </div>

      {/* 操作记录列表 */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作信息
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  用户
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  来源IP
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    加载中...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    暂无数据
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{log.menu}</span>
                          <span className={getOperationBadge(log.operation)}>
                            {log.operation}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {log.message || log.resource_name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{log.user_name || '未知用户'}</div>
                      <div className="text-sm text-gray-500">{log.user_id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {dayjs(log.time * 1000).format('YYYY-MM-DD HH:mm:ss')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{log.source_ip}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={getStatusBadge(log.status)}>
                        {log.status === 'success' ? '成功' : '失败'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setViewingLog(log)}
                        className="text-blue-600 hover:text-blue-900"
                        title="查看详情"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        {total > 0 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <PaginationBar
              page={page}
              pageSize={pageSize}
              total={total}
              onChange={setPage}
              onPageSizeChange={(_, size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </div>
        )}
      </div>

      {/* 详情弹窗 */}
      <Modal
        title="操作记录详情"
        open={!!viewingLog}
        onCancel={() => setViewingLog(null)}
        footer={null}
        width={800}
      >
        {viewingLog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">操作菜单</label>
                <p className="text-sm text-gray-900">{viewingLog.menu}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">资源类型</label>
                <p className="text-sm text-gray-900">{viewingLog.type}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">资源ID</label>
                <p className="text-sm text-gray-900">{viewingLog.resource_id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">资源名称</label>
                <p className="text-sm text-gray-900">{viewingLog.resource_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">操作类型</label>
                <p className="text-sm text-gray-900">{viewingLog.operation}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">状态</label>
                <span className={getStatusBadge(viewingLog.status)}>
                  {viewingLog.status === 'success' ? '成功' : '失败'}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">操作用户</label>
                <p className="text-sm text-gray-900">{viewingLog.user_name} ({viewingLog.user_id})</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">来源IP</label>
                <p className="text-sm text-gray-900">{viewingLog.source_ip}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">请求方法</label>
                <p className="text-sm text-gray-900">{viewingLog.request_method}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">请求URL</label>
                <p className="text-sm text-gray-900 break-all">{viewingLog.request_url}</p>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">操作信息</label>
                <p className="text-sm text-gray-900">{viewingLog.message}</p>
              </div>
              {viewingLog.error_message && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">错误信息</label>
                  <p className="text-sm text-red-600">{viewingLog.error_message}</p>
                </div>
              )}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">用户代理</label>
                <p className="text-sm text-gray-500 break-all">{viewingLog.user_agent}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}