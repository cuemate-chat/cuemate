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


  const handleListenClick = () => {
    // TODO: 实现 Listen 功能
    console.log('Listen clicked');
  };

  const handleAskQuestionClick = () => {
    // TODO: 实现 Ask question 功能
    console.log('Ask question clicked');
  };

  const handleVisibilityToggle = () => {
    setIsVisible(!isVisible);
    // TODO: 实现可见性切换功能
    console.log('Visibility toggled:', !isVisible);
  };

  return (
    <div className="logged-in-control-bar">
      {/* 左侧分隔线 */}
      <div className="control-bar-divider"></div>
      
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
              whileHover={{ scale: 1.2 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Volume2 size={16} />
              <span>语音</span>
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
              whileHover={{ scale: 1.2 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Type size={16} />
              <span>AI</span>
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
              {isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
            </motion.div>
          </motion.button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className="radix-tooltip-content">
            {isVisible ? '当前可见，点击隐藏' : '当前隐藏，点击显示'}
            <Tooltip.Arrow className="radix-tooltip-arrow" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
      
      {/* 右侧分隔线 */}
      <div className="control-bar-divider"></div>
    </div>
  );
}
