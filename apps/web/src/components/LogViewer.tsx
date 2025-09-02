import { CopyOutlined } from '@ant-design/icons';
import Editor from '@monaco-editor/react';
import { Button, Modal, Spin } from 'antd';
import React from 'react';
import { message } from './Message';

interface LogViewerProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  logs: string;
  loading?: boolean;
  width?: number;
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
  visible,
  onClose,
  title = '日志查看器',
  logs,
  loading = false,
  width = 1000,
  height = 600
}) => {
  // 复制日志内容
  const copyLogs = async () => {
    try {
      await navigator.clipboard.writeText(logs);
      message.success('日志内容已复制到剪贴板');
    } catch (error) {
      // 降级方案：使用传统的复制方法
      const textArea = document.createElement('textarea');
      textArea.value = logs;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      message.success('日志内容已复制到剪贴板');
    }
  };

  const cleanedLogs = cleanLogs(logs);
  const editorHeight = height - 60; // 减去标题栏和命令栏的高度

  return (
    <Modal
      title={
        <div className="flex items-center justify-between w-full pr-8">
          <div className="flex items-center space-x-2">
            <span className="text-green-500">●</span>
            <span>{title}</span>
          </div>
          <Button
            type="primary"
            icon={<CopyOutlined />}
            onClick={copyLogs}
            title="复制日志内容"
            size="small"
            style={{ backgroundColor: '#1890ff', borderColor: '#1890ff' }}
          >
            复制
          </Button>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={width}
      centered
      bodyStyle={{ 
        padding: 0,
        height: `${height}px`
      }}
    >
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
    </Modal>
  );
};

export default LogViewer;
