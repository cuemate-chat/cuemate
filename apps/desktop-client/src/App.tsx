import { invoke } from '@tauri-apps/api/core';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { motion } from 'framer-motion';
import { Eye, Layout, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import './App.css';

function App() {
  const [isDragging, setIsDragging] = useState(false);
  const [, setPosition] = useState({ x: 100, y: 100 });
  const [showFloatingBar, setShowFloatingBar] = useState(true);
  const [floatingOverlayVisible, setFloatingOverlayVisible] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === dragRef.current) {
      setIsDragging(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - 200,
        y: e.clientY - 40
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const toggleMainApp = async () => {
    try {
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
        // 创建新的主应用窗口，加载web项目
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
        
        // 监听窗口创建结果
        mainWindow.once('tauri://created', () => {
          console.log('主应用窗口创建成功');
        });
        
        mainWindow.once('tauri://error', (e: any) => {
          console.error('主应用窗口创建失败:', e);
          const message = `无法打开主应用窗口
          
请确保：
1. Web 服务正在运行 (端口 5174)
2. 运行 'pnpm dev' 启动 Web 服务
3. 检查防火墙设置`;
          alert(message);
        });
      }
    } catch (error) {
      console.error('打开主应用失败:', error);
      alert('打开主应用时发生错误，请检查网络连接和服务状态');
    }
  };

  const hideFloatingBar = () => {
    setShowFloatingBar(false);
  };

  const toggleFloatingOverlay = async () => {
    try {
      await invoke('toggle_floating_overlay');
      setFloatingOverlayVisible(!floatingOverlayVisible);
    } catch (error) {
      console.error('切换悬浮窗口失败:', error);
    }
  };

  // 如果悬浮框被隐藏，显示一个小的显示按钮
  if (!showFloatingBar) {
    return (
      <div className="floating-control-bar">
        <motion.button
          className="show-floating-btn"
          onClick={() => setShowFloatingBar(true)}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Eye size={20} />
        </motion.button>
      </div>
    );
  }

  return (
    <div className="floating-control-bar">
      {/* 简化的悬浮控制栏 */}
      <motion.div 
        className="simple-floating-bar"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* 拖拽区域 */}
        <div 
          ref={dragRef}
          className="drag-area"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />

        {/* Logo 区域 - 点击展开主应用 */}
        <div className="logo-section" onClick={toggleMainApp}>
          <div className="logo-icon">
            <img 
              src="/src/assets/CueMate.png" 
              alt="CueMate Logo" 
              className="logo-image"
              onError={(e) => {
                // 如果图片加载失败，显示字母C
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

        {/* 关闭按钮 */}
        <button onClick={hideFloatingBar} className="close-floating-btn">
          <X size={16} />
        </button>
      </motion.div>
    </div>
  );
}

export default App;