import * as Tooltip from '@radix-ui/react-tooltip';
import { motion } from 'framer-motion';
import { Layout } from 'lucide-react';
import { useEffect, useRef } from 'react';

// 日志工具函数
const log = async (level: 'info' | 'warn' | 'error' | 'debug', message: string) => {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('log_from_frontend', { level, message });
  } catch (error) {
    // 如果日志命令失败，静默处理
  }
};

interface FloatingControlBarProps {
  onShowCloseButton: () => void;
  onHideCloseButton: () => void;
}

export function FloatingControlBar({ onShowCloseButton, onHideCloseButton }: FloatingControlBarProps) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 注册全局快捷键
  useEffect(() => {
    const setupGlobalShortcut = async () => {
      try {
        const { register } = await import('@tauri-apps/plugin-global-shortcut');
        const { invoke } = await import('@tauri-apps/api/core');
        
        // 注册 ⌘+\ 快捷键
        await register('Cmd+Backslash', async () => {
          await log('info', '全局快捷键触发: ⌘+\\\\');
          try {
            await invoke('toggle_app_visibility');
          } catch (error) {
            await log('error', `快捷键切换失败: ${error}`);
          }
        });
      } catch (error) {
        await log('error', `全局快捷键注册失败: ${error}`);
      }
    };

    setupGlobalShortcut();
  }, []);

  // 处理 logo 点击事件 - 跳转到帮助文档
  const handleLogoClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('open_url', { url: 'https://cuemate.chat' });
    } catch (error) {
      await log('error', `打开链接失败: ${error}`);
    }
  };

  const openMainApp = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      // 首先尝试创建主窗口（如果不存在）
      await invoke('create_main_window');
      await log('info', '主应用窗口已创建并显示');
    } catch (error) {
      await log('error', `创建主应用失败: ${error}`);
      // 如果创建失败，尝试显示已存在的主窗口
      try {
        const { invoke: showInvoke } = await import('@tauri-apps/api/core');
        await showInvoke('show_main_window');
        await log('info', '已显示现有主应用窗口');
      } catch (showError) {
        await log('error', `显示主应用失败: ${showError}`);
      }
    }
  };

  // 处理鼠标进入事件
  const handleMouseEnter = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 关键：鼠标进入NSPanel时，立即恢复隐形锚点的焦点
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('ensure_main_focus');
      await log('info', '🔥 FloatingControlBar mouseEnter: 隐形锚点焦点已恢复');
    } catch (error) {
      await log('error', `恢复隐形锚点焦点失败: ${error}`);
    }
    
    // 清除之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    onShowCloseButton();
    log('info', '🟢 FloatingControlBar 鼠标进入，显示关闭按钮');
    
    // 通知 close-button 窗口显示
    try {
      const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
      const closeWindow = await WebviewWindow.getByLabel('close-button');
      if (closeWindow) {
        closeWindow.emit('toggle_close_button', { show: true });
      }
    } catch (error) {
      await log('error', `通知 close-button 窗口失败: ${error}`);
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
      log('info', '🔴 FloatingControlBar 鼠标离开（延迟），隐藏关闭按钮');
      
      // 通知 close-button 窗口隐藏
      try {
        const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
        const closeWindow = await WebviewWindow.getByLabel('close-button');
        if (closeWindow) {
          closeWindow.emit('toggle_close_button', { show: false });
        }
      } catch (error) {
        await log('error', `通知 close-button 窗口失败: ${error}`);
      }
    }, 300); // 300ms延迟，给用户足够时间移动到关闭按钮
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
                    <img 
                      src="/src/assets/CueMate.png" 
                      alt="CueMate Logo" 
                      className="logo-image"
                      onError={(e) => {
                        const target = e.target as HTMLElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          const fallback = document.createElement('div');
                          fallback.className = 'logo-circle';
                          fallback.textContent = 'C';
                          parent.appendChild(fallback);
                        }
                      }}
                    />
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