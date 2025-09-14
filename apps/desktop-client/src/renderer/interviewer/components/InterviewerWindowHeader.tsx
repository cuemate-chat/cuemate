import * as Tooltip from '@radix-ui/react-tooltip';
import { AudioLines, ChevronDown, Mic } from 'lucide-react';
import { useEffect, useState } from 'react';
import { LottieAudioLines } from '../../shared/components/LottieAudioLines';

interface InterviewerWindowHeaderProps {
  selectedModel?: string;
  onModelChange?: (model: string) => void;
  onTranscriptToggle?: () => void;
  isRecognizing?: boolean; // 新增状态字段
}

export function InterviewerWindowHeader({ 
  selectedModel = "Default",
  onModelChange,
  onTranscriptToggle,
  isRecognizing = false
}: InterviewerWindowHeaderProps) {
  // 计时器状态
  const [duration, setDuration] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  // 计时器逻辑
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRecognizing) {
      if (!hasStarted) {
        setHasStarted(true);
      }
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRecognizing, hasStarted]);

  // 格式化时间显示 (时:分:秒)
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="interviewer-window-header">
      <div className="interviewer-header-left">
        <div className="interviewer-title">
          {isRecognizing ? (
            <LottieAudioLines 
              size={16} 
              alt="Recording"
            />
          ) : (
            <Mic size={16} className="interviewer-title-icon" />
          )}
          <span>语音识别</span>
          {hasStarted && (
            <div className="interviewer-timer">
              <span className="timer-display">{formatDuration(duration)}</span>
            </div>
          )}
        </div>
      </div>
      
      <Tooltip.Provider delayDuration={150} skipDelayDuration={300}>
        <div className="interviewer-header-right">
          <div className="interviewer-select-wrapper">
            <select 
              className="interviewer-select-trigger"
              value={selectedModel}
              onChange={(e) => onModelChange?.(e.target.value)}
            >
              <option value="Default">Default</option>
            </select>
            <ChevronDown size={14} className="interviewer-select-icon" />
          </div>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button 
                className="interviewer-transcript-btn"
                onClick={onTranscriptToggle}
              >
                <AudioLines size={14} />
                <span>转录</span>
              </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content className="radix-tooltip-content">
                查看转录内容
                <Tooltip.Arrow className="radix-tooltip-arrow" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </div>
      </Tooltip.Provider>
    </div>
  );
}
