import * as Tooltip from '@radix-ui/react-tooltip';
import { Copy, CornerDownLeft, Eraser } from 'lucide-react';
import React from 'react';

interface WindowFooterProps {
  question: string;
  isLoading: boolean;
  onQuestionChange: (value: string) => void;
  onSubmit: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onClearMessages: () => void;
  className?: string;
}

export function WindowFooter({ 
  question, 
  isLoading,
  onQuestionChange, 
  onSubmit, 
  onKeyDown,
  onClearMessages,
  className 
}: WindowFooterProps) {
  return (
    <div className={`ai-window-footer${className ? ` ${className}` : ''}`}>
      <div className="ai-input-container">
        <input
          type="search"
          value={question}
          onChange={(e) => onQuestionChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="询问 AI 任意问题"
          className="ai-input-field"
        />
      </div>
      <div className="ai-input-actions">
        <Tooltip.Provider delayDuration={150} skipDelayDuration={300}>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <div className="ai-action">
                <button 
                  className="ai-clear-btn"
                  onClick={onClearMessages}
                  title="清除对话记录"
                >
                  <Eraser size={16} />
                </button>
              </div>
            </Tooltip.Trigger>
            <Tooltip.Content className="radix-tooltip-content" side="top" sideOffset={6}>
              清空当前聊天框内容
              <Tooltip.Arrow className="radix-tooltip-arrow" />
            </Tooltip.Content>
          </Tooltip.Root>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <div className="ai-action">
                <button className="ai-copy-btn" title="复制对话">
                  <Copy size={16} />
                </button>
              </div>
            </Tooltip.Trigger>
            <Tooltip.Content className="radix-tooltip-content" side="top" sideOffset={6}>
              复制当前 AI 回答内容
              <Tooltip.Arrow className="radix-tooltip-arrow" />
            </Tooltip.Content>
          </Tooltip.Root>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <div className="ai-action">
                <button
                  onClick={onSubmit}
                  disabled={!question.trim() || isLoading}
                  className="ai-submit-btn"
                  title="提交（Enter）"
                >
                  <span className="ai-submit-text">提交</span>
                  <CornerDownLeft size={16} />
                </button>
              </div>
            </Tooltip.Trigger>
            <Tooltip.Content className="radix-tooltip-content" side="top" sideOffset={6}>
              提交当前问题给到 AI
              <Tooltip.Arrow className="radix-tooltip-arrow" />
            </Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
      </div>
    </div>
  );
}


