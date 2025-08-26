import { EyeIcon } from '@heroicons/react/24/outline';
import {
  BugAntIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/solid';
import { DatePicker, Modal, Select } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';
import {
  clearLogContent as clearLogContentApi,
  deleteLogFile as deleteLogFileApi,
  fetchLogContent,
  fetchLogs,
  fetchLogServices,
  LogLevel,
} from '../api/logs';
import { message } from '../components/Message';
import PaginationBar from '../components/PaginationBar';

export default function Logs() {
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
  const [viewing, setViewing] = useState<{
    level: LogLevel;
    service: string;
    date: string;
    lines: string[];
  } | null>(null);
  
  // 选中的日志行
  const [selectedLines, setSelectedLines] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // 列宽（可调节）
  type ColKey = 'name' | 'project' | 'level' | 'date' | 'size' | 'action';
  const [colWidths, setColWidths] = useState<Record<ColKey, number>>({
    name: 240,
    project: 240,
    level: 220,
    date: 260,
    size: 200,
    action: 260,
  });
  const resizingRef = useRef<{ key: ColKey; startX: number; startW: number } | null>(null);
  const MIN_COL_WIDTH = 80;

  const startResize = (key: ColKey, e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = { key, startX: e.clientX, startW: colWidths[key] };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const onMouseMove = (e: MouseEvent) => {
    const r = resizingRef.current;
    if (!r) return;
    const delta = e.clientX - r.startX;
    const next = Math.max(MIN_COL_WIDTH, Math.round(r.startW + delta));
    setColWidths((prev) => ({ ...prev, [r.key]: next }));
  };

  const onMouseUp = () => {
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    resizingRef.current = null;
  };

  const gridCols = `minmax(${colWidths.name}px, 1fr) ${colWidths.project}px ${colWidths.level}px ${colWidths.date}px ${colWidths.size}px ${colWidths.action}px`;

  // 项目中文名称映射
  const serviceNameMap: Record<string, string> = {
    'web-api': '后端 API 服务',
    'llm-router': '大模型路由',
    'rag-service': 'RAG 知识服务',
    'asr-user': '用户语音识别',
    'asr-interviewer': '面试官语音识别',
  };

  useEffect(() => {
    fetchLogServices()
      .then((res) => setServices(res.services))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchLogs({
      level: level || undefined,
      service: service || undefined,
      date: date || undefined,
      page,
      pageSize,
    })
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((err) => {
        message.error('加载日志失败：' + err);
      });
  }, [service, level, date, page, pageSize]);

  const readContent = async (it: { level: LogLevel; service: string; date: string }) => {
    try {
      const res = await fetchLogContent(it);
      setViewing(res);
      // 重置选择状态
      setSelectedLines(new Set());
      setSelectAll(false);
    } catch {
      message.error('读取日志内容失败');
    }
  };

  const clearLogContent = async (it: { level: LogLevel; service: string; date: string }) => {
    try {
      await clearLogContentApi({ level: it.level, service: it.service, date: it.date });
      message.success('日志清理成功');
      // 清理后重新加载当前页
      fetchLogs({
        level: level || undefined,
        service: service || undefined,
        date: date || undefined,
        page,
        pageSize,
      })
        .then((res) => {
          setItems(res.items);
          setTotal(res.total);
        })
        .catch((err) => {
          message.error('加载日志失败：' + err);
        });
    } catch (error: any) {
      message.error('日志清理失败：' + (error?.message || '未知错误'));
    }
  };

  const deleteLogFile = async (it: { level: LogLevel; service: string; date: string }) => {
    try {
      await deleteLogFileApi({ level: it.level, service: it.service, date: it.date });
      message.success('日志文件已删除');
      // 删除后重新加载当前页
      fetchLogs({
        level: level || undefined,
        service: service || undefined,
        date: date || undefined,
        page,
        pageSize,
      })
        .then((res) => {
          setItems(res.items);
          setTotal(res.total);
        })
        .catch((err) => {
          message.error('加载日志失败：' + err);
        });
    } catch (error: any) {
      console.error('日志删除失败:', error);
      message.error('日志删除失败：' + (error?.message || '未知错误'));
    }
  };

  // 处理行选择
  const handleLineSelect = (lineIndex: number) => {
    const newSelected = new Set(selectedLines);
    if (newSelected.has(lineIndex)) {
      newSelected.delete(lineIndex);
    } else {
      newSelected.add(lineIndex);
    }
    setSelectedLines(newSelected);
    setSelectAll(newSelected.size === viewing?.lines.length);
  };

  // 处理全选
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedLines(new Set());
      setSelectAll(false);
    } else {
      const allLines = new Set(viewing?.lines.map((_, index) => index) || []);
      setSelectedLines(allLines);
      setSelectAll(true);
    }
  };

  // 复制选中的日志行
  const copySelectedLines = () => {
    if (selectedLines.size === 0) {
      message.warning('请先选择要复制的日志行');
      return;
    }
    
    const selectedContent = viewing?.lines
      .filter((_, index) => selectedLines.has(index))
      .join('\n') || '';
    
    navigator.clipboard
      .writeText(selectedContent)
      .then(() => {
        message.success(`已复制 ${selectedLines.size} 行日志到剪贴板`);
      })
      .catch(() => {
        message.error('复制失败');
      });
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

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">日志管理</h1>

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

      <div className="border rounded">
        <div
          className="grid text-xs font-medium bg-slate-50 px-3 py-2 border-b select-none"
          style={{ gridTemplateColumns: gridCols }}
        >
          <div className="relative">
            名称
            <span
              className="absolute right-0 top-0 h-full w-1 cursor-col-resize"
              onMouseDown={(e) => startResize('name', e)}
            />
          </div>
          <div className="relative">
            项目
            <span
              className="absolute right-0 top-0 h-full w-1 cursor-col-resize"
              onMouseDown={(e) => startResize('project', e)}
            />
          </div>
          <div className="relative">
            级别
            <span
              className="absolute right-0 top-0 h-full w-1 cursor-col-resize"
              onMouseDown={(e) => startResize('level', e)}
            />
          </div>
          <div className="relative">
            日期
            <span
              className="absolute right-0 top-0 h-full w-1 cursor-col-resize"
              onMouseDown={(e) => startResize('date', e)}
            />
          </div>
          <div className="relative">
            大小
            <span
              className="absolute right-0 top-0 h-full w-1 cursor-col-resize"
              onMouseDown={(e) => startResize('size', e)}
            />
          </div>
          <div className="relative">
            操作
            <span
              className="absolute right-0 top-0 h-full w-1 cursor-col-resize"
              onMouseDown={(e) => startResize('action', e)}
            />
          </div>
        </div>
        {items.map((it, idx) => (
          <div
            key={idx}
            className="grid text-sm px-3 py-2 border-b hover:bg-slate-50"
            style={{ gridTemplateColumns: gridCols }}
          >
            <div>
              {(page - 1) * 10 + idx + 1} . {serviceNameMap[it.service] || it.service}
            </div>
            <div>{it.service}</div>
            <div>
              <LevelPill lvl={it.level} />
            </div>
            <div>{it.date}</div>
            <div>{(it.size / 1024).toFixed(1)} KB</div>
            <div className="flex items-center gap-2">
              <button
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700"
                onClick={() => readContent(it)}
              >
                <EyeIcon className="w-4 h-4" /> 查看
              </button>
              <button
                className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-700"
                onClick={() => {
                  Modal.confirm({
                    title: '确认清理日志',
                    content: (
                      <div className="space-y-2">
                        <p>确定要清理以下日志文件吗？</p>
                        <div className="bg-slate-50 p-3 rounded text-sm">
                          <div><strong>服务：</strong>{serviceNameMap[it.service] || it.service}</div>
                          <div><strong>级别：</strong>{it.level.toUpperCase()}</div>
                          <div><strong>日期：</strong>{it.date}</div>
                          <div><strong>大小：</strong>{(it.size / 1024).toFixed(1)} KB</div>
                        </div>
                        <p className="text-orange-600 text-sm">⚠️ 清理后日志内容将无法恢复！</p>
                      </div>
                    ),
                    okText: '确认清理',
                    okType: 'default',
                    cancelText: '取消',
                    onOk: () => clearLogContent(it),
                  });
                }}
              >
                <XCircleIcon className="w-4 h-4" /> 清理
              </button>
              <button
                className="inline-flex items-center gap-1 text-red-600 hover:text-red-700"
                onClick={() => {
                  Modal.confirm({
                    title: '确认删除日志文件',
                    content: (
                      <div className="space-y-2">
                        <p>确定要删除以下日志文件吗？</p>
                        <div className="bg-slate-50 p-3 rounded text-sm">
                          <div><strong>服务：</strong>{serviceNameMap[it.service] || it.service}</div>
                          <div><strong>级别：</strong>{it.level.toUpperCase()}</div>
                          <div><strong>日期：</strong>{it.date}</div>
                          <div><strong>大小：</strong>{(it.size / 1024).toFixed(1)} KB</div>
                        </div>
                        <p className="text-red-600 text-sm">🚨 删除后日志文件将完全消失，无法恢复！</p>
                        <p className="text-red-600 text-sm">此操作比清理更加危险，请谨慎操作！</p>
                      </div>
                    ),
                    okText: '确认删除',
                    okType: 'danger',
                    cancelText: '取消',
                    onOk: () => deleteLogFile(it),
                  });
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                删除
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="text-center text-slate-500 py-6">暂无数据</div>}
      </div>

      <div className="flex justify-between items-center mt-3 text-sm">
        <div className="text-slate-500">共 {total} 条</div>
        <PaginationBar 
          page={page} 
          pageSize={pageSize} 
          total={total} 
          onChange={(p) => setPage(p)}
          onPageSizeChange={(_, size) => {
            setPageSize(size);
            setPage(1);
          }}
          showSizeChanger={true}
          pageSizeOptions={['10', '20', '50', '100']}
        />
      </div>

      {viewing && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setViewing(null)}
        >
          <div
            className="bg-white w-[1200px] h-[80vh] max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部区域 */}
            <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-lg font-semibold">
                      {viewing.service.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {serviceNameMap[viewing.service] || viewing.service}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        viewing.level === 'error' ? 'bg-red-100 text-red-700' :
                        viewing.level === 'warn' ? 'bg-yellow-100 text-yellow-700' :
                        viewing.level === 'info' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {viewing.level.toUpperCase()}
                      </span>
                      <span className="text-slate-500">•</span>
                      <span>{viewing.date}</span>
                      <span className="text-slate-500">•</span>
                      <span>{viewing.lines.length} 行日志</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={copySelectedLines}
                    disabled={selectedLines.size === 0}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedLines.size === 0
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                    }`}
                  >
                    复制选中 ({selectedLines.size})
                  </button>
                  <button
                    onClick={() => {
                      const content = viewing.lines.join('\n');
                      navigator.clipboard
                        .writeText(content)
                        .then(() => {
                          message.success('已复制全部日志到剪贴板');
                        })
                        .catch(() => {
                          message.error('复制失败');
                        });
                    }}
                    className="px-4 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium transition-all"
                  >
                    复制全部
                  </button>
                  <button
                    onClick={() => setViewing(null)}
                    className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* 工具栏 */}
            <div className="px-6 py-3 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-slate-700">
                      全选 ({selectedLines.size}/{viewing.lines.length})
                    </span>
                  </label>
                </div>
                <div className="text-sm text-slate-600">
                  已选择 {selectedLines.size} 行
                </div>
              </div>
            </div>

            {/* 日志内容区域 */}
            <div className="flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto bg-slate-50">
                <div className="p-4 space-y-1">
                  {viewing.lines.map((line, index) => {
                    const isSelected = selectedLines.has(index);
                    const isJson = line.trim().startsWith('{') || line.trim().startsWith('[');
                    
                    return (
                      <div
                        key={index}
                        className={`group relative p-3 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 border-blue-200 shadow-sm'
                            : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                        onClick={() => handleLineSelect(index)}
                      >
                        {/* 复选框 */}
                        <div className="absolute left-3 top-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleLineSelect(index)}
                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        
                        {/* 行号 */}
                        <div className="absolute left-10 top-3 text-xs text-slate-400 font-mono">
                          {index + 1}
                        </div>
                        
                        {/* 日志内容 */}
                        <div className="ml-16">
                          {isJson ? (
                            <pre className="text-xs font-mono text-slate-800 whitespace-pre-wrap break-words">
                              {line}
                            </pre>
                          ) : (
                            <div className="text-sm text-slate-700 font-mono leading-relaxed">
                              {line}
                            </div>
                          )}
                        </div>
                        
                        {/* 悬停时的选择提示 */}
                        {!isSelected && (
                          <div className="absolute inset-0 bg-blue-50 border-2 border-blue-200 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center justify-center">
                            <span className="text-blue-600 text-xs font-medium">点击选择</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
