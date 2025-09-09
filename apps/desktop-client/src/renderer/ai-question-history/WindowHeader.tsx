import * as Tooltip from '@radix-ui/react-tooltip';
import { History, RefreshCw, Search, X } from 'lucide-react';

interface WindowHeaderProps {
  onClose: () => void;
  onRefresh?: () => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
}

export function WindowHeader({ onClose, onRefresh, searchValue, onSearchChange }: WindowHeaderProps) {
  return (
    <div className="ai-window-header">
      <div className="ai-header-left">
        <History size={16} />
        <div className="ai-title">历史记录</div>
      </div>

      {/* 搜索框 */}
      <div className="ai-header-center">
        <div className="ai-search-container">
          <Search size={14} className="ai-search-icon" />
          <input
            type="text"
            className="ai-search-input"
            placeholder="搜索历史记录..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchValue && (
            <button
              className="ai-search-clear"
              onClick={() => onSearchChange('')}
              type="button"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      <Tooltip.Provider delayDuration={150} skipDelayDuration={300}>
        <div className="ai-header-right">
          {onRefresh && (
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button 
                  className="ai-header-btn"
                  onClick={onRefresh}
                >
                  <RefreshCw size={12} />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content className="radix-tooltip-content">
                  刷新列表
                  <Tooltip.Arrow className="radix-tooltip-arrow" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          )}
          
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


