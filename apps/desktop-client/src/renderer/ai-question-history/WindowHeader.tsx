import * as Tooltip from '@radix-ui/react-tooltip';
import { History, X } from 'lucide-react';

interface WindowHeaderProps {
  onClose: () => void;
}

export function WindowHeader({ onClose }: WindowHeaderProps) {
  return (
    <div className="ai-window-header">
      <div className="ai-header-left">
        <History size={16} />
        <div className="ai-title">历史记录</div>
      </div>
      <Tooltip.Provider delayDuration={150} skipDelayDuration={300}>
        <div className="ai-header-right">
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


