import * as Tooltip from '@radix-ui/react-tooltip';
import { History, X, Search } from 'lucide-react';

interface WindowHeaderProps {
  onClose: () => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
}

export function WindowHeader({ onClose, searchValue, onSearchChange }: WindowHeaderProps) {
  return (
    <div className="ai-window-header">
      <div className="ai-header-left">
        <History size={16} />
        <div className="ai-title">历史记录</div>
      </div>

      {/* 搜索框 */}
      <div className="ai-header-center">
        <div className="ai-search-container">
          <Search size={16} className="ai-search-icon" />
          <input
            type="text"
            className="ai-search-input"
            placeholder="搜索对话..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
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


