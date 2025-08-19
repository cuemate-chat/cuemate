import { EyeIcon } from '@heroicons/react/24/outline';
import {
  BugAntIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/solid';
import { DatePicker, Select } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';
import {
  clearLogContent as clearLogContentApi,
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

  // 列宽（可调节）
  type ColKey = 'name' | 'project' | 'level' | 'date' | 'size' | 'action';
  const [colWidths, setColWidths] = useState<Record<ColKey, number>>({
    name: 240,
    project: 240,
    level: 240,
    date: 260,
    size: 240,
    action: 200,
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
    'asr-gateway': '语音识别网关',
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
      pageSize: 10,
    })
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((err) => {
        console.error(err);
        message.error('加载日志失败');
      });
  }, [service, level, date, page]);

  const readContent = async (it: { level: LogLevel; service: string; date: string }) => {
    try {
      const res = await fetchLogContent(it);
      setViewing(res);
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
        pageSize: 10,
      })
        .then((res) => {
          setItems(res.items);
          setTotal(res.total);
        })
        .catch((err) => {
          console.error(err);
          message.error('加载日志失败');
        });
    } catch {
      message.error('日志清理失败');
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
            <div>
              <button
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700"
                onClick={() => readContent(it)}
              >
                <EyeIcon className="w-4 h-4" /> 查看
              </button>
              <button
                className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 ml-2"
                onClick={() => clearLogContent(it)}
              >
                <XCircleIcon className="w-4 h-4" /> 清理
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="text-center text-slate-500 py-6">暂无数据</div>}
      </div>

      <div className="flex justify-between items-center mt-3 text-sm">
        <div className="text-slate-500">共 {total} 条</div>
        <PaginationBar page={page} pageSize={10} total={total} onChange={(p) => setPage(p)} />
      </div>

      {viewing && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setViewing(null)}
        >
          <div
            className="bg-white w-[1000px] h-[70vh] max-h-[80vh] rounded shadow-xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-2 border-b flex justify-between items-center">
              <div className="font-medium">
                {serviceNameMap[viewing.service] || viewing.service} - {viewing.level.toUpperCase()}{' '}
                - {viewing.date}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const content = viewing.lines.join('\n');
                    navigator.clipboard
                      .writeText(content)
                      .then(() => {
                        message.success('已复制到剪贴板');
                      })
                      .catch(() => {
                        message.error('复制失败');
                      });
                  }}
                  className="px-3 py-1 text-blue-600 border border-blue-600 rounded hover:bg-blue-50 text-sm"
                >
                  复制日志
                </button>
                <button
                  onClick={() => setViewing(null)}
                  className="text-slate-500 hover:text-slate-700"
                >
                  关闭
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* 内容区域：只显示一遍，但可以垂直滚动 */}
              <div className="flex-1 overflow-y-auto">
                <pre
                  className="p-4 text-xs font-mono whitespace-pre"
                  style={{ minWidth: 'max-content' }}
                >
                  {viewing.lines.join('\n')}
                </pre>
              </div>
              {/* 横向滚动条固定在底部 */}
              <div className="h-2 overflow-x-auto border-t border-slate-200 bg-slate-50">
                <div style={{ height: '1px', minWidth: 'max-content' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
