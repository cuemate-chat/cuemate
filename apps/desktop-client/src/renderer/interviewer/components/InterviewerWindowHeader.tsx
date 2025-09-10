import * as Tooltip from '@radix-ui/react-tooltip';
import { Volume2, X } from 'lucide-react';

interface InterviewerWindowHeaderProps {
  onClose: () => void;
  onClearResults: () => void;
}

export function InterviewerWindowHeader({ onClose, onClearResults }: InterviewerWindowHeaderProps) {
  return (
    <div className="interviewer-window-header">
      <div className="interviewer-header-center">
        <div className="interviewer-title">
          <Volume2 size={16} className="interviewer-title-icon" />
          <span>语音识别</span>
        </div>
      </div>
      
      <Tooltip.Provider delayDuration={150} skipDelayDuration={300}>
        <div className="interviewer-header-right">
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button 
                className="interviewer-header-btn"
                onClick={onClearResults}
              >
                <span className="interviewer-header-btn-text">清空</span>
              </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content className="radix-tooltip-content">
                清空识别结果
                <Tooltip.Arrow className="radix-tooltip-arrow" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
          
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button 
                className="interviewer-header-btn"
                onClick={onClose}
              >
                <X size={16} />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content className="radix-tooltip-content" side="top" sideOffset={6}>
                关闭当前窗口
                <Tooltip.Arrow className="radix-tooltip-arrow" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </div>
      </Tooltip.Provider>
    </div>
  );
}
