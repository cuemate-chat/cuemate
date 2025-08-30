import { motion } from 'framer-motion';
import { Layout } from 'lucide-react';
import { useEffect, useState } from 'react';

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
  const [floatingOverlayVisible, setFloatingOverlayVisible] = useState(false);

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
  const handleLogoClick = async () => {
    const confirmed = window.confirm('是否跳转到 CueMate 帮助文档？');
    if (confirmed) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('open_url', { url: 'https://cuemate.chat' });
      } catch (error) {
        await log('error', `打开链接失败: ${error}`);
      }
    }
  };


  const toggleFloatingOverlay = async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('toggle_floating_overlay');
      setFloatingOverlayVisible(!floatingOverlayVisible);
    } catch (error) {
      await log('error', `切换悬浮窗口失败: ${error}`);
    }
  };


  return (
    <div 
      className="floating-control-bar"
    >
      <div 
        className="floating-bar-wrapper"
        onMouseEnter={async () => {
          onShowCloseButton();
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
        }}
        onMouseLeave={async () => {
          onHideCloseButton();
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
        }}
      >
          <motion.div 
            className="simple-floating-bar"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
          {/* Logo 区域 - 点击展开主应用 */}
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

          {/* 欢迎文字 */}
          <div className="welcome-text">
            欢迎使用 CueMate, 请先登录
          </div>

          {/* 悬浮窗口按钮 */}
          <button 
            onClick={toggleFloatingOverlay} 
            className={`floating-overlay-btn ${floatingOverlayVisible ? 'active' : ''}`}
            title={floatingOverlayVisible ? '隐藏透明悬浮窗' : '显示透明悬浮窗'}
          >
            <Layout size={16} />
          </button>

          </motion.div>
        </div>
      </div>
  );
}