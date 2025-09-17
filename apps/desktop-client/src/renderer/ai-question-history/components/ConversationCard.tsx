import * as Tooltip from '@radix-ui/react-tooltip';
import { Clock, Hash, MessageCircle, Square, Trash2 } from 'lucide-react';
import { ConversationHistoryItem, conversationHistoryService } from '../api/conversationHistoryService';

interface ConversationCardProps {
  conversation: ConversationHistoryItem;
  onSelect: (conversation: ConversationHistoryItem) => void;
  onDelete?: (conversationId: number) => void;
  onStop?: (conversationId: number) => void;
  isSelected?: boolean;
  index?: number; // 序号
}

export function ConversationCard({ 
  conversation, 
  onSelect, 
  onDelete, 
  onStop,
  isSelected = false,
  index 
}: ConversationCardProps) {
  
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止卡片选择事件
    
    if (window.confirm(`确定要删除对话"${conversation.title}"吗？此操作不可撤销。`)) {
      if (onDelete) {
        onDelete(conversation.id);
      }
    }
  };

  const handleStop = async (e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止卡片选择事件
    
    if (window.confirm(`确定要停止对话"${conversation.title}"吗？`)) {
      if (onStop) {
        onStop(conversation.id);
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
    <Tooltip.Provider delayDuration={300} skipDelayDuration={500}>
      <div 
        className={`conversation-card ${isSelected ? 'conversation-card-selected' : ''}`}
        onClick={() => onSelect(conversation)}
      >
        <div className="conversation-card-header">
          <div className="conversation-card-title">
            {index !== undefined && (
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <span className="conversation-index">{index}</span>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content className="radix-tooltip-content">
                    对话序号: {index}
                    <Tooltip.Arrow className="radix-tooltip-arrow" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            )}
            <MessageCircle size={16} />
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <span className="conversation-title-text">
                  {conversation.title}
                </span>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content className="radix-tooltip-content">
                  完整标题: {conversation.title}
                  <Tooltip.Arrow className="radix-tooltip-arrow" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </div>
        <div className="conversation-card-actions">
          {conversation.status === 'active' && onStop && (
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button
                  className="conversation-stop-btn"
                  onClick={handleStop}
                  title="停止对话"
                >
                  <Square size={14} />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content className="radix-tooltip-content">
                  结束此会话，并标记为已完成
                  <Tooltip.Arrow className="radix-tooltip-arrow" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          )}
          {onDelete && (
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button
                  className="conversation-delete-btn"
                  onClick={handleDelete}
                  title="删除对话"
                >
                  <Trash2 size={14} />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content className="radix-tooltip-content">
                  删除此对话（不可恢复）
                  <Tooltip.Arrow className="radix-tooltip-arrow" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          )}
        </div>
      </div>

      <div className="conversation-card-content">
        <div className="conversation-model-info">
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <span className="conversation-model">
                大模型：{conversation.model_provider} · {conversation.model_name}
              </span>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content className="radix-tooltip-content">
                模型标题: {conversation.model_title}<br/>
                模型提供商: {conversation.model_provider}<br/>
                模型名称: {conversation.model_name}<br/>
                模型类型: {conversation.model_type}<br/>
                {conversation.model_version && `模型版本: ${conversation.model_version}`}
                <Tooltip.Arrow className="radix-tooltip-arrow" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <span 
                className="conversation-status"
                style={{ color: getStatusColor(conversation.status) }}
              >
                {getStatusText(conversation.status)}
              </span>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content className="radix-tooltip-content">
                对话状态: {getStatusText(conversation.status)}
                <Tooltip.Arrow className="radix-tooltip-arrow" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </div>
        
      </div>

      <div className="conversation-card-footer">
        <div className="conversation-stats">
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <div className="conversation-stat">
                <Hash size={12} />
                <span>共 {conversation.message_count} 条对话</span>
              </div>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content className="radix-tooltip-content">
                总消息数: {conversation.message_count} 条（用户和AI各 {conversation.message_count/2} 条）
                <Tooltip.Arrow className="radix-tooltip-arrow" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <div className="conversation-stat">
                <span>Token: {conversation.token_used}</span>
              </div>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content className="radix-tooltip-content">
                消耗Token数量: {conversation.token_used}
                <Tooltip.Arrow className="radix-tooltip-arrow" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </div>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <div className="conversation-time">
              <Clock size={12} />
              <span>{conversationHistoryService.formatTime(conversation.created_at)}</span>
            </div>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content className="radix-tooltip-content">
              创建时间: {conversationHistoryService.formatTime(conversation.created_at)}
              <Tooltip.Arrow className="radix-tooltip-arrow" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </div>
    </div>
    </Tooltip.Provider>
  );
}