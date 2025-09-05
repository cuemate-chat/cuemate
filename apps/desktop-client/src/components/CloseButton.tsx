import * as Tooltip from '@radix-ui/react-tooltip';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useRef, useState } from 'react';
import { logger } from '../utils/rendererLogger.js';

interface CloseButtonProps {
  showCloseButton: boolean;
}

export function CloseButton({ showCloseButton }: CloseButtonProps) {
  const [isCloseButtonHovered, setIsCloseButtonHovered] = useState(false);
  const closeButtonTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
  const handleCloseButtonMouseEnter = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 清除隐藏定时器，保持显示
    if (closeButtonTimeoutRef.current) {
      clearTimeout(closeButtonTimeoutRef.current);
      closeButtonTimeoutRef.current = null;
    }
    
    setIsCloseButtonHovered(true);
  };

  // 关闭按钮区域鼠标离开
  const handleCloseButtonMouseLeave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsCloseButtonHovered(false);
    
    // 延迟隐藏已由 FloatingControlBar 组件统一管理
    // 这里不需要单独处理隐藏逻辑
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
              opacity: showCloseButton ? (isCloseButtonHovered ? 0.9 : 1.0) : 0, // 鼠标直接悬浮时降低0.1透明度
              visibility: 'visible', // 始终可见以接收鼠标事件
              pointerEvents: 'auto', // 始终可接收鼠标事件
              transition: 'opacity 0.2s ease, transform 0.2s ease',
            }}
          >
            <motion.div
              whileHover={{ scale: 1.2 }}
              transition={{ duration: 0.2 }}
              style={{
                color: isCloseButtonHovered ? '#ef4444' : '#6b7280', // 悬浮时变红色，默认灰色
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
