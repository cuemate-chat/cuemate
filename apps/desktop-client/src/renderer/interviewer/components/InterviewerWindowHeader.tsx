import * as Tooltip from '@radix-ui/react-tooltip';
import { AudioLines, ChevronDown, Mic } from 'lucide-react';

interface InterviewerWindowHeaderProps {
  selectedModel?: string;
  onModelChange?: (model: string) => void;
  onTranscriptToggle?: () => void;
}

export function InterviewerWindowHeader({ 
  selectedModel = "Default",
  onModelChange,
  onTranscriptToggle
}: InterviewerWindowHeaderProps) {
  return (
    <div className="interviewer-window-header">
      <div className="interviewer-header-left">
        <div className="interviewer-title">
          <Mic size={16} className="interviewer-title-icon" />
          <span>语音识别</span>
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
