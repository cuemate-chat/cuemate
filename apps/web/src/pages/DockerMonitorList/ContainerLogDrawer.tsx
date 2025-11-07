import { CopyOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useEffect, useState } from 'react';
import { DockerContainer, getContainerLogs } from '../../api/docker';
import DrawerProvider, { DrawerContent, DrawerHeader } from '../../components/DrawerProvider';
import LogViewer from '../../components/LogViewer';
import { message } from '../../components/Message';

interface ContainerLogDrawerProps {
  open: boolean;
  onClose: () => void;
  container: DockerContainer | null;
}

export default function ContainerLogDrawer({ open, onClose, container }: ContainerLogDrawerProps) {
  const [logs, setLogs] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // 获取容器日志
  const fetchLogs = async (showSuccessMessage: boolean = false) => {
    if (!container) return;

    setLoading(true);
    try {
      const logData = await getContainerLogs(container.id);
      setLogs(logData);

      if (showSuccessMessage) {
        message.success('已刷新容器日志');
      }
    } catch (error) {
      message.error('获取容器日志失败');
      setLogs('获取日志失败，请检查后端服务是否正常运行');
    } finally {
      setLoading(false);
    }
  };

  // 当容器变化时重新获取日志
  useEffect(() => {
    if (open && container) {
      fetchLogs();
    }
  }, [open, container]);

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

  // 获取状态标签颜色
  const getStatusColor = (state: string) => {
    switch (state) {
      case 'running':
        return 'text-green-600 bg-green-50 dark:bg-green-900/20 border-green-200';
      case 'stopped':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'exited':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'created':
        return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-200';
      case 'paused':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-800 border-gray-200';
    }
  };

  const getStatusText = (state: string) => {
    switch (state) {
      case 'running':
        return '运行中';
      case 'stopped':
        return '已停止';
      case 'exited':
        return '已退出';
      case 'created':
        return '已创建';
      case 'paused':
        return '已暂停';
      default:
        return state;
    }
  };

  return (
    <DrawerProvider
      open={open}
      onClose={onClose}
      width="85%"
    >
      <DrawerHeader>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-2">
            <span className="text-green-500">●</span>
            <span className="font-medium">容器日志 - {container?.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="primary"
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => fetchLogs(true)}
              loading={loading}
            >
              刷新
            </Button>
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
        </div>
      </DrawerHeader>
      
      <DrawerContent>
        {container && (
          <div className="space-y-6">
            {/* 容器信息 */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex items-center py-3 border-b border-gray-100 dark:border-slate-700">
                    <span className="w-28 text-base font-black text-gray-900 dark:text-slate-100 flex-shrink-0">容器名称</span>
                    <span className="text-sm text-gray-700 dark:text-slate-200 font-medium">{container.name}</span>
                  </div>
                  <div className="flex items-center py-3 border-b border-gray-100 dark:border-slate-700">
                    <span className="w-28 text-base font-black text-gray-900 dark:text-slate-100 flex-shrink-0">运行状态</span>
                    <span className={`text-sm px-2 py-1 rounded border ${getStatusColor(container.state)}`}>
                      {getStatusText(container.state)}
                    </span>
                  </div>
                  <div className="flex items-center py-3 border-b border-gray-100 dark:border-slate-700">
                    <span className="w-28 text-base font-black text-gray-900 dark:text-slate-100 flex-shrink-0">镜像</span>
                    <span className="text-sm text-blue-700 dark:text-blue-300 font-mono bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">{container.image}</span>
                  </div>
                  <div className="flex items-center py-3 border-b border-gray-100 dark:border-slate-700">
                    <span className="w-28 text-base font-black text-gray-900 dark:text-slate-100 flex-shrink-0">大小</span>
                    <span className="text-sm text-gray-700 dark:text-gray-200">{container.size}</span>
                  </div>
                  <div className="flex items-center py-3 border-b border-gray-100 dark:border-slate-700">
                    <span className="w-28 text-base font-black text-gray-900 dark:text-slate-100 flex-shrink-0">状态</span>
                    <span className="text-sm text-gray-700 dark:text-gray-200">{container.status}</span>
                  </div>
                  <div className="flex items-center py-3 border-b border-gray-100 dark:border-slate-700">
                    <span className="w-28 text-base font-black text-gray-900 dark:text-slate-100 flex-shrink-0">创建时间</span>
                    <span className="text-sm text-gray-700 dark:text-gray-200">
                      {new Date(container.created).toLocaleString('zh-CN')}
                    </span>
                  </div>
                </div>

                {/* 端口信息 */}
                {container.ports && container.ports.length > 0 && (
                  <div className="py-3 border-b border-gray-100 dark:border-slate-700">
                    <div className="flex items-start">
                      <span className="w-28 text-base font-black text-gray-900 dark:text-slate-100 flex-shrink-0 mt-0.5">端口</span>
                      <div className="flex flex-wrap gap-2">
                        {container.ports.map((port, index) => (
                          <span key={index} className="text-sm text-green-700 dark:text-green-300 font-mono bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded border border-green-200 dark:border-green-800">
                            {port}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 日志内容 - 直接使用 LogViewer */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700" style={{ height: '400px' }}>
              <LogViewer
                title={`容器日志 - ${container?.name}`}
                logs={logs}
                loading={loading}
                height={400}
              />
            </div>
          </div>
        )}
      </DrawerContent>
    </DrawerProvider>
  );
}
