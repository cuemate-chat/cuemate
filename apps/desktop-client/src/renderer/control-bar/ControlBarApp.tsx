import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, Settings, Maximize2, Menu } from 'lucide-react';

export const ControlBarApp: React.FC = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);

  // 处理鼠标进入事件
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    if ((window as any).electronAPI?.onMouseEnter) {
      (window as any).electronAPI.onMouseEnter();
    }
  }, []);

  // 处理鼠标离开事件
  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    if ((window as any).electronAPI?.onMouseLeave) {
      (window as any).electronAPI.onMouseLeave();
    }
  }, []);

  // 处理点击主内容按钮
  const handleShowMainContent = useCallback(async () => {
    try {
      await (window as any).electronAPI?.toggleMainContent();
      (window as any).logger?.info('切换主内容窗口');
    } catch (error) {
      (window as any).logger?.error('切换主内容窗口失败: ' + error);
    }
  }, []);

  // 处理设置按钮点击
  const handleSettings = useCallback(() => {
    (window as any).logger?.info('设置按钮被点击');
    // 这里可以添加设置界面的逻辑
  }, []);

  // 处理搜索按钮点击
  const handleSearch = useCallback(() => {
    (window as any).logger?.info('搜索按钮被点击');
    // 这里可以添加搜索功能的逻辑
  }, []);

  // 监听来自主进程的事件
  useEffect(() => {
    if ((window as any).electronAPI?.on) {
      // 监听位置变化事件
      (window as any).electronAPI.on('position-changed', (bounds: any) => {
        (window as any).logger?.debug(`控制条位置变化: ${JSON.stringify(bounds)}`);
      });

      // 监听快捷键触发事件
      (window as any).electronAPI.on('shortcut-triggered', (shortcut: string) => {
        (window as any).logger?.info(`快捷键触发: ${shortcut}`);
        setIsActive(true);
        setTimeout(() => setIsActive(false), 200);
      });
    }

    return () => {
      // 清理事件监听器
      if ((window as any).electronAPI?.off) {
        (window as any).electronAPI.off('position-changed');
        (window as any).electronAPI.off('shortcut-triggered');
      }
    };
  }, []);

  return (
    <motion.div
      className="control-bar-container"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ 
        opacity: 1, 
        scale: isActive ? 1.05 : 1,
        y: isActive ? -2 : 0
      }}
      transition={{ 
        duration: 0.2,
        type: "spring",
        stiffness: 300,
        damping: 20
      }}
    >
      <div className={`control-bar ${isHovered ? 'hovered' : ''}`}>
        {/* 左侧菜单按钮 */}
        <motion.button
          className="control-button menu-button"
          onClick={handleSettings}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          title="菜单"
        >
          <Menu size={16} />
        </motion.button>

        {/* 中央搜索区域 */}
        <motion.button
          className="control-button search-button"
          onClick={handleSearch}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          title="搜索"
        >
          <Search size={16} />
          <span className="search-text">搜索...</span>
        </motion.button>

        {/* 右侧功能按钮 */}
        <div className="control-buttons-group">
          <motion.button
            className="control-button"
            onClick={handleShowMainContent}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            title="显示主窗口"
          >
            <Maximize2 size={16} />
          </motion.button>

          <motion.button
            className="control-button"
            onClick={handleSettings}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            title="设置"
          >
            <Settings size={16} />
          </motion.button>
        </div>
      </div>

      {/* 悬停状态指示器 */}
      {isHovered && (
        <motion.div
          className="hover-indicator"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          exit={{ scaleX: 0 }}
          transition={{ duration: 0.2 }}
        />
      )}
    </motion.div>
  );
};