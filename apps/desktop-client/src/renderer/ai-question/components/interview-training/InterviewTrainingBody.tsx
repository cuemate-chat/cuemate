import * as Tooltip from '@radix-ui/react-tooltip';
import 'animate.css/animate.min.css';
import { Copy, Check, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface WindowBodyProps {
  aiMessage?: string; // AI 参考答案
  candidateAnswer?: string; // 用户回答
  isLoading: boolean;
}

export function InterviewTrainingBody({ aiMessage, candidateAnswer, isLoading }: WindowBodyProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [historyAiMessage, setHistoryAiMessage] = useState<string>('');
  const [isShowingHistory, setIsShowingHistory] = useState(false);
  const [isHoveringMessage, setIsHoveringMessage] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // 复制文本内容
  const handleCopyContent = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  // 自动滚动到底部
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [candidateAnswer, aiMessage, historyAiMessage]);

  // 监听来自 History 窗口的消息
  useEffect(() => {
    const channel = new BroadcastChannel('interview-training-history-click');
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'LOAD_HISTORY_REVIEW') {
        setHistoryAiMessage(event.data.data.aiMessage);
        setIsShowingHistory(true);
      }
    };

    channel.addEventListener('message', handleMessage);

    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
    };
  }, []);

  // 恢复当前对话
  const handleRestoreCurrentConversation = () => {
    setHistoryAiMessage('');
    setIsShowingHistory(false);
  };

  // 决定显示哪个消息：历史记录优先
  const displayAiMessage = isShowingHistory ? historyAiMessage : aiMessage;

  return (
    <div className="ai-window-body" ref={contentRef} style={{ position: 'relative' }}>
      {!displayAiMessage && !isLoading ? (
        // 空状态显示
        <div className="ai-empty-state">
          <div className="ai-empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="ai-empty-title">等待训练开始</div>
          <div className="ai-empty-description">
            AI 分析结果和您的回答将在这里显示
          </div>
        </div>
      ) : (
        // 消息气泡显示
        <div className="ai-messages">
          {/* 参考答案气泡（靠左） */}
          {displayAiMessage && (
            <div
              className="ai-message ai-message-ai ai-message-reference animate__animated animate__fadeInUp"
              style={{ position: 'relative' }}
              onMouseEnter={() => setIsHoveringMessage(true)}
              onMouseLeave={() => setIsHoveringMessage(false)}
            >
              <div className="ai-message-content">
                {displayAiMessage.split('\n').map((line, index) => (
                  <div key={index} className="message-line">
                    {line || '\u00A0'}
                  </div>
                ))}
              </div>
              {/* 复制按钮 - 鼠标悬浮时显示 */}
              {isHoveringMessage && (
                <Tooltip.Provider delayDuration={150} skipDelayDuration={300}>
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <button
                        onClick={() => handleCopyContent(displayAiMessage)}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: isCopied ? 'rgba(34, 197, 94, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                          color: isCopied ? 'white' : '#666',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!isCopied) {
                            e.currentTarget.style.backgroundColor = 'rgba(0, 123, 255, 0.1)';
                            e.currentTarget.style.color = '#007bff';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isCopied) {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                            e.currentTarget.style.color = '#666';
                          }
                        }}
                      >
                        {isCopied ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content className="radix-tooltip-content" side="top" sideOffset={6}>
                        {isCopied ? '已复制' : '复制内容'}
                        <Tooltip.Arrow className="radix-tooltip-arrow" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                </Tooltip.Provider>
              )}
            </div>
          )}

          {/* 用户回答气泡（靠右） - 仅在查看历史记录时显示 */}
          {isShowingHistory && candidateAnswer && (
            <div className="ai-message ai-message-user animate__animated animate__fadeInUp">
              <div className="ai-message-content">
                {candidateAnswer.split('\n').map((line, index) => (
                  <div key={index} className="message-line">
                    {line || '\u00A0'}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 加载状态 */}
          {isLoading && (
            <div className="ai-message ai-message-ai">
              <div className="ai-message-content">
                <div className="ai-loading-spinner" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 恢复当前对话按钮 - 固定在右下角，仅在查看历史记录时显示 */}
      {isShowingHistory && (
        <div style={{
          position: 'absolute',
          bottom: '16px',
          right: '16px',
          zIndex: 1000
        }}>
          <Tooltip.Provider delayDuration={150} skipDelayDuration={300}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button
                  onClick={handleRestoreCurrentConversation}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: 'rgba(0, 123, 255, 0.6)',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                    transition: 'all 0.2s ease',
                    opacity: 0.8
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1)';
                    e.currentTarget.style.opacity = '1';
                    e.currentTarget.style.backgroundColor = 'rgba(0, 123, 255, 0.8)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.opacity = '0.8';
                    e.currentTarget.style.backgroundColor = 'rgba(0, 123, 255, 0.6)';
                  }}
                >
                  <RotateCcw size={16} />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content className="radix-tooltip-content" side="top" sideOffset={6}>
                  恢复当前对话
                  <Tooltip.Arrow className="radix-tooltip-arrow" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
        </div>
      )}
    </div>
  );
}