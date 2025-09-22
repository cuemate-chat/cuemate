import * as Tooltip from '@radix-ui/react-tooltip';
import { Mic, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { LottieAudioLines } from '../../shared/components/LottieAudioLines';
import { useVoiceState } from '../../../utils/voiceState';

interface InterviewerWindowHeaderProps {
  isRecognizing?: boolean; // 新增状态字段
  currentSectionTitle?: string | null; // 例如 "语音测试"/"语音提问"
  onClose?: () => void; // 关闭语音识别窗口
  onBack?: () => void; // 返回上一页
}

export function InterviewerWindowHeader({ 
  isRecognizing = false,
  currentSectionTitle = null,
  onClose,
  onBack
}: InterviewerWindowHeaderProps) {
  const globalState = useVoiceState();
  // 计时器状态
  const [duration, setDuration] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  // 计时器逻辑
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRecognizing) {
      if (!hasStarted) {
        setHasStarted(true);
        setDuration(0); // 重新开始时重置时间为0
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

  const showBack = !!currentSectionTitle && typeof onBack === 'function';

  return (
    <div className="interviewer-window-header" key={currentSectionTitle || 'home'}>
      <div className="interviewer-header-left">
        <div className="interviewer-title">
          {(globalState.mode !== 'none' && globalState.subState === 'recording') ? (
            <LottieAudioLines 
              size={16} 
              alt="Recording"
            />
          ) : (
            <Mic size={16} className="interviewer-title-icon" />
          )}
          <span>语音识别{currentSectionTitle ? ` - ${currentSectionTitle}` : ''}</span>
          {hasStarted && (
            <div className="interviewer-timer">
              <span className="timer-display">{formatDuration(duration)}</span>
            </div>
          )}
        </div>
      </div>
      
      <Tooltip.Provider delayDuration={150} skipDelayDuration={300}>
        <div className="interviewer-header-right" style={{ gap: 8 }}>
          {showBack && (
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button 
                  className="interviewer-header-btn"
                  onClick={() => onBack?.()}
                >
                  返回上一页
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content className="radix-tooltip-content">
                  返回卡片列表
                  <Tooltip.Arrow className="radix-tooltip-arrow" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          )}
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button 
                className="interviewer-header-btn"
                onClick={async () => {
                  try {
                    if (onClose) {
                      onClose();
                    } else {
                      await (window as any).electronAPI?.hideInterviewer?.();
                    }
                  } catch {}
                }}
              >
                <X size={14} />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content className="radix-tooltip-content">
                关闭窗口
                <Tooltip.Arrow className="radix-tooltip-arrow" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </div>
      </Tooltip.Provider>
    </div>
  );
}
