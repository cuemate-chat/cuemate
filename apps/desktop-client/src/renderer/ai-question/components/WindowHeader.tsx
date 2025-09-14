import * as Tooltip from '@radix-ui/react-tooltip';
import { motion } from 'framer-motion';
import { History, X } from 'lucide-react';
import CueMateLogo from '../../../assets/CueMate.png';

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
}

export function WindowHeader({ isLoading, onClose, onOpenHistory }: WindowHeaderProps) {
  return (
    <div className="ai-window-header">
      <div className="ai-header-left">
        <img src={CueMateLogo} alt="CueMate" className="ai-logo" />
        <div className="ai-title">{isLoading ? 'Think' : 'AI Response'}</div>
        {isLoading && <LoadingDots />}
      </div>
      <Tooltip.Provider delayDuration={150} skipDelayDuration={300}>
        <div className="ai-header-right">
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button 
                className="ai-header-btn"
                onClick={() => {
                  try {
                    (window as any).electronAPI?.showAIQuestionHistory?.();
                  } catch {}
                  onOpenHistory && onOpenHistory();
                }}
              >
                <History size={16} />
                <span className="ai-header-btn-text">历史记录</span>
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content className="radix-tooltip-content" side="top" sideOffset={6}>
              点击打开历史记录
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


