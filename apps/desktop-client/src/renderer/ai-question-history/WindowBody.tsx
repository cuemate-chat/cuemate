import 'animate.css/animate.min.css';
import { useRef } from 'react';
import { ConversationHistoryItem } from './api/conversationHistoryService';
import { ConversationCard } from './components/ConversationCard';

interface WindowBodyProps {
  conversations: ConversationHistoryItem[];
  isLoading: boolean;
  selectedConversationId?: number;
  onConversationSelect: (conversation: ConversationHistoryItem) => void;
  onConversationDelete: (conversationId: number) => void;
  onConversationStop: (conversationId: number) => void;
}

export function WindowBody({ 
  conversations, 
  isLoading, 
  selectedConversationId,
  onConversationSelect,
  onConversationDelete,
  onConversationStop 
}: WindowBodyProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="ai-window-body conversation-history-body" ref={containerRef}>
      {conversations.length === 0 && !isLoading ? (
        // 空状态显示
        <div className="ai-empty-state">
          <div className="ai-empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="ai-empty-title">暂无历史对话</div>
          <div className="ai-empty-description">
            请在左侧向 AI 提问产生对话记录
          </div>
        </div>
      ) : isLoading ? (
        // 加载状态
        <div className="ai-loading-state">
          <div className="ai-loading-spinner" />
          <div className="ai-loading-text">加载对话历史中...</div>
        </div>
      ) : (
        // 对话卡片列表
        <div className="conversation-list">
          {conversations.map((conversation, index) => (
            <ConversationCard
              key={conversation.id}
              conversation={conversation}
              onSelect={onConversationSelect}
              onDelete={onConversationDelete}
              onStop={onConversationStop}
              isSelected={selectedConversationId === conversation.id}
              index={index + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}