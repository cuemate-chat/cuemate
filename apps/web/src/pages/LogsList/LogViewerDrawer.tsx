import { useEffect, useState } from 'react';
import { fetchLogContent, LogLevel } from '../../api/logs';
import DrawerProvider, { DrawerContent, DrawerHeader } from '../../components/DrawerProvider';
import { message } from '../../components/Message';

interface LogViewerDrawerProps {
  open: boolean;
  onClose: () => void;
  logItem: {
    level: LogLevel;
    service: string;
    date: string;
  } | null;
}

// 项目中文名称映射
const serviceNameMap: Record<string, string> = {
  'web-api': '后端 API 服务',
  'llm-router': '大模型路由',
  'rag-service': 'RAG 知识服务',
  'cuemate-asr': '语音识别服务',
  'desktop-client': '桌面客户端',
};

export default function LogViewerDrawer({ open, onClose, logItem }: LogViewerDrawerProps) {
  const [logContent, setLogContent] = useState<{
    level: LogLevel;
    service: string;
    date: string;
    lines: string[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  
  // 选中的日志行
  const [selectedLines, setSelectedLines] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    if (open && logItem) {
      loadLogContent();
    } else {
      setLogContent(null);
      setSelectedLines(new Set());
      setSelectAll(false);
    }
  }, [open, logItem]);

  const loadLogContent = async () => {
    if (!logItem) return;
    
    setLoading(true);
    try {
      const res = await fetchLogContent(logItem);
      setLogContent(res);
      // 重置选择状态
      setSelectedLines(new Set());
      setSelectAll(false);
    } catch (e) {
      console.error('读取日志内容失败', e);
      message.error('读取日志内容失败');
    } finally {
      setLoading(false);
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
    setSelectAll(newSelected.size === logContent?.lines.length);
  };

  // 处理全选
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedLines(new Set());
      setSelectAll(false);
    } else {
      const allLines = new Set(logContent?.lines.map((_, index) => index) || []);
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
    
    const selectedContent = logContent?.lines
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

  // 复制全部日志
  const copyAllLogs = () => {
    if (!logContent) return;
    
    const content = logContent.lines.join('\n');
    navigator.clipboard
      .writeText(content)
      .then(() => {
        message.success('已复制全部日志到剪贴板');
      })
      .catch(() => {
        message.error('复制失败');
      });
  };

  return (
    <DrawerProvider
      open={open}
      onClose={onClose}
      width="85%"
    >
      <DrawerHeader>
        {logItem ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1d4ed8]/20 rounded-full flex items-center justify-center">
              <span className="text-[#1d4ed8] text-lg font-semibold">
                {logItem.service.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#1d4ed8]">
                {serviceNameMap[logItem.service] || logItem.service}
              </h3>
              <div className="flex items-center gap-2 text-sm text-[#3b82f6]">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  logItem.level === 'error' ? 'bg-red-500/20 text-red-700' :
                  logItem.level === 'warn' ? 'bg-yellow-500/20 text-yellow-700' :
                  logItem.level === 'info' ? 'bg-blue-500/20 text-blue-700' :
                  'bg-[#1d4ed8]/20 text-[#1d4ed8]'
                }`}>
                  {logItem.level.toUpperCase()}
                </span>
                <span className="text-[#3b82f6]/60">•</span>
                <span>{logItem.date}</span>
                {logContent && (
                  <>
                    <span className="text-[#3b82f6]/60">•</span>
                    <span>{logContent.lines.length} 行日志</span>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <span className="text-[#1d4ed8] font-semibold">日志查看器</span>
        )}
      </DrawerHeader>
      <DrawerContent>
        <div className="h-full flex flex-col">
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
                  全选 ({selectedLines.size}/{logContent?.lines.length || 0})
                </span>
              </label>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-slate-600">
                已选择 {selectedLines.size} 行
              </div>
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
                onClick={copyAllLogs}
                className="px-4 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium transition-all"
              >
                复制全部
              </button>
            </div>
          </div>
        </div>

        {/* 日志内容区域 */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <div className="text-slate-600">加载日志内容中...</div>
              </div>
            </div>
          ) : logContent ? (
            <div className="h-full overflow-y-auto bg-slate-50">
              <div className="p-4 space-y-1">
                {logContent.lines.map((line, index) => {
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
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-slate-500">
                <div className="text-lg mb-2">📄</div>
                <div>暂无日志内容</div>
              </div>
            </div>
          )}
        </div>
        </div>
      </DrawerContent>
    </DrawerProvider>
  );
}
