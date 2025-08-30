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

export function FloatingControlBar() {
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

  const toggleMainApp = async () => {
    try {
      const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
      const windows = await WebviewWindow.getAll();
      let mainWindow = windows.find((w: any) => w.label === 'main-app');
      
      if (mainWindow) {
        const isVisible = await mainWindow.isVisible();
        if (isVisible) {
          await mainWindow.hide();
        } else {
          await mainWindow.show();
          await mainWindow.setFocus();
        }
      } else {
        mainWindow = new WebviewWindow('main-app', {
          url: 'http://localhost:5174',
          title: 'CueMate',
          width: 1200,
          height: 800,
          center: true,
          resizable: true,
          minimizable: true,
          maximizable: true,
          closable: true,
          skipTaskbar: false,
        });
      }
    } catch (error) {
      await log('error', `切换主应用失败: ${error}`);
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
      <div className="floating-bar-wrapper">
          <motion.div 
            className="simple-floating-bar"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
          {/* Logo 区域 - 点击展开主应用 */}
          <div 
            className="logo-section" 
            onClick={toggleMainApp}
            onMouseEnter={() => log('info', '🟢 Logo 区域 - MouseEnter')}
            onMouseLeave={() => log('info', '🟠 Logo 区域 - MouseLeave')}
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