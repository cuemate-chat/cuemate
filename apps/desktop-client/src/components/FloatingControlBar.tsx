import * as Tooltip from '@radix-ui/react-tooltip';
import { useEffect, useRef, useState } from 'react';
import { CloseButton } from './CloseButton.js';
import { MainControlBar } from './MainControlBar.js';

// 日志工具函数 - 使用 Electron IPC
const log = async (level: 'info' | 'warn' | 'error' | 'debug', message: string) => {
  try {
    if ((window as any).electronAPI) {
      await (window as any).electronAPI.log({ level, message });
    }
  } catch (error) {
    // 如果日志命令失败，静默处理
  }
};

interface FloatingControlBarProps {
  // 组件已完全自管理，不再需要外部回调
}

export function FloatingControlBar({}: FloatingControlBarProps = {}) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 关闭按钮相关状态
  const [showCloseButton, setShowCloseButton] = useState(false);
  const closeButtonTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 注册全局快捷键 - 使用 Electron IPC
  useEffect(() => {
    const setupGlobalShortcut = async () => {
      try {
        if ((window as any).electronAPI) {
        }
      } catch (error) {
        await log('error', `组件初始化失败: ${error}`);
      }
    };

    setupGlobalShortcut();
  }, []);

  // 处理容器鼠标进入事件
  const handleContainerMouseEnter = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 清除所有定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (closeButtonTimeoutRef.current) {
      clearTimeout(closeButtonTimeoutRef.current);
      closeButtonTimeoutRef.current = null;
    }
    
    // 显示关闭按钮
    setShowCloseButton(true);
  };

  // 处理容器鼠标离开事件
  const handleContainerMouseLeave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 清除之前的定时器
    if (closeButtonTimeoutRef.current) {
      clearTimeout(closeButtonTimeoutRef.current);
    }
    
    // 延迟隐藏关闭按钮，给用户时间在同一窗口内操作
    closeButtonTimeoutRef.current = setTimeout(() => {
      setShowCloseButton(false);
    }, 200);
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (closeButtonTimeoutRef.current) {
        clearTimeout(closeButtonTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Tooltip.Provider>
      <div 
        className="floating-control-bar-container"
        onMouseEnter={handleContainerMouseEnter}
        onMouseLeave={handleContainerMouseLeave}
      >
        {/* 主控制栏 */}
        <MainControlBar />

        {/* 关闭按钮 */}
        <CloseButton 
          showCloseButton={showCloseButton} 
        />
      </div>
    </Tooltip.Provider>
  );
}