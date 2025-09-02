import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export const CloseButtonApp: React.FC = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isVisible] = useState(true);

  // 处理按钮点击
  const handleClick = useCallback(async () => {
    try {
      setIsPressed(true);
      await (window as any).electronAPI?.onClick();
      (window as any).logger?.info('关闭按钮被点击');
      
      // 延迟重置按下状态
      setTimeout(() => {
        setIsPressed(false);
      }, 150);
    } catch (error) {
      (window as any).logger?.error('关闭按钮点击处理失败: ' + error);
      setIsPressed(false);
    }
  }, []);

  // 处理鼠标进入
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  // 处理鼠标离开
  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setIsPressed(false);
  }, []);

  // 处理鼠标按下
  const handleMouseDown = useCallback(() => {
    setIsPressed(true);
  }, []);

  // 处理鼠标抬起
  const handleMouseUp = useCallback(() => {
    setIsPressed(false);
  }, []);

  // 监听来自主进程的事件
  useEffect(() => {
    if ((window as any).electronAPI?.on) {
      // 监听悬停状态设置
      (window as any).electronAPI.on('set-hover-state', (hovered: boolean) => {
        setIsHovered(hovered);
      });

      // 监听按下状态设置
      (window as any).electronAPI.on('set-pressed-state', (pressed: boolean) => {
        setIsPressed(pressed);
      });

      // 监听按钮点击事件
      (window as any).electronAPI.on('button-clicked', () => {
        handleClick();
      });
    }

    return () => {
      // 清理事件监听器
      if ((window as any).electronAPI?.off) {
        (window as any).electronAPI.off('set-hover-state');
        (window as any).electronAPI.off('set-pressed-state');
        (window as any).electronAPI.off('button-clicked');
      }
    };
  }, [handleClick]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="close-button-container"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ 
            duration: 0.2,
            type: "spring",
            stiffness: 400,
            damping: 25
          }}
        >
          <motion.button
            className={`close-button ${isHovered ? 'hovered' : ''} ${isPressed ? 'pressed' : ''}`}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            whileHover={{ 
              scale: 1.1,
              rotate: 90
            }}
            whileTap={{ 
              scale: 0.9,
              rotate: 180
            }}
            transition={{
              duration: 0.2,
              type: "spring",
              stiffness: 300,
              damping: 20
            }}
            title="关闭"
            aria-label="关闭浮动窗口"
          >
            <motion.div
              className="close-icon"
              animate={{
                rotate: isHovered ? 90 : 0,
                scale: isPressed ? 0.8 : 1
              }}
              transition={{
                duration: 0.15,
                type: "spring",
                stiffness: 300,
                damping: 20
              }}
            >
              <X size={16} strokeWidth={2.5} />
            </motion.div>
          </motion.button>

          {/* 背景光晕效果 */}
          <motion.div
            className="button-glow"
            animate={{
              opacity: isHovered ? 0.6 : 0,
              scale: isHovered ? 1.2 : 1,
            }}
            transition={{ duration: 0.2 }}
          />

          {/* 点击波纹效果 */}
          <AnimatePresence>
            {isPressed && (
              <motion.div
                className="click-ripple"
                initial={{ opacity: 1, scale: 0 }}
                animate={{ opacity: 0, scale: 2 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              />
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};