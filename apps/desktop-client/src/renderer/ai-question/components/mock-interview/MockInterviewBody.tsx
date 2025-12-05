import * as Tooltip from '@radix-ui/react-tooltip';
import 'animate.css/animate.min.css';
import { Copy, Check, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { logger } from '../../../../utils/rendererLogger.js';

interface WindowBodyProps {
  aiMessage?: string; // AI 参考答案
  candidateAnswer?: string; // 用户回答
  isLoading: boolean;
  interviewState?: string; // 面试状态
  message?: string; // 状态消息（错误原因、停止原因等）
  isError?: boolean; // 是否是错误状态（只有 error 才显示红色）
}

export function MockInterviewBody({ aiMessage, candidateAnswer, isLoading, message, isError }: WindowBodyProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [historyAskedQuestion, setHistoryAskedQuestion] = useState<string>('');
  const [historyAiMessage, setHistoryAiMessage] = useState<string>('');
  const [historyCandidateAnswer, setHistoryCandidateAnswer] = useState<string>('');
  const [isShowingHistory, setIsShowingHistory] = useState(false);
  const [isHoveringQuestion, setIsHoveringQuestion] = useState(false);
  const [isHoveringAi, setIsHoveringAi] = useState(false);
  const [isHoveringMyAnswer, setIsHoveringMyAnswer] = useState(false);
  const [isCopiedQuestion, setIsCopiedQuestion] = useState(false);
  const [isCopiedAi, setIsCopiedAi] = useState(false);
  const [isCopiedMyAnswer, setIsCopiedMyAnswer] = useState(false);

  // 复制文本内容
  const handleCopyContent = (content: string, type: 'question' | 'ai' | 'myAnswer') => {
    try {
      logger.info(`复制内容: ${content.substring(0, 50)}...`);
      // 使用 Electron 原生剪贴板 API
      (window as any).electronAPI?.clipboard?.writeText(content);
      logger.info('复制成功');
      if (type === 'question') {
        setIsCopiedQuestion(true);
        setTimeout(() => setIsCopiedQuestion(false), 2000);
      } else if (type === 'ai') {
        setIsCopiedAi(true);
        setTimeout(() => setIsCopiedAi(false), 2000);
      } else {
        setIsCopiedMyAnswer(true);
        setTimeout(() => setIsCopiedMyAnswer(false), 2000);
      }
    } catch (error) {
      logger.error(`复制失败: ${error}`);
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
    const channel = new BroadcastChannel('mock-interview-history-click');
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'LOAD_HISTORY_REVIEW') {
        setHistoryAskedQuestion(event.data.data.askedQuestion || '');
        setHistoryAiMessage(event.data.data.aiMessage || '');
        setHistoryCandidateAnswer(event.data.data.candidateAnswer || '');
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
    setHistoryAskedQuestion('');
    setHistoryAiMessage('');
    setHistoryCandidateAnswer('');
    setIsShowingHistory(false);
    // 通知历史窗口取消选中状态
    const channel = new BroadcastChannel('mock-interview-history-click');
    channel.postMessage({ type: 'CLEAR_SELECTION' });
    channel.close();
  };

  // 决定显示哪个消息：历史记录优先
  const displayAiMessage = isShowingHistory ? historyAiMessage : aiMessage;

  return (
    <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
      <div className="ai-window-body" ref={contentRef} style={{ flex: 1, overflow: 'auto' }}>
        {!displayAiMessage && !isLoading ? (
          // 空状态显示
          <div className="ai-empty-state">
            <div className="ai-empty-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="ai-empty-title">{message ? '面试已结束' : '等待面试开始'}</div>
            <div className="ai-empty-description" style={isError ? { color: '#ef4444' } : undefined}>
              {message || 'AI 参考答案和您的回答将在这里显示'}
            </div>
          </div>
        ) : isShowingHistory ? (
          // 历史记录模式：显示面试官问题、AI 回答、我的回答
          <div className="ai-messages">
            {/* 面试官问题（靠左，90% 宽度） */}
            {historyAskedQuestion && (
              <div
                className="ai-message ai-message-interviewer animate__animated animate__fadeInUp"
                style={{ width: '90%', alignSelf: 'flex-start', position: 'relative' }}
                onMouseEnter={() => setIsHoveringQuestion(true)}
                onMouseLeave={() => setIsHoveringQuestion(false)}
              >
                <div className="ai-message-label">面试官问题</div>
                <div className="ai-message-content">
                  {historyAskedQuestion.split('\n').map((line, index) => (
                    <div key={index} className="message-line">
                      {line || '\u00A0'}
                    </div>
                  ))}
                </div>
                {/* 复制按钮 */}
                {isHoveringQuestion && (
                  <button
                    className="message-copy-btn"
                    onClick={() => handleCopyContent(historyAskedQuestion, 'question')}
                    title={isCopiedQuestion ? '已复制' : '复制内容'}
                    style={isCopiedQuestion ? { background: 'rgba(34, 197, 94, 0.8)' } : undefined}
                  >
                    {isCopiedQuestion ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                )}
              </div>
            )}

            {/* AI 回答（靠右，90% 宽度） */}
            {historyAiMessage && (
              <div
                className="ai-message ai-message-history-ai animate__animated animate__fadeInUp"
                style={{ width: '90%', alignSelf: 'flex-end', position: 'relative' }}
                onMouseEnter={() => setIsHoveringAi(true)}
                onMouseLeave={() => setIsHoveringAi(false)}
              >
                <div className="ai-message-label">AI 回答</div>
                <div className="ai-message-content">
                  {historyAiMessage.split('\n').map((line, index) => (
                    <div key={index} className="message-line">
                      {line || '\u00A0'}
                    </div>
                  ))}
                </div>
                {/* 复制按钮 */}
                {isHoveringAi && (
                  <button
                    className="message-copy-btn"
                    onClick={() => handleCopyContent(historyAiMessage, 'ai')}
                    title={isCopiedAi ? '已复制' : '复制内容'}
                    style={isCopiedAi ? { background: 'rgba(34, 197, 94, 0.8)' } : undefined}
                  >
                    {isCopiedAi ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                )}
              </div>
            )}

            {/* 我的回答（靠右，90% 宽度） */}
            {historyCandidateAnswer && (
              <div
                className="ai-message ai-message-user animate__animated animate__fadeInUp"
                style={{ width: '90%', alignSelf: 'flex-end', position: 'relative' }}
                onMouseEnter={() => setIsHoveringMyAnswer(true)}
                onMouseLeave={() => setIsHoveringMyAnswer(false)}
              >
                <div className="ai-message-label">我的回答</div>
                <div className="ai-message-content">
                  {historyCandidateAnswer.split('\n').map((line, index) => (
                    <div key={index} className="message-line">
                      {line || '\u00A0'}
                    </div>
                  ))}
                </div>
                {/* 复制按钮 */}
                {isHoveringMyAnswer && (
                  <button
                    className="message-copy-btn"
                    onClick={() => handleCopyContent(historyCandidateAnswer, 'myAnswer')}
                    title={isCopiedMyAnswer ? '已复制' : '复制内容'}
                    style={isCopiedMyAnswer ? { background: 'rgba(34, 197, 94, 0.8)' } : undefined}
                  >
                    {isCopiedMyAnswer ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          // 正常模式：显示当前 AI 回答
          <div className="ai-messages">
            {/* AI 参考答案气泡（靠左） */}
            {displayAiMessage && (
              <div
                className="ai-message ai-message-ai ai-message-reference animate__animated animate__fadeInUp"
                style={{ position: 'relative' }}
                onMouseEnter={() => setIsHoveringAi(true)}
                onMouseLeave={() => setIsHoveringAi(false)}
              >
                <div className="ai-message-content">
                  {displayAiMessage.split('\n').map((line, index) => (
                    <div key={index} className="message-line">
                      {line || '\u00A0'}
                    </div>
                  ))}
                </div>
                {/* 复制按钮 - 鼠标悬浮时显示 */}
                {isHoveringAi && (
                  <button
                    className="message-copy-btn"
                    onClick={() => handleCopyContent(displayAiMessage, 'ai')}
                    title={isCopiedAi ? '已复制' : '复制内容'}
                    style={isCopiedAi ? { background: 'rgba(34, 197, 94, 0.8)' } : undefined}
                  >
                    {isCopiedAi ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                )}
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
      </div>

      {/* 恢复当前对话按钮 - 固定在右下角（相对于外层容器），仅在查看历史记录时显示 */}
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
                  恢复到当前对话
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