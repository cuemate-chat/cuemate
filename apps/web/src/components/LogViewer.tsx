import Editor from '@monaco-editor/react';
import { Spin } from 'antd';
import React, { useEffect, useState } from 'react';

interface LogViewerProps {
  title?: string;
  logs: string;
  loading?: boolean;
  height?: number;
}

// 清理日志中的控制字符（无正则实现，规避 no-control-regex）
const cleanLogs = (logs: string) => {
  if (!logs) return '';
  let result = '';
  for (let i = 0; i < logs.length; i += 1) {
    const code = logs.charCodeAt(i);
    // 允许常见的可见字符以及换行(10)、回车(13)、制表符(9)
    const isVisible = (code >= 32 && code !== 127) || code === 10 || code === 13 || code === 9;
    if (isVisible) {
      result += logs[i];
    }
  }
  return result;
};

const LogViewer: React.FC<LogViewerProps> = ({
  title = '日志查看器',
  logs,
  loading = false,
  height = 600
}) => {
  const [editorKey, setEditorKey] = useState(0);
  const cleanedLogs = cleanLogs(logs);
  const editorHeight = height - 40; // 减去标题栏高度

  // 当 logs 变化时强制重新渲染 Monaco Editor
  useEffect(() => {
    setEditorKey(prev => prev + 1);
  }, [logs]);

  return (
    <div style={{ height: `${height}px` }}>
      <Spin spinning={loading}>
        <div className="h-full">
          <div className="bg-gray-800 text-gray-300 px-4 py-2 text-sm border-b border-gray-700">
            $ {title.toLowerCase().includes('日志') ? 'logs' : 'view'}
          </div>
          <div style={{ height: `${editorHeight}px` }}>
            <Editor
              key={editorKey}
              height="100%"
              language="plaintext"
              theme="vs-dark"
              value={cleanedLogs || '暂无日志'}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 13,
                lineNumbers: 'on',
                folding: false,
                wordWrap: 'on',
                renderWhitespace: 'none',
                glyphMargin: true,
                lineDecorationsWidth: 10,
                lineNumbersMinChars: 3,
                overviewRulerBorder: false,
                hideCursorInOverviewRuler: true,
                overviewRulerLanes: 0,
                scrollbar: {
                  vertical: 'visible',
                  horizontal: 'visible',
                  verticalScrollbarSize: 12,
                  horizontalScrollbarSize: 12
                },
                padding: { top: 8, bottom: 8 }
              }}
            />
          </div>
        </div>
      </Spin>
    </div>
  );
};

export default LogViewer;