import * as Separator from '@radix-ui/react-separator';
import * as Tooltip from '@radix-ui/react-tooltip';
import { motion } from 'framer-motion';
import { CornerDownLeft, Eye, EyeOff, Type, Volume2 } from 'lucide-react';
import { useState } from 'react';

interface LoggedInControlBarProps {
  // 暂时不添加任何 props
}

export function LoggedInControlBar({}: LoggedInControlBarProps) {
  const [isListenHovered, setIsListenHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const handleListenClick = async () => {
    try {
      if ((window as any).electronAPI) {
        await (window as any).electronAPI.toggleInterviewer();
      }
    } catch (error) {
      console.error('打开Interviewer窗口失败:', error);
    }
  };

  const handleAskQuestionClick = async () => {
    try {
      if ((window as any).electronAPI) {
        await (window as any).electronAPI.toggleAIQuestion();
      }
    } catch (error) {
      console.error('打开AI问题窗口失败:', error);
    }
  };

  const handleVisibilityToggle = () => {
    setIsVisible(!isVisible);
    // TODO: 实现可见性切换功能
    console.log('Visibility toggled:', !isVisible);
  };

  return (
    <div className="logged-in-control-bar">
      {/* 左侧分隔线 */}
      <Separator.Root 
        orientation="vertical" 
        className="vertical-separator"
        decorative 
      />
      
      {/* Listen 按钮 */}
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <motion.button
            className={`listen-btn ${isListenHovered ? 'hovered' : ''}`}
            onClick={handleListenClick}
            onMouseEnter={() => setIsListenHovered(true)}
            onMouseLeave={() => setIsListenHovered(false)}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Volume2 size={16} />
              <span>语音识别</span>
            </motion.div>
          </motion.button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className="radix-tooltip-content">
            开始语音监听
            <Tooltip.Arrow className="radix-tooltip-arrow" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>

      {/* Ask question 按钮 */}
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <motion.button
            className="ask-question-btn"
            onClick={handleAskQuestionClick}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Type size={16} className="text-gray-500" />
              <span>提问 AI</span>
            </motion.div>
          </motion.button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className="radix-tooltip-content">
            您可以询问任何问题给到 AI，快捷键： <span className="shortcut-key">⌘</span> + <span className="shortcut-key-icon"><CornerDownLeft size={12} /></span>
            <Tooltip.Arrow className="radix-tooltip-arrow" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>

      {/* 可见性切换按钮 */}
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <motion.button
            className="visibility-btn"
            onClick={handleVisibilityToggle}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              whileHover={{ scale: 1.2 }}
              transition={{ duration: 0.2 }}
            >
              {isVisible ? <Eye size={18} /> : <EyeOff size={18} />}
            </motion.div>
          </motion.button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className="radix-tooltip-content">
            {isVisible ? '当前可见，点击隐藏程序坞 Dock 图标，以及截图、共享屏幕不可见' : '当前隐藏，点击显示程序坞 Dock 图标，以及截图、共享屏幕可见'}
            <Tooltip.Arrow className="radix-tooltip-arrow" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
      
      {/* 右侧分隔线 */}
      <Separator.Root 
        orientation="vertical" 
        className="vertical-separator"
        decorative 
      />
    </div>
  );
}
