import { UserIcon } from '@heroicons/react/24/outline';
import { ChatBubbleLeftIcon } from '@heroicons/react/24/solid';
import { useEffect, useState } from 'react';
import {
    fetchAIConversationDetail,
    type AIConversation,
    type AIMessage,
} from '../../api/ai-conversations';
import DrawerProvider, { DrawerContent, DrawerHeader } from '../../components/DrawerProvider';

interface AIConversationDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  conversation: AIConversation | null;
}


export default function AIConversationDetailDrawer({ 
  open, 
  onClose, 
  conversation 
}: AIConversationDetailDrawerProps) {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [loading, setLoading] = useState(false);

  // 获取状态标签样式
  const getStatusBadge = (status: string) => {
    const baseClass = 'px-2 py-1 rounded-full text-xs font-medium';
    switch (status) {
      case 'active':
        return `${baseClass} bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200`;
      case 'completed':
        return `${baseClass} bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200`;
      case 'error':
        return `${baseClass} bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200`;
      default:
        return `${baseClass} bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200`;
    }
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return '进行中';
      case 'completed':
        return '已完成';
      case 'error':
        return '出错';
      default:
        return '未知';
    }
  };

  // 格式化响应时间
  const formatResponseTime = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // 渲染消息内容（支持 markdown 格式的基本解析）
  const renderMessageContent = (content: string, format: string) => {
    if (format === 'markdown') {
      // 简单的 markdown 渲染（实际项目可以使用 react-markdown）
      return (
        <div
          className="prose prose-sm max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{
            __html: content
              .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mb-2 mt-4 dark:text-slate-100">$1</h3>')
              .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mb-3 mt-4 dark:text-slate-100">$1</h2>')
              .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-4 mt-4 dark:text-slate-100">$1</h1>')
              .replace(/\*\*(.*?)\*\*/g, '<strong class="dark:text-slate-100">$1</strong>')
              .replace(/\*(.*?)\*/g, '<em class="dark:text-slate-200">$1</em>')
              .replace(/`(.*?)`/g, '<code class="bg-gray-100 dark:bg-slate-700 dark:text-slate-100 px-1 py-0.5 rounded">$1</code>')
              .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-gray-100 dark:bg-slate-700 p-3 rounded mt-2 mb-2 overflow-x-auto"><code class="dark:text-slate-100">$2</code></pre>')
              .replace(/\n/g, '<br>')
          }}
        />
      );
    }

    // 普通文本，保持换行
    return (
      <div className="whitespace-pre-wrap dark:text-slate-100">
        {content}
      </div>
    );
  };

  // 加载对话消息
  const loadMessages = async () => {
    if (!conversation) return;
    
    setLoading(true);
    try {
      const response = await fetchAIConversationDetail(conversation.id);
      setMessages(response.messages);
    } catch {
      
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && conversation) {
      loadMessages();
    } else {
      setMessages([]);
    }
  }, [open, conversation]);

  return (
    <DrawerProvider
      open={open}
      onClose={onClose}
      width="80%"
    >
      <DrawerHeader>
        <div className="flex items-center gap-3">
          <span className="font-medium">AI 对话详情</span>
          {conversation && (
            <span className={getStatusBadge(conversation.status)}>
              {getStatusText(conversation.status)}
            </span>
          )}
        </div>
      </DrawerHeader>
      
      <DrawerContent>
        {conversation && (
          <div className="space-y-6">
            {/* 对话基本信息 */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold mb-4 dark:text-slate-100">对话信息</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-center py-2 border-b border-gray-100 dark:border-slate-700">
                  <span className="w-28 text-sm font-medium text-gray-900 dark:text-slate-100 flex-shrink-0">对话标题</span>
                  <span className="text-sm text-gray-700 dark:text-slate-200">{conversation.title}</span>
                </div>
                <div className="flex items-center py-2 border-b border-gray-100 dark:border-slate-700">
                  <span className="w-28 text-sm font-medium text-gray-900 dark:text-slate-100 flex-shrink-0">模型</span>
                  <span className="text-sm text-gray-700 dark:text-slate-200">{conversation.model_provider} · {conversation.model_name}</span>
                </div>
                <div className="flex items-center py-2 border-b border-gray-100 dark:border-slate-700">
                  <span className="w-28 text-sm font-medium text-gray-900 dark:text-slate-100 flex-shrink-0">消息数量</span>
                  <span className="text-sm text-gray-700 dark:text-slate-200">{conversation.message_count} 条</span>
                </div>
                <div className="flex items-center py-2 border-b border-gray-100 dark:border-slate-700">
                  <span className="w-28 text-sm font-medium text-gray-900 dark:text-slate-100 flex-shrink-0">Token 使用</span>
                  <span className="text-sm text-gray-700 dark:text-slate-200">{conversation.token_used} tokens</span>
                </div>
                <div className="flex items-center py-2 border-b border-gray-100 dark:border-slate-700">
                  <span className="w-28 text-sm font-medium text-gray-900 dark:text-slate-100 flex-shrink-0">创建时间</span>
                  <span className="text-sm text-gray-700 dark:text-slate-200">
                    {new Date(conversation.created_at * 1000).toLocaleString('zh-CN')}
                  </span>
                </div>
                <div className="flex items-center py-2 border-b border-gray-100 dark:border-slate-700">
                  <span className="w-28 text-sm font-medium text-gray-900 dark:text-slate-100 flex-shrink-0">更新时间</span>
                  <span className="text-sm text-gray-700 dark:text-slate-200">
                    {new Date(conversation.updated_at * 1000).toLocaleString('zh-CN')}
                  </span>
                </div>
              </div>
            </div>

            {/* 对话消息列表 */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold mb-4 dark:text-slate-100">对话内容</h3>

              {loading ? (
                <div className="text-center py-8 text-gray-500 dark:text-slate-200">
                  加载中...
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-slate-200">
                  暂无消息
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className="flex gap-4">
                      {/* 消息头像 */}
                      <div className="flex-shrink-0">
                        {msg.message_type === 'user' ? (
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                            <UserIcon className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                            <ChatBubbleLeftIcon className="w-5 h-5 text-green-600 dark:text-green-300" />
                          </div>
                        )}
                      </div>

                      {/* 消息内容 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
                            {msg.message_type === 'user' ? '用户' : 'AI 助手'}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-slate-200">
                            {new Date(msg.created_at * 1000).toLocaleString('zh-CN')}
                          </span>
                          {msg.message_type === 'assistant' && msg.response_time_ms && (
                            <span className="text-xs text-gray-500 dark:text-slate-200">
                              响应时间: {formatResponseTime(msg.response_time_ms)}
                            </span>
                          )}
                        </div>

                        <div className={`text-sm p-3 rounded-lg ${
                          msg.message_type === 'user'
                            ? 'bg-blue-50 dark:bg-blue-900/20 dark:bg-blue-900/30 border-l-4 border-blue-400 dark:border-blue-500'
                            : 'bg-gray-50 dark:bg-gray-800 dark:bg-slate-700 border-l-4 border-green-400 dark:border-green-500'
                        }`}>
                          {renderMessageContent(msg.content, msg.content_format)}
                        </div>

                        {/* 消息元信息 */}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-slate-200">
                          <span>序号: {msg.sequence_number}</span>
                          <span>Token: {msg.token_count}</span>
                          {msg.error_message && (
                            <span className="text-red-500 dark:text-red-400 dark:text-red-400">错误: {msg.error_message}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DrawerContent>
    </DrawerProvider>
  );
}