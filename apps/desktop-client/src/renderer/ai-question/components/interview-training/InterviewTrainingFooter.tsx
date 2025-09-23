import * as Tooltip from '@radix-ui/react-tooltip';
import { Copy, CornerDownLeft, Eraser, Mic, Square } from 'lucide-react';
import React from 'react';
import { setVoiceState, useVoiceState } from '../../../../utils/voiceState';

interface WindowFooterProps {
  question: string;
  isLoading: boolean;
  onQuestionChange: (value: string) => void;
  onSubmit: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onNewChat: () => void;
  onCopyLastAIResponse: () => void;
  currentConversationStatus?: 'active' | 'completed' | 'error' | null;
  className?: string;
}

export function InterviewTrainingFooter({ 
  question, 
  isLoading,
  onQuestionChange, 
  onSubmit, 
  onKeyDown,
  onNewChat,
  onCopyLastAIResponse,
  currentConversationStatus,
  className 
}: WindowFooterProps) {
  const isConversationCompleted = currentConversationStatus === 'completed';
  const voiceState = useVoiceState();
  const isRecording = voiceState.mode === 'interview-training' && voiceState.subState === 'recording';
  
  const handleSubmit = () => {
    if (isConversationCompleted) {
      alert('当前对话已完成，无法继续提问。请点击"新建提问"开始新的对话。');
      return;
    }
    onSubmit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && isConversationCompleted) {
      e.preventDefault();
      alert('当前对话已完成，无法继续提问。请点击"新建提问"开始新的对话。');
      return;
    }
    onKeyDown(e);
  };

  const handleVoiceToggle = () => {
    if (isConversationCompleted) return;

    if (isRecording) {
      setVoiceState({ mode: 'interview-training', subState: 'paused' });
    } else {
      setVoiceState({ mode: 'interview-training', subState: 'recording' });
    }
  };

  return (
    <div className={`ai-window-footer${className ? ` ${className}` : ''}`}>
      <div className="ai-input-container">
        <input
          type="search"
          value={question}
          onChange={(e) => onQuestionChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isConversationCompleted ? "对话已完成，请新建提问" : "询问 AI 任意问题"}
          className="ai-input-field"
          disabled={isConversationCompleted}
        />
      </div>
      
      {/* 语音录制按钮 */}
      <div className="ai-voice-container">
        <Tooltip.Provider delayDuration={150} skipDelayDuration={300}>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                className={`ai-voice-btn ${isRecording ? 'recording' : ''}`}
                onClick={handleVoiceToggle}
                disabled={isConversationCompleted}
              >
                {isRecording ? (
                  <>
                    <Square size={16} />
                    <span>停止说话</span>
                  </>
                ) : (
                  <>
                    <Mic size={16} />
                    <span>按住说话</span>
                  </>
                )}
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content className="radix-tooltip-content" side="top" sideOffset={6}>
              {isRecording ? "点击停止语音录制" : "点击开始语音录制"}
              <Tooltip.Arrow className="radix-tooltip-arrow" />
            </Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
      </div>
      
      <div className="ai-input-actions">
        <Tooltip.Provider delayDuration={150} skipDelayDuration={300}>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <div className="ai-action">
                <button 
                  className="ai-clear-btn"
                  onClick={onNewChat}
                  title="清空当前聊天框所有内容"
                >
                  <Eraser size={16} />
                </button>
              </div>
            </Tooltip.Trigger>
            <Tooltip.Content className="radix-tooltip-content" side="top" sideOffset={6}>
              清空当前聊天框所有内容
              <Tooltip.Arrow className="radix-tooltip-arrow" />
            </Tooltip.Content>
          </Tooltip.Root>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <div className="ai-action">
                <button 
                  className="ai-copy-btn" 
                  onClick={onCopyLastAIResponse}
                  title="复制最近一次AI回答"
                >
                  <Copy size={16} />
                </button>
              </div>
            </Tooltip.Trigger>
            <Tooltip.Content className="radix-tooltip-content" side="top" sideOffset={6}>
              复制最近一次AI回答内容
              <Tooltip.Arrow className="radix-tooltip-arrow" />
            </Tooltip.Content>
          </Tooltip.Root>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <div className="ai-action">
                <button
                  onClick={handleSubmit}
                  disabled={!question.trim() || isLoading || isConversationCompleted}
                  className="ai-submit-btn"
                  title={isConversationCompleted ? "对话已完成" : "提交（Enter）"}
                >
                  <span className="ai-submit-text">提交</span>
                  <CornerDownLeft size={16} />
                </button>
              </div>
            </Tooltip.Trigger>
            <Tooltip.Content className="radix-tooltip-content" side="top" sideOffset={6}>
              {isConversationCompleted ? "对话已完成，无法继续提问" : "提交当前问题给到 AI"}
              <Tooltip.Arrow className="radix-tooltip-arrow" />
            </Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
      </div>
    </div>
  );
}


