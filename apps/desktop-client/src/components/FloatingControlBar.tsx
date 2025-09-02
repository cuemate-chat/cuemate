import * as Tooltip from '@radix-ui/react-tooltip';
import { motion } from 'framer-motion';
import { Layout } from 'lucide-react';
import { useEffect, useRef } from 'react';

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
    
    // 关键：鼠标进入控制条时，确保焦点管理
    try {
      if ((window as any).electronAPI) {
        await (window as any).electronAPI.ensureMainFocus();
      }
    } catch (error) {
      await log('error', `恢复焦点失败: ${error}`);
    }
    
    // 清除之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    onShowCloseButton();
    log('info', '🟢 FloatingControlBar 鼠标进入，显示关闭按钮');
    
    // 通知显示关闭按钮
    try {
      if ((window as any).electronAPI) {
        await (window as any).electronAPI.showCloseButton();
      }
    } catch (error) {
      await log('error', `显示关闭按钮失败: ${error}`);
    }
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
      
      // 通知隐藏关闭按钮
      try {
        if ((window as any).electronAPI) {
          await (window as any).electronAPI.hideCloseButton();
        }
      } catch (error) {
        await log('error', `隐藏关闭按钮失败: ${error}`);
      }
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
    <div 
      className="floating-control-bar"
    >
      <div 
        className="floating-bar-wrapper"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Tooltip.Provider>
          <motion.div 
            className="simple-floating-bar"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* Logo 区域 - 点击展开主应用 */}
            <Tooltip.Root delayDuration={0}>
              <Tooltip.Trigger asChild>
                <div 
                  className="logo-section" 
                  onClick={handleLogoClick}
                >
                  <div className="logo-icon">
                    <div className="logo-circle">C</div>
                  </div>
                </div>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  className="radix-tooltip-content"
                  side="bottom"
                  sideOffset={5}
                >
                  跳转到 CueMate 帮助文档
                  <Tooltip.Arrow className="radix-tooltip-arrow" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>

            {/* 欢迎文字 */}
            <Tooltip.Root delayDuration={0}>
              <Tooltip.Trigger asChild>
                <div className="welcome-text">
                  欢迎使用 CueMate, 请先登录
                </div>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  className="radix-tooltip-content"
                  side="bottom"
                  sideOffset={5}
                >
                  登录即可使用 CueMate 全部功能
                  <Tooltip.Arrow className="radix-tooltip-arrow" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>

            {/* 悬浮窗口按钮 */}
            <Tooltip.Root delayDuration={0}>
              <Tooltip.Trigger asChild>
                <button 
                  onClick={openMainApp} 
                  className="floating-overlay-btn"
                >
                  <Layout size={16} />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  className="radix-tooltip-content"
                  side="bottom"
                  sideOffset={5}
                >
                  打开 CueMate 主应用
                  <Tooltip.Arrow className="radix-tooltip-arrow" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>

          </motion.div>
        </Tooltip.Provider>
      </div>
    </div>
  );
}