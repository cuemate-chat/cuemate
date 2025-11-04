import * as Tooltip from '@radix-ui/react-tooltip';
import 'animate.css/animate.min.css';
import { Copy, MoreHorizontal, Plus } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useScrollFadeEffect } from '../../../hooks/useScrollFadeEffect';
import { MessageData, ScrollFadeMessageList } from '../../../shared/components/ScrollFadeMessage';

// 使用现代化的公共组件架构
// 所有 ScrollAnimation 和渐变功能已提取为独立组件

interface WindowBodyProps {
  messages: Array<{id: string, type: 'user' | 'ai', content: string}>;
  isLoading: boolean;
  onNewChat?: () => void;
  onAskMore?: (question: string) => void;
  onCopyLastAIResponse?: React.MutableRefObject<(() => Promise<void>) | null>;
}

export function VoiceQABody({ messages, isLoading, onNewChat, onAskMore, onCopyLastAIResponse }: WindowBodyProps) {
  const messagesRef = useRef<HTMLDivElement>(null);

  // 实现复制最近一次 AI 回答的逻辑
  const handleCopyLastAIResponse = async () => {
    try {
      const lastAIMessage = messages.filter(m => m.type === 'ai').pop();
      if (lastAIMessage) {
        await navigator.clipboard.writeText(lastAIMessage.content);
      }
    } catch (e) {
      console.error('复制 AI 回答失败:', e);
    }
  };

  // 将实现的方法传递给父组件
  useEffect(() => {
    if (onCopyLastAIResponse) {
      onCopyLastAIResponse.current = handleCopyLastAIResponse;
    }
  }, [messages, onCopyLastAIResponse]);

  // 转换消息格式为 MessageData 类型
  const messageData: MessageData[] = messages.map(msg => ({
    id: msg.id,
    type: msg.type,
    content: msg.content
  }));

  // 使用滚动渐变效果 Hook
  useScrollFadeEffect(messagesRef, {
    fadeZoneHeight: 60,
    minAlpha: 0.5,
    stepSize: 10,
    alphaStep: 0.1
  });

  // 自动滚动到最新消息
  useEffect(() => {
    if (messagesRef.current) {
      const scrollElement = messagesRef.current;
      scrollElement.scrollTop = scrollElement.scrollHeight;
    }
  }, [messages, isLoading]);

  return (
    <div className="ai-window-body" ref={messagesRef}>
      {messages.length === 0 && !isLoading ? (
        // 空状态显示
        <div className="ai-empty-state">
          <div className="ai-empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="ai-empty-title">开始对话</div>
          <div className="ai-empty-description">
            向我提问任何问题，我会尽力帮助您
          </div>
        </div>
      ) : (
        // 消息列表
        <ScrollFadeMessageList
          messages={messageData}
          isLoading={isLoading}
          containerClassName=""
          messagesClassName="ai-messages"
          animationProps={{
            animationType: 'animate__fadeInUp',
            duration: 0.6,
            delayStep: 30,
            maxDelay: 500,
            animateOnce: true,
            initiallyVisible: true,
            offset: 0
          }}
          renderOptions={{
            lineClassName: 'message-line',
            codeBlockClassName: 'ai-code-block',
            inlineCodeClassName: 'ai-inline-code'
          }}
          loadingComponent={
            <div className="ai-message ai-message-ai">
              <div className="ai-message-content">
                <div className="ai-loading-spinner" />
              </div>
            </div>
          }
        />
      )}
      
      {/* 底部居中悬浮分段按钮 - 仅在有消息时显示 */}
      {(messages.length > 0 || isLoading) && (
        <div className="ai-floating-actions">
          <Tooltip.Provider delayDuration={150} skipDelayDuration={300}>
            <div className="ai-segmented">
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button
                    className="ai-segmented-btn ai-segmented-btn-left"
                    onClick={() => {
                      const lastUserMessage = messages.filter(m => m.type === 'user').pop();
                      if (lastUserMessage && onAskMore) {
                        const moreQuestion = `告诉我更多关于"${lastUserMessage.content}"的信息`;
                        onAskMore(moreQuestion);
                      }
                    }}
                    disabled={messages.filter(m => m.type === 'user').length === 0}
                    title="告诉我关于该问题的更多内容"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content className="radix-tooltip-content" side="top" sideOffset={6}>
                    告诉我关于该问题的更多内容
                    <Tooltip.Arrow className="radix-tooltip-arrow" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
              <div className="ai-separator" />
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button
                    className="ai-segmented-btn ai-segmented-btn-middle"
                    onClick={() => onNewChat?.()}
                    disabled={isLoading}
                    title="新建提问"
                  >
                    <Plus size={16} />
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content className="radix-tooltip-content" side="top" sideOffset={6}>
                    点击停止当前窗口提问，新建提问
                    <Tooltip.Arrow className="radix-tooltip-arrow" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
              <div className="ai-separator" />
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button
                    className="ai-segmented-btn ai-segmented-btn-right"
                    onClick={async () => {
                      try {
                        const text = messages
                          .map(m => `${m.type === 'user' ? '用户' : 'AI'}: ${m.content}`)
                          .join('\n\n');
                        await navigator.clipboard.writeText(text);
                      } catch (e) {
                        console.error('复制对话失败:', e);
                      }
                    }}
                    title="复制所有对话内容"
                  >
                    <Copy size={16} />
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content className="radix-tooltip-content" side="top" sideOffset={6}>
                    复制以上所有对话内容
                    <Tooltip.Arrow className="radix-tooltip-arrow" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </div>
          </Tooltip.Provider>
        </div>
      )}
    </div>
  );
}