import 'animate.css/animate.min.css';
import { useRef } from 'react';

interface WindowBodyProps {
  aiMessage?: string; // 只显示最新的AI回答
  isLoading: boolean;
}

export function MockInterviewBody({ aiMessage, isLoading }: WindowBodyProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div className="ai-window-body" ref={contentRef}>
      {!aiMessage && !isLoading ? (
        // 空状态显示
        <div className="ai-empty-state">
          <div className="ai-empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="ai-empty-title">等待AI回答</div>
          <div className="ai-empty-description">
            AI的回答将在这里显示
          </div>
        </div>
      ) : (
        // AI消息显示
        <div className="ai-messages">
          {isLoading ? (
            <div className="ai-message ai-message-ai">
              <div className="ai-message-content">
                <div className="ai-loading-spinner" />
              </div>
            </div>
          ) : aiMessage ? (
            <div className="ai-message ai-message-ai animate__animated animate__fadeInUp">
              <div className="ai-message-content">
                {aiMessage.split('\n').map((line, index) => (
                  <div key={index} className="message-line">
                    {line || '\u00A0'}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}