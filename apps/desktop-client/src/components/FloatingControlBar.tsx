import * as Tooltip from '@radix-ui/react-tooltip';
import { motion } from 'framer-motion';
import { Layout } from 'lucide-react';
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
  onShowCloseButton: () => void;
  onHideCloseButton: () => void;
}

export function FloatingControlBar({ onShowCloseButton, onHideCloseButton }: FloatingControlBarProps) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isLogoHovered, setIsLogoHovered] = useState(false);

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

  // 处理鼠标进入事件
  const handleMouseEnter = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 清除之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    onShowCloseButton();
    log('info', 'FloatingControlBar 鼠标进入，显示关闭按钮');
  };

  // 处理鼠标离开事件，添加延迟隐藏
  const handleMouseLeave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 清除之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // 延迟隐藏，给用户时间移动到关闭按钮区域
    timeoutRef.current = setTimeout(async () => {
      onHideCloseButton();
    }, 200);
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <Tooltip.Provider>
      <motion.div 
        className="floating-control-bar"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
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
    </Tooltip.Provider>
  );
}