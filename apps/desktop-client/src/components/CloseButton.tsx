import * as Tooltip from '@radix-ui/react-tooltip';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useState } from 'react';
import { logger } from '../utils/rendererLogger.js';

interface CloseButtonProps {
  showCloseButton: boolean;
}

export function CloseButton({ showCloseButton }: CloseButtonProps) {
  const [isCloseButtonHovered, setIsCloseButtonHovered] = useState(false);

  // 关闭按钮功能
  const minimizeWindow = async () => {
    try {
      // 使用 Electron API 隐藏浮动窗口
      if ((window as any).electronAPI) {
        await (window as any).electronAPI.hideFloatingWindows();
      }
    } catch (error) {
      await logger.error(`隐藏窗口失败: ${error}`);
    }
  };

  const handleCloseButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    minimizeWindow();
  };

  // 关闭按钮区域鼠标进入
  const handleCloseButtonMouseEnter = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsCloseButtonHovered(true);
  };

  // 关闭按钮区域鼠标离开
  const handleCloseButtonMouseLeave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsCloseButtonHovered(false);
    
  };

  return (
    <div 
      className="floating-close-button-area"
      onMouseEnter={handleCloseButtonMouseEnter}
      onMouseLeave={handleCloseButtonMouseLeave}
    >
      <Tooltip.Root delayDuration={0}>
        <Tooltip.Trigger asChild>
          <button 
            onClick={handleCloseButtonClick}
            className={`close-floating-btn-separate ${(showCloseButton || isCloseButtonHovered) ? 'hover' : ''}`}
            style={{ 
              opacity: (showCloseButton || isCloseButtonHovered) ? (isCloseButtonHovered ? 0.9 : 1.0) : 0, // 悬浮时也显示按钮
              visibility: 'visible', // 始终可见以接收鼠标事件
              pointerEvents: 'auto', // 始终可接收鼠标事件
              transition: 'opacity 0.2s ease, transform 0.2s ease',
            }}
          >
            <motion.div
              whileHover={{ scale: 1.2 }}
              transition={{ duration: 0.2 }}
              style={{
                color: isCloseButtonHovered ? '#ef4444' : '#9ca3af', // 悬浮时变红色，默认亮灰色
                transition: 'color 0.2s ease'
              }}
            >
              <X size={16} />
            </motion.div>
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="radix-tooltip-content"
            side="right"
            sideOffset={5}
            avoidCollisions={false}
            style={{ 
              opacity: (showCloseButton || isCloseButtonHovered) ? 1 : 0,
              visibility: (showCloseButton || isCloseButtonHovered) ? 'visible' : 'hidden',
              transition: 'opacity 0.2s ease, visibility 0.2s ease'
            }}
          >
            隐藏 CueMate，按 <span className="shortcut-key"> ⌘</span> + <span className="shortcut-key"> \ </span>  重新显示
            <Tooltip.Arrow className="radix-tooltip-arrow" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </div>
  );
}
