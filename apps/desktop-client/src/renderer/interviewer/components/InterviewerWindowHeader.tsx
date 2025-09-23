import * as Tooltip from '@radix-ui/react-tooltip';
import { Mic, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { LottieAudioLines } from '../../shared/components/LottieAudioLines';
import { useVoiceState } from '../../../utils/voiceState';

interface InterviewerWindowHeaderProps {
  currentSectionTitle?: string | null; // 例如 "语音测试"/"语音提问"
  onClose?: () => void; // 关闭语音识别窗口
  onBack?: () => void; // 返回上一页
}

export function InterviewerWindowHeader({
  currentSectionTitle = null,
  onClose,
  onBack
}: InterviewerWindowHeaderProps) {
  const globalState = useVoiceState();
  // 计时器状态
  const [duration, setDuration] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  // 计时器逻辑 - 只在mock-interview和interview-training模式下工作
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const isInterviewMode = globalState.mode === 'mock-interview' || globalState.mode === 'interview-training';
    const shouldShowTimer = isInterviewMode && (globalState.subState === 'recording' || globalState.subState === 'paused' || globalState.subState === 'playing' || globalState.subState === 'completed');
    const shouldRunTimer = isInterviewMode && (globalState.subState === 'recording' || globalState.subState === 'playing');

    if (shouldShowTimer) {
      if (!hasStarted) {
        setHasStarted(true);
        setDuration(0); // 重新开始时重置时间为0
      }

      if (shouldRunTimer) {
        interval = setInterval(() => {
          setDuration(prev => prev + 1);
        }, 1000);
      }
    } else if (globalState.subState === 'idle' || !isInterviewMode) {
      // idle状态或非面试模式时重置计时器
      setHasStarted(false);
      setDuration(0);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [globalState.mode, globalState.subState, hasStarted]);

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
          {(() => {
            // LottieAudioLines显示条件：voice-test模式 或 voice-qa+recording/voice-speaking 或 任何模式+recording/playing 或 voice-testing/voice-speaking状态
            const shouldShowLottie =
              globalState.mode === 'voice-test' ||
              (globalState.mode === 'voice-qa' && (globalState.subState === 'recording' || globalState.subState === 'voice-speaking')) ||
              (globalState.subState === 'recording' || globalState.subState === 'playing' || globalState.subState === 'voice-testing' || globalState.subState === 'voice-speaking');

            return shouldShowLottie ? (
              <LottieAudioLines
                size={16}
                alt="Recording"
              />
            ) : (
              <Mic size={16} className="interviewer-title-icon" />
            );
          })()}
          <span>语音识别{currentSectionTitle ? ` - ${currentSectionTitle}` : ''}</span>
          {(hasStarted && globalState.subState !== 'idle' && (globalState.mode === 'mock-interview' || globalState.mode === 'interview-training')) && (
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
