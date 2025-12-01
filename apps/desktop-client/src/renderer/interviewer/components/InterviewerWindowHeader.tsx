import * as Tooltip from '@radix-ui/react-tooltip';
import { MessageSquare, Mic, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { logger } from '../../../utils/rendererLogger.js';
import { getTimerState, setTimerState, resetTimerState } from '../../../utils/timerState';
import { useVoiceState } from '../../../utils/voiceState';
import { LottieAudioLines } from '../../shared/components/LottieAudioLines';

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

  // 计时器逻辑 - 只在 mock-interview 和 interview-training 模式下工作
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const isInterviewMode = globalState.mode === 'mock-interview' || globalState.mode === 'interview-training';
    const shouldShowTimer = isInterviewMode && (
      globalState.subState === 'mock-interview-recording' ||
      globalState.subState === 'mock-interview-paused' ||
      globalState.subState === 'mock-interview-playing' ||
      globalState.subState === 'mock-interview-completed' ||
      globalState.subState === 'interview-training-recording' ||
      globalState.subState === 'interview-training-paused' ||
      globalState.subState === 'interview-training-playing' ||
      globalState.subState === 'interview-training-completed'
    );
    const shouldRunTimer = isInterviewMode && (
      globalState.subState === 'mock-interview-recording' ||
      globalState.subState === 'mock-interview-playing' ||
      globalState.subState === 'interview-training-recording' ||
      globalState.subState === 'interview-training-playing'
    );

    if (shouldShowTimer) {
      // 只在 recording/playing 状态下初始化计时器,completed/paused 状态保持现有值
      if (!hasStarted && shouldRunTimer) {
        setHasStarted(true);
        // 恢复面试时使用 timerState.duration 作为起始时间，否则从 0 开始
        const initialDuration = getTimerState().duration || 0;
        setDuration(initialDuration);
        setTimerState({ isRunning: true, duration: initialDuration });
      }

      if (shouldRunTimer) {
        interval = setInterval(() => {
          setDuration(prev => {
            const newDuration = prev + 1;
            setTimerState({ duration: newDuration });
            return newDuration;
          });
        }, 1000);
      }
    } else if (globalState.subState === 'idle' || !isInterviewMode) {
      // idle 状态或非面试模式时重置计时器
      setHasStarted(false);
      setDuration(0);
      resetTimerState();
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
            // 仅依据 subState：所有以 ing 结尾的状态显示 Lottie
            const shouldShowLottie = typeof globalState.subState === 'string' && globalState.subState.endsWith('ing');

            return shouldShowLottie ? (
              <LottieAudioLines
                size={16}
                alt="Recording"
              />
            ) : (
              <Mic size={16} className="interviewer-title-icon" />
            );
          })()}
          <span>{currentSectionTitle || '语音识别'}</span>
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
                  disabled={globalState.mode === 'mock-interview' &&
                           (globalState.subState === 'mock-interview-recording' ||
                            globalState.subState === 'mock-interview-paused' ||
                            globalState.subState === 'mock-interview-playing')}
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
                    await (window as any).electronAPI?.showAIQuestion?.();
                  } catch (error) {
                    logger.error(`打开答案窗口失败: ${error}`);
                  }
                }}
              >
                <MessageSquare size={14} />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content className="radix-tooltip-content">
                打开 AI 答案窗口
                <Tooltip.Arrow className="radix-tooltip-arrow" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
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
