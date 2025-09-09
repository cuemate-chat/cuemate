import { MessageCircle, Clock, Hash, Trash2 } from 'lucide-react';
import { ConversationHistoryItem, conversationHistoryService } from '../api/conversationHistoryService';

interface ConversationCardProps {
  conversation: ConversationHistoryItem;
  onSelect: (conversation: ConversationHistoryItem) => void;
  onDelete?: (conversationId: number) => void;
  isSelected?: boolean;
}

export function ConversationCard({ 
  conversation, 
  onSelect, 
  onDelete, 
  isSelected = false 
}: ConversationCardProps) {
  
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止卡片选择事件
    
    if (window.confirm(`确定要删除对话"${conversation.title}"吗？此操作不可撤销。`)) {
      if (onDelete) {
        onDelete(conversation.id);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'var(--color-success)';
      case 'completed':
        return 'var(--color-info)';
      case 'error':
        return 'var(--color-error)';
      default:
        return 'var(--color-text-secondary)';
    }
  };

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

  return (
    <div 
      className={`conversation-card ${isSelected ? 'conversation-card-selected' : ''}`}
      onClick={() => onSelect(conversation)}
    >
      <div className="conversation-card-header">
        <div className="conversation-card-title">
          <MessageCircle size={16} />
          <span className="conversation-title-text" title={conversation.title}>
            {conversation.title}
          </span>
        </div>
        <div className="conversation-card-actions">
          <span 
            className="conversation-status"
            style={{ color: getStatusColor(conversation.status) }}
          >
            {getStatusText(conversation.status)}
          </span>
          {onDelete && (
            <button
              className="conversation-delete-btn"
              onClick={handleDelete}
              title="删除对话"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="conversation-card-content">
        <div className="conversation-model-info">
          <span className="conversation-model">
            {conversation.model_provider} · {conversation.model_name}
          </span>
        </div>
      </div>

      <div className="conversation-card-footer">
        <div className="conversation-stats">
          <div className="conversation-stat">
            <Hash size={12} />
            <span>{conversation.message_count} 条消息</span>
          </div>
          {conversation.token_used > 0 && (
            <div className="conversation-stat">
              <span>{conversation.token_used} tokens</span>
            </div>
          )}
        </div>
        <div className="conversation-time">
          <Clock size={12} />
          <span>{conversationHistoryService.formatTime(conversation.updated_at)}</span>
        </div>
      </div>
    </div>
  );
}