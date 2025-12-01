import * as Tooltip from '@radix-ui/react-tooltip';
import { motion } from 'framer-motion';
import { History, X } from 'lucide-react';
import { useState } from 'react';
import CueMateLogo from '../../../../assets/CueMate.png';
import { useTimerState } from '../../../../utils/timerState';
import { useVoiceState } from '../../../../utils/voiceState';

// 头部内的加载动画
const LoadingDots = () => {
  return (
    <div className="loading-dots">
      <motion.span
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
        className="dot"
      />
      <motion.span
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
        className="dot"
      />
      <motion.span
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
        className="dot"
      />
    </div>
  );
};

interface WindowHeaderProps {
  isLoading: boolean;
  onClose: () => void;
  onOpenHistory?: () => void;
  heightPercentage: number;
  onHeightChange: (percentage: number) => void;
  interviewState?: string; // 面试状态机状态
}

export function MockInterviewHeader({ isLoading, onClose, onOpenHistory, heightPercentage, onHeightChange, interviewState }: WindowHeaderProps) {
  const [showControls, setShowControls] = useState(false);
  const globalState = useVoiceState();
  const timerState = useTimerState();

  // 从 timerState 获取计时器数据 - 只用于显示，不做计时逻辑
  const timerDuration = timerState.duration || 0;
  const timerStarted = timerState.isRunning || false;

  // 格式化时间显示 (时:分:秒) - 复制自 InterviewerWindowHeader
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 格式化状态显示（去掉下划线，转大写）
  const formatState = (state: string) => {
    return state.replace(/_/g, ' ').toUpperCase();
  };

  return (
    <div 
      className="ai-window-header"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <div className="ai-header-left">
        <img src={CueMateLogo} alt="CueMate" className="ai-logo" />
        <div className="ai-title">
          模拟面试 - {interviewState ? formatState(interviewState) : (isLoading ? 'LOADING' : 'IDLE')}
        </div>
        {isLoading && <LoadingDots />}
        {(timerStarted && globalState.subState !== 'idle' && (globalState.mode === 'mock-interview' || globalState.mode === 'interview-training')) && (
          <div className="interviewer-timer">
            <span className="timer-display">{formatDuration(timerDuration)}</span>
          </div>
        )}
      </div>
      <Tooltip.Provider delayDuration={150} skipDelayDuration={300}>
        <div className={`ai-header-right ${showControls ? 'show' : 'hide'}`}>
          {/* 高度选择下拉框 */}
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <select 
                className="ai-height-selector"
                value={heightPercentage}
                onChange={(e) => onHeightChange(Number(e.target.value))}
              >
                <option value={50}>50%</option>
                <option value={75}>75%</option>
                <option value={100}>100%</option>
              </select>
            </Tooltip.Trigger>
            <Tooltip.Content className="radix-tooltip-content" side="top" sideOffset={6}>
              选择窗口显示的高度
              <Tooltip.Arrow className="radix-tooltip-arrow" />
            </Tooltip.Content>
          </Tooltip.Root>
          
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                className="ai-header-btn"
                onClick={async () => {
                  try {
                    // 先切换到模拟面试模式
                    await (window as any).electronAPI?.switchToMode?.('mock-interview');
                    // 再打开历史窗口
                    await (window as any).electronAPI?.showAIQuestionHistory?.();
                  } catch {}
                  onOpenHistory && onOpenHistory();
                }}
              >
                <History size={16} />
                <span className="ai-header-btn-text">面试记录</span>
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content className="radix-tooltip-content" side="top" sideOffset={6}>
              点击切换面试记录窗口
              <Tooltip.Arrow className="radix-tooltip-arrow" />
            </Tooltip.Content>
          </Tooltip.Root>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button 
                className="ai-header-btn"
                onClick={onClose}
              >
                <X size={16} />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content className="radix-tooltip-content" side="top" sideOffset={6}>
              关闭当前窗口
              <Tooltip.Arrow className="radix-tooltip-arrow" />
            </Tooltip.Content>
          </Tooltip.Root>
        </div>
      </Tooltip.Provider>
    </div>
  );
}


