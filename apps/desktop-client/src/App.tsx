import { motion } from 'framer-motion';
import { Layout, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import './App.css';

// 日志工具函数
const log = async (level: 'info' | 'warn' | 'error' | 'debug', message: string) => {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('log_from_frontend', { level, message });
  } catch (error) {
    // 如果日志命令失败，静默处理
  }
};

function App() {
  const [floatingOverlayVisible, setFloatingOverlayVisible] = useState(false);
  const [showCloseButton, setShowCloseButton] = useState(true); // 先设为true调试
  const [activeShortcut, setActiveShortcut] = useState('快捷键');

  // 注册全局快捷键
  useEffect(() => {
    const setupGlobalShortcut = async () => {
      try {
        const { register } = await import('@tauri-apps/plugin-global-shortcut');
        const { invoke } = await import('@tauri-apps/api/core');
        
        // 注册 ⌘+\ 快捷键
        await register('Cmd+\\', async () => {
          await log('info', '全局快捷键触发: ⌘+\\');
          try {
            await invoke('toggle_app_visibility');
          } catch (error) {
            await log('error', `快捷键切换失败: ${error}`);
          }
        });
        
        setActiveShortcut('Cmd+\\');
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
          title: 'CueMate - 面试助手',
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

  const minimizeWindow = async () => {
    try {
      await log('info', '开始最小化窗口...');
      const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
      const currentWindow = getCurrentWebviewWindow();
      await log('info', `获取到窗口: ${currentWindow.label}`);
      
      // 尝试隐藏窗口
      await currentWindow.hide();
      await log('info', '窗口已隐藏');
    } catch (error) {
      await log('error', `操作窗口失败: ${error}`);
      // 备用方案：尝试最小化
      try {
        const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
        const currentWindow = getCurrentWebviewWindow();
        await currentWindow.minimize();
        await log('info', '窗口已最小化');
      } catch (minError) {
        await log('error', `最小化也失败: ${minError}`);
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
    <div className="floating-control-bar">
      <div className="floating-bar-wrapper">
        <motion.div 
          className="simple-floating-bar"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          onMouseEnter={() => setShowCloseButton(true)}
          onMouseLeave={() => setShowCloseButton(false)}
        >
        {/* Logo 区域 - 点击展开主应用 */}
        <div className="logo-section" onClick={toggleMainApp}>
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
          欢迎使用 CueMate
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
        
        {/* 关闭按钮区域 */}
        <div 
          className="close-button-area"
          onMouseEnter={() => setShowCloseButton(true)}
          onMouseLeave={() => setShowCloseButton(false)}
        >
          <motion.button 
            onClick={minimizeWindow}
            className="close-floating-btn-separate"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: showCloseButton ? 1 : 0, scale: showCloseButton ? 1 : 0.8 }}
            transition={{ duration: 0.2 }}
          >
            <X size={14} />
          </motion.button>
          
          {/* 提示文字 - 简化调试 */}
          <div className="close-button-tooltip">
            隐藏 CueMate，按 {activeShortcut} 重新显示
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;