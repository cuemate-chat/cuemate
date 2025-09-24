import * as Tooltip from '@radix-ui/react-tooltip';
import { Copy, CornerDownLeft, Eraser, Mic, Square } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { MicrophoneRecognitionController, startMicrophoneRecognition } from '../../../../utils/audioRecognition';
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

export function VoiceQAFooter({
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
  const isRecording = voiceState.mode === 'voice-qa' && voiceState.subState === 'voice-speaking';
  const recognitionControllerRef = useRef<MicrophoneRecognitionController | null>(null);

  // 累积模式：保存已确认的文本（固定不变）
  const confirmedTextRef = useRef<string>('');
  // 当前正在识别的临时文本（实时更新）
  const [currentTempText, setCurrentTempText] = useState<string>('');
  
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

  const handleVoiceToggle = async () => {
    if (isConversationCompleted) return;
    if (!isRecording) {
      try {
        // 开始录制时，保存当前input中的文本作为已确认文本
        confirmedTextRef.current = question || '';
        setCurrentTempText('');

        const storedDeviceId = localStorage.getItem('cuemate.selectedMicDeviceId') || undefined;
        const controller = await startMicrophoneRecognition({
          deviceId: storedDeviceId,
          onText: (text, isFinal) => {
            const newText = text || '';
            if (!newText.trim()) return;

            if (isFinal) {
              // 最终识别结果：添加到已确认文本中，清空临时文本
              const needSpace = confirmedTextRef.current.length > 0 &&
                                !/\s$/.test(confirmedTextRef.current) &&
                                !/^\s/.test(newText);
              confirmedTextRef.current += needSpace ? ' ' + newText : newText;
              setCurrentTempText(''); // 清空临时文本，等待下一句话
            } else {
              // 临时识别结果：只更新当前临时文本，不影响已确认文本
              setCurrentTempText(newText);
            }
          },
          onError: () => {
            setVoiceState({ mode: 'voice-qa', subState: 'idle' });
          }
        });
        recognitionControllerRef.current = controller;
        setVoiceState({ mode: 'voice-qa', subState: 'voice-speaking' });
      } catch {
        setVoiceState({ mode: 'voice-qa', subState: 'idle' });
      }
    } else {
      try {
        await recognitionControllerRef.current?.stop();
      } finally {
        recognitionControllerRef.current = null;

        // 停止录制时，将完整的文本（已确认 + 当前临时）赋值给input
        const finalText = (() => {
          const confirmedText = confirmedTextRef.current;
          const tempText = currentTempText;

          if (!confirmedText && !tempText) return '';
          if (!tempText) return confirmedText;
          if (!confirmedText) return tempText;

          const needSpace = !/\s$/.test(confirmedText) && !/^\s/.test(tempText);
          return confirmedText + (needSpace ? ' ' + tempText : tempText);
        })();

        onQuestionChange(finalText);
        setCurrentTempText('');
        setVoiceState({ mode: 'voice-qa', subState: 'voice-end' });
      }
    }
  };

  return (
    <div className={`ai-window-footer${className ? ` ${className}` : ''}`}>
      <div className="ai-input-container">
        {isRecording ? (
          // 录制时显示span元素进行流式输出
          <span
            className="ai-input-field"
            style={{
              display: 'block',
              minHeight: 'auto',
              height: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              backgroundColor: 'transparent',
              cursor: 'text'
            }}
          >
            {(() => {
              const confirmedText = confirmedTextRef.current;
              const tempText = currentTempText;

              if (!confirmedText && !tempText) {
                return '正在识别语音...';
              }

              // 组合已确认文本 + 当前临时文本
              const needSpace = confirmedText.length > 0 &&
                                tempText.length > 0 &&
                                !/\s$/.test(confirmedText) &&
                                !/^\s/.test(tempText);

              return confirmedText + (needSpace ? ' ' + tempText : tempText);
            })()}
          </span>
        ) : (
          // 非录制时显示正常的input输入框
          <input
            type="search"
            value={question}
            onChange={(e) => onQuestionChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isConversationCompleted ? "对话已完成，请新建提问" : "询问 AI 任意问题"}
            className="ai-input-field"
            disabled={isConversationCompleted}
          />
        )}
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


