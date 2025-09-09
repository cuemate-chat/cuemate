import * as Tooltip from '@radix-ui/react-tooltip';
import 'animate.css/animate.min.css';
import { Copy, StopCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useScrollFadeEffect } from '../hooks/useScrollFadeEffect';
import { ScrollFadeMessageList, MessageData } from '../components/ScrollFadeMessage';

// 使用现代化的公共组件架构
// 所有ScrollAnimation和渐变功能已提取为独立组件

interface WindowBodyProps {
  messages: Array<{id: string, type: 'user' | 'ai', content: string}>;
  isLoading: boolean;
}

export function WindowBody({ messages, isLoading }: WindowBodyProps) {
  const messagesRef = useRef<HTMLDivElement>(null);

  // 转换消息格式为MessageData类型
  const messageData: MessageData[] = messages.map(msg => ({
    id: msg.id,
    type: msg.type,
    content: msg.content
  }));

  // 使用滚动渐变效果Hook
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
    <>
      <ScrollFadeMessageList
        ref={messagesRef}
        messages={messageData}
        isLoading={isLoading}
        containerClassName="ai-window-body"
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
      
      {/* 底部居中悬浮分段按钮 */}
      <div className="ai-floating-actions">
        <Tooltip.Provider delayDuration={150} skipDelayDuration={300}>
          <div className="ai-segmented">
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button
                  className="ai-segmented-btn ai-segmented-btn-left"
                  onClick={() => {
                    const evt = new CustomEvent('ai-question-stop');
                    window.dispatchEvent(evt);
                  }}
                  disabled={!isLoading}
                  title="停止对话"
                >
                  <StopCircle size={16} />
                  <span className="ai-segmented-text">停止对话</span>
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content className="radix-tooltip-content" side="top" sideOffset={6}>
                  点击停止当前提问
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
                  <span className="ai-segmented-text">复制对话</span>
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content className="radix-tooltip-content" side="top" sideOffset={6}>
                  复制所有对话内容
                  <Tooltip.Arrow className="radix-tooltip-arrow" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </div>
        </Tooltip.Provider>
      </div>
    </>
  );
}