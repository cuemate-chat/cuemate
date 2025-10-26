import { ArrowPathIcon, EyeIcon } from '@heroicons/react/24/outline';
import {
  BugAntIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/solid';
import { DatePicker, Modal, Select, Table } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import {
  clearLogContent as clearLogContentApi,
  clearTodayLogs as clearTodayLogsApi,
  deleteLogFile as deleteLogFileApi,
  fetchLogs,
  fetchLogServices,
  LogLevel,
} from '../../api/logs';
import { DangerIcon, WarningIcon } from '../../components/Icons';
import { message } from '../../components/Message';
import PageLoading from '../../components/PageLoading';
import PaginationBar from '../../components/PaginationBar';
import { useLoading } from '../../hooks/useLoading';
import LogViewerDrawer from './LogViewerDrawer';

export default function LogsList() {
  const [services, setServices] = useState<string[]>([]);
  const [levels] = useState<LogLevel[]>(['debug', 'info', 'warn', 'error']);
  const [service, setService] = useState<string>('');
  const [level, setLevel] = useState<LogLevel | ''>('');
  const [date, setDate] = useState<string>(''); // yyyy-mm-dd
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<
    Array<{ level: LogLevel; service: string; date: string; size: number; mtimeMs: number }>
  >([]);
  const { loading, start: startLoading, end: endLoading } = useLoading();
  const { loading: operationLoading, start: startOperation, end: endOperation } = useLoading();
  
  // 日志查看器状态
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewingLog, setViewingLog] = useState<{
    level: LogLevel;
    service: string;
    date: string;
  } | null>(null);

  // Ant Design Table 列定义 - 统一使用百分比宽度
  const columns = [
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
      title: '名称',
      dataIndex: 'service',
      key: 'name',
      width: '15%',
      render: (service: string) => serviceNameMap[service] || service,
    },
    {
      title: '项目',
      dataIndex: 'service',
      key: 'project',
      width: '15%',
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: '12%',
      render: (level: LogLevel) => <LevelPill lvl={level} />,
    },
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: '15%',
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      width: '10%',
      render: (size: number) => `${(size / 1024).toFixed(1)} KB`,
    },
    {
      title: '操作',
      key: 'action',
      width: '25%',
      render: (record: any) => (
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 hover:border-blue-300 transition-colors"
            onClick={() => openLogViewer(record)}
          >
            <EyeIcon className="w-4 h-4" /> 查看
          </button>
          <button
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 hover:border-amber-300 transition-colors"
            onClick={() => {
              Modal.confirm({
                title: '确认清理日志',
                content: (
                  <div className="space-y-2">
                    <p>确定要清理以下日志文件吗？</p>
                    <div className="bg-slate-50 p-3 rounded text-sm">
                      <div><strong>服务：</strong>{serviceNameMap[record.service] || record.service}</div>
                      <div><strong>级别：</strong>{record.level.toUpperCase()}</div>
                      <div><strong>日期：</strong>{record.date}</div>
                      <div><strong>大小：</strong>{(record.size / 1024).toFixed(1)} KB</div>
                    </div>
                    <p className="text-amber-600 text-sm">
                      <WarningIcon className="w-4 h-4 inline mr-1" />
                      清理后日志内容将无法恢复！
                    </p>
                  </div>
                ),
                okText: '确认清理',
                okType: 'default',
                cancelText: '取消',
                onOk: () => clearLogContent(record),
              });
            }}
          >
            <XCircleIcon className="w-4 h-4" /> 清理
          </button>
          <button
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 hover:border-red-300 transition-colors"
            onClick={() => {
              Modal.confirm({
                title: '确认删除日志文件',
                content: (
                  <div className="space-y-2">
                    <p>确定要删除以下日志文件吗？</p>
                    <div className="bg-slate-50 p-3 rounded text-sm">
                      <div><strong>服务：</strong>{serviceNameMap[record.service] || record.service}</div>
                      <div><strong>级别：</strong>{record.level.toUpperCase()}</div>
                      <div><strong>日期：</strong>{record.date}</div>
                      <div><strong>大小：</strong>{(record.size / 1024).toFixed(1)} KB</div>
                    </div>
                    <p className="text-red-600 text-sm">
                      <DangerIcon className="w-4 h-4 inline mr-1" />
                      删除后日志文件将完全消失，无法恢复！
                    </p>
                    <p className="text-red-600 text-sm">此操作比清理更加危险，请谨慎操作！</p>
                  </div>
                ),
                okText: '确认删除',
                okType: 'danger',
                cancelText: '取消',
                onOk: () => deleteLogFile(record),
              });
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            删除
          </button>
        </div>
      ),
    },
  ];

  // 项目中文名称映射
  const serviceNameMap: Record<string, string> = {
    'web-api': '后端 API 服务',
    'llm-router': '大模型路由',
    'rag-service': 'RAG 知识库服务',
    'cuemate-asr': '语音识别服务',
    'desktop-client': '桌面客户端',
  };

  useEffect(() => {
    fetchLogServices()
      .then((res) => setServices(res.services))
      .catch(() => {});
  }, []);

  const loadLogs = async () => {
    startLoading();
    try {
      const res = await fetchLogs({
        level: level || undefined,
        service: service || undefined,
        date: date || undefined,
        page,
        pageSize,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error('加载日志失败：', err);
    } finally {
      await endLoading();
    }
  };

  useEffect(() => {
    loadLogs();
  }, [service, level, date, page, pageSize]);

  const openLogViewer = (logItem: { level: LogLevel; service: string; date: string }) => {
    setViewingLog(logItem);
    setViewerOpen(true);
  };

  const clearLogContent = async (it: { level: LogLevel; service: string; date: string }) => {
    startOperation();
    try {
      await clearLogContentApi({ level: it.level, service: it.service, date: it.date });
      message.success('日志清理成功');
      // 清理后重新加载当前页
      loadLogs();
    } catch (error: any) {
      console.error('日志清理失败：', error);
    } finally {
      await endOperation();
    }
  };

  const deleteLogFile = async (it: { level: LogLevel; service: string; date: string }) => {
    startOperation();
    try {
      await deleteLogFileApi({ level: it.level, service: it.service, date: it.date });
      message.success('日志文件已删除');
      // 删除后重新加载当前页
      loadLogs();
    } catch (error: any) {
      console.error('日志删除失败:', error);
    } finally {
      await endOperation();
    }
  };

  const clearTodayLogs = async () => {
    startOperation();
    try {
      const result = await clearTodayLogsApi();
      if (result.success) {
        message.success(`今日日志清理成功，共清理 ${result.clearedCount} 个日志文件`);
        // 清理后重新加载当前页
        loadLogs();
      } else {
        message.error('今日日志清理失败');
      }
    } catch (error: any) {
      console.error('今日日志清理失败:', error);
      message.error('今日日志清理失败');
    } finally {
      await endOperation();
    }
  };

  const LevelPill = ({ lvl }: { lvl: LogLevel }) => {
    const map: Record<LogLevel, { Icon: any; color: string; bg: string; text: string }> = {
      info: { Icon: InformationCircleIcon, color: 'text-blue-600', bg: 'bg-blue-50', text: 'INFO' },
      warn: {
        Icon: ExclamationTriangleIcon,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        text: 'WARN',
      },
      error: { Icon: XCircleIcon, color: 'text-red-600', bg: 'bg-red-50', text: 'ERROR' },
      debug: { Icon: BugAntIcon, color: 'text-slate-600', bg: 'bg-slate-100', text: 'DEBUG' },
    };
    const cfg = map[lvl];
    const Icon = cfg.Icon;
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${cfg.bg} ${cfg.color}`}
      >
        <Icon className="w-3.5 h-3.5" /> {cfg.text}
      </span>
    );
  };

  // 加载时显示全屏 loading
  if (loading) {
    return <PageLoading tip="正在加载日志列表..." />;
  }

  // 清理/删除操作时显示全屏 loading
  if (operationLoading) {
    return <PageLoading tip="正在处理，请稍候..." type="saving" />;
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">日志管理</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              Modal.confirm({
                title: '确认清理今日日志',
                content: (
                  <div className="space-y-2">
                    <p>确定要清理所有今日产生的日志文件内容吗？</p>
                    <div className="bg-amber-50 p-3 rounded text-sm border border-amber-200">
                      <div className="text-amber-800">
                        <WarningIcon className="w-4 h-4 inline mr-1" />
                        <strong>注意：</strong>此操作将清理所有服务、所有级别的今日日志内容（从今日 00:00 到现在）
                      </div>
                      <div className="text-amber-700 mt-1">
                        • 仅清理日志内容，不会删除日志文件<br/>
                        • 清理后日志内容将无法恢复<br/>
                        • 建议在确认无重要日志后再执行此操作
                      </div>
                    </div>
                  </div>
                ),
                okText: '确认清理',
                okType: 'default',
                cancelText: '取消',
                onOk: clearTodayLogs,
              });
            }}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 hover:border-amber-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <XCircleIcon className="w-4 h-4" />
            清理今日日志
          </button>
          <button
            onClick={loadLogs}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 hover:border-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-end mb-4">
        <div className="flex flex-col">
          <label className="block text-xs text-slate-500 mb-1">项目</label>
          <Select
            value={service || undefined}
            onChange={(v) => {
              setService(v || '');
              setPage(1);
            }}
            allowClear
            placeholder="全部"
            style={{ width: 260, height: 36 }}
            options={[
              { label: '全部', value: '' },
              ...services.map((s) => ({ label: serviceNameMap[s] || s, value: s })),
            ]}
          />
        </div>
        <div className="flex flex-col">
          <label className="block text-xs text-slate-500 mb-1">级别</label>
          <Select
            value={level || undefined}
            onChange={(v) => {
              setLevel((v || '') as any);
              setPage(1);
            }}
            allowClear
            placeholder="全部"
            style={{ width: 260, height: 36 }}
            options={[
              { label: '全部', value: '' },
              ...levels.map((lv) => ({ label: lv.toUpperCase(), value: lv })),
            ]}
          />
        </div>
        <div className="flex flex-col">
          <label className="block text-xs text-slate-500 mb-1">日期</label>
          <DatePicker
            value={date ? dayjs(date) : null}
            onChange={(d) => {
              setDate(d ? d.format('YYYY-MM-DD') : '');
              setPage(1);
            }}
            style={{ width: 260, height: 36 }}
            placeholder="选择日期"
          />
        </div>
      </div>

      {/* Ant Design Table 自适应表格 */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <Table
          columns={columns}
          dataSource={items}
          rowKey={(record: any, index?: number) => `${record.service}-${record.date}-${record.level}-${index}`}
          pagination={false}
          scroll={{ x: 800 }}
          size="middle"
          loading={loading}
        />
      </div>

      {/* 外部分页组件 */}
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


      {/* 日志查看器侧拉弹框 */}
      <LogViewerDrawer
        open={viewerOpen}
        onClose={() => {
          setViewerOpen(false);
          setViewingLog(null);
        }}
        logItem={viewingLog}
      />
    </div>
  );
}
