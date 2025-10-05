import * as Tooltip from '@radix-ui/react-tooltip';
import { CornerDownLeft } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface WindowFooterProps {
  speechText?: string; // 语音识别的文本
  isLoading: boolean;
  isListening: boolean; // 是否正在监听用户说话
  onResponseComplete: () => void; // 回答完毕回调
  className?: string;
}

// 闪烁圆圈组件，类似面试官头像但无小人图标
function FlashingCircle({ isActive }: { isActive: boolean }) {
  return (
    <div className={`voice-circle ${isActive ? 'active' : ''}`}>
      <div className="circle-inner" />
      <div className="circle-wave" />
      <div className="circle-wave-2" />
    </div>
  );
}

export function MockInterviewFooter({
  speechText = '',
  isLoading,
  isListening,
  onResponseComplete,
  className
}: WindowFooterProps) {
  const [isAutoMode, setIsAutoMode] = useState(true);
  const speechRef = useRef<HTMLSpanElement>(null);

  // 自动滚动到最新内容
  useEffect(() => {
    if (speechRef.current) {
      speechRef.current.scrollLeft = speechRef.current.scrollWidth;
    }
  }, [speechText]);

  return (
    <div className={`ai-window-footer${className ? ` ${className}` : ''}`}>
      {/* 语音识别内容显示区域 */}
      <div className="speech-display-container">
        <FlashingCircle isActive={isListening} />
        <span
          ref={speechRef}
          className="speech-text"
        >
          {speechText || '等待语音输入...'}
        </span>
      </div>

      {/* 右侧控制按钮 */}
      <div className="control-actions">
        {/* 自动/手动切换开关 */}
        <Tooltip.Provider delayDuration={150} skipDelayDuration={300}>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                className={`mode-toggle ${isAutoMode ? 'auto' : 'manual'}`}
                onClick={() => setIsAutoMode(!isAutoMode)}
              >
                <span className="toggle-text">{isAutoMode ? '自动' : '手动'}</span>
                <div className="toggle-switch">
                  <div className="toggle-handle" />
                </div>
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content className="radix-tooltip-content" side="top" sideOffset={6}>
              {isAutoMode ? '切换到手动模式' : '切换到自动模式'}
              <Tooltip.Arrow className="radix-tooltip-arrow" />
            </Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>

        {/* 回答完毕按钮 */}
        <Tooltip.Provider delayDuration={150} skipDelayDuration={300}>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                onClick={onResponseComplete}
                disabled={isAutoMode || isLoading}
                className="response-complete-btn"
              >
                <span className="response-text">回答完毕</span>
                <CornerDownLeft size={16} />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content className="radix-tooltip-content" side="top" sideOffset={6}>
              {isAutoMode ? '自动模式下不可用' : '标记当前回答完毕'}
              <Tooltip.Arrow className="radix-tooltip-arrow" />
            </Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
      </div>
    </div>
  );
}