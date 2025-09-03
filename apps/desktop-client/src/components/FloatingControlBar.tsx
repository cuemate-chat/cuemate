import * as Tooltip from '@radix-ui/react-tooltip';
import { motion } from 'framer-motion';
import { Layout, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import CueMateLogo from '../assets/CueMate.png';
import CueMateLogo2 from '../assets/CueMate2.png';

// 日志工具函数 - 使用 Electron IPC
const log = async (level: 'info' | 'warn' | 'error' | 'debug', message: string) => {
  try {
    if ((window as any).electronAPI) {
      await (window as any).electronAPI.log({ level, message });
    }
  } catch (error) {
    // 如果日志命令失败，静默处理
    console.warn('日志发送失败:', error);
  }
};

interface FloatingControlBarProps {
  // 保留接口但不再使用，为了兼容性
  onShowCloseButton?: () => void;
  onHideCloseButton?: () => void;
}

export function FloatingControlBar({ onShowCloseButton, onHideCloseButton }: FloatingControlBarProps) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isLogoHovered, setIsLogoHovered] = useState(false);
  
  // 关闭按钮相关状态
  const [isCloseButtonHovered, setIsCloseButtonHovered] = useState(false);
  const [showCloseButton, setShowCloseButton] = useState(false);
  const closeButtonTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 注册全局快捷键 - 使用 Electron IPC
  useEffect(() => {
    const setupGlobalShortcut = async () => {
      try {
        if ((window as any).electronAPI) {
          // 全局快捷键由主进程处理，这里只是通知已准备好
          await log('info', '组件已初始化，全局快捷键由主进程管理');
        }
      } catch (error) {
        await log('error', `组件初始化失败: ${error}`);
      }
    };

    setupGlobalShortcut();
  }, []);

  // 处理 logo 点击事件 - 跳转到帮助文档
  const handleLogoClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if ((window as any).electronAPI && 'openExternalUrl' in (window as any).electronAPI) {
        await ((window as any).electronAPI as any).openExternalUrl('https://cuemate.chat');
      }
    } catch (error) {
      await log('error', `打开链接失败: ${error}`);
    }
  };

  // 处理 logo 悬浮事件
  const handleLogoMouseEnter = () => {
    setIsLogoHovered(true);
  };

  const handleLogoMouseLeave = () => {
    setIsLogoHovered(false);
  };

  const openMainApp = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if ((window as any).electronAPI) {
        await (window as any).electronAPI.showMainContent();
        await log('info', '主应用窗口已显示');
      }
    } catch (error) {
      await log('error', `显示主应用失败: ${error}`);
    }
  };

  // 关闭按钮功能
  const minimizeWindow = async () => {
    try {
      await log('info', '开始隐藏所有浮动窗口...');
      
      // 使用 Electron API 隐藏浮动窗口
      if ((window as any).electronAPI) {
        await (window as any).electronAPI.hideFloatingWindows();
        await log('info', '所有浮动窗口已隐藏');
      }
    } catch (error) {
      await log('error', `隐藏窗口失败: ${error}`);
    }
  };

  const handleCloseButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    minimizeWindow();
  };

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
    onShowCloseButton?.();
    log('info', 'FloatingControlBar 鼠标进入，显示关闭按钮');
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
      onHideCloseButton?.();
    }, 200);
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
    await log('info', 'FloatingCloseButton 鼠标进入事件触发');
  };

  // 关闭按钮区域鼠标离开
  const handleCloseButtonMouseLeave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsCloseButtonHovered(false);
    
    // 延迟隐藏
    closeButtonTimeoutRef.current = setTimeout(() => {
      setShowCloseButton(false);
      onHideCloseButton?.();
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
        {/* 主控制栏 - 居中显示 */}
        <motion.div 
          className="floating-control-bar"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          {/* Logo 区域 - 点击展开主应用 */}
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <div 
                className="logo-section" 
                onClick={handleLogoClick}
                onMouseEnter={handleLogoMouseEnter}
                onMouseLeave={handleLogoMouseLeave}
              >
                <div className="logo-icon">
                  <img 
                    src={isLogoHovered ? CueMateLogo2 : CueMateLogo} 
                    alt="CueMate" 
                    className="logo-image" 
                  />
                </div>
              </div>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content className="radix-tooltip-content">
                访问 CueMate 官网
                <Tooltip.Arrow className="radix-tooltip-arrow" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>

          {/* 欢迎文字 */}
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <div className="welcome-text">
                欢迎使用 CueMate, 请先登录
              </div>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content className="radix-tooltip-content">
                点击右侧按钮打开主应用
                <Tooltip.Arrow className="radix-tooltip-arrow" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>

          {/* 悬浮窗口按钮 */}
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button 
                onClick={openMainApp} 
                className="floating-overlay-btn"
              >
                <Layout size={18} />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content className="radix-tooltip-content">
                打开主应用窗口，快捷键 <span className="shortcut-key"> ⌘</span> + <span className="shortcut-key">J</span>
                <Tooltip.Arrow className="radix-tooltip-arrow" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </motion.div>

        {/* 关闭按钮 - 绝对定位在右侧 */}
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
                <X size={16} />
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
      </div>
    </Tooltip.Provider>
  );
}