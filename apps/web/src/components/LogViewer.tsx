import Editor, { type OnMount } from '@monaco-editor/react';
import { Spin } from 'antd';
import React, { useEffect, useRef } from 'react';
import type * as monaco from 'monaco-editor';

interface LogViewerProps {
  title?: string;
  logs: string;
  loading?: boolean;
  height?: number;
  autoScroll?: boolean;
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
  height = 600,
  autoScroll = true,
}) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const cleanedLogs = cleanLogs(logs);
  const editorHeight = height - 40; // 减去标题栏高度

  // 当 logs 变化时滚动到底部
  useEffect(() => {
    if (editorRef.current && autoScroll) {
      const model = editorRef.current.getModel();
      if (model) {
        const lineCount = model.getLineCount();
        editorRef.current.revealLine(lineCount);
      }
    }
  }, [logs, autoScroll]);

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;
    // 初始化时滚动到底部
    if (autoScroll) {
      const model = editor.getModel();
      if (model) {
        const lineCount = model.getLineCount();
        editor.revealLine(lineCount);
      }
    }
  };

  return (
    <div style={{ height: `${height}px` }}>
      <Spin spinning={loading}>
        <div className="h-full">
          <div className="bg-gray-800 text-gray-300 px-4 py-2 text-sm border-b border-gray-700">
            $ {title.toLowerCase().includes('日志') ? 'logs' : 'view'}
          </div>
          <div style={{ height: `${editorHeight}px` }}>
            <Editor
              height="100%"
              language="plaintext"
              theme="vs-dark"
              value={cleanedLogs || '暂无日志'}
              onMount={handleEditorMount}
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