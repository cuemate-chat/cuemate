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

// 清理日志中的控制字符
const cleanLogs = (logs: string) => {
  return logs
    .replace(/\u0000/g, '') // 移除 null 字符
    .replace(/\u0001/g, '') // 移除 SOH 字符
    .replace(/\u0002/g, '') // 移除 STX 字符
    .replace(/\u0003/g, '') // 移除 ETX 字符
    .replace(/\u0004/g, '') // 移除 EOT 字符
    .replace(/\u0005/g, '') // 移除 ENQ 字符
    .replace(/\u0006/g, '') // 移除 ACK 字符
    .replace(/\u0007/g, '') // 移除 BEL 字符
    .replace(/\u0008/g, '') // 移除 BS 字符
    .replace(/\u000B/g, '') // 移除 VT 字符
    .replace(/\u000C/g, '') // 移除 FF 字符
    .replace(/\u000E/g, '') // 移除 SO 字符
    .replace(/\u000F/g, '') // 移除 SI 字符
    .replace(/\u0010/g, '') // 移除 DLE 字符
    .replace(/\u0011/g, '') // 移除 DC1 字符
    .replace(/\u0012/g, '') // 移除 DC2 字符
    .replace(/\u0013/g, '') // 移除 DC3 字符
    .replace(/\u0014/g, '') // 移除 DC4 字符
    .replace(/\u0015/g, '') // 移除 NAK 字符
    .replace(/\u0016/g, '') // 移除 SYN 字符
    .replace(/\u0017/g, '') // 移除 ETB 字符
    .replace(/\u0018/g, '') // 移除 CAN 字符
    .replace(/\u0019/g, '') // 移除 EM 字符
    .replace(/\u001A/g, '') // 移除 SUB 字符
    .replace(/\u001B/g, '') // 移除 ESC 字符
    .replace(/\u001C/g, '') // 移除 FS 字符
    .replace(/\u001D/g, '') // 移除 GS 字符
    .replace(/\u001E/g, '') // 移除 RS 字符
    .replace(/\u001F/g, '') // 移除 US 字符
    .replace(/\u007F/g, ''); // 移除 DEL 字符
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
