import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

// 日志工具函数
const log = async (level: 'info' | 'warn' | 'error' | 'debug', message: string) => {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('log_from_frontend', { level, message });
  } catch (error) {
    // 如果日志命令失败，静默处理
  }
};

interface FloatingCloseButtonProps {
  showCloseButton: boolean;
}

export function FloatingCloseButton({ showCloseButton }: FloatingCloseButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);
  const [showFromParent, setShowFromParent] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 监听来自主窗口的显示/隐藏事件
  useEffect(() => {
    const setupEventListener = async () => {
      try {
        const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
        const currentWindow = getCurrentWebviewWindow();
        
        const unlisten = await currentWindow.listen('toggle_close_button', (event) => {
          const { show } = event.payload as { show: boolean };
          setShowFromParent(show);
          log('info', `🟡 FloatingCloseButton 收到父窗口事件，showFromParent: ${show}`);
        });
        
        return unlisten;
      } catch (error) {
        await log('error', `设置事件监听失败: ${error}`);
      }
    };
    
    setupEventListener();
  }, []);
  
  // 计算最终显示状态：父窗口要求显示 或者 本地鼠标悬浮
  useEffect(() => {
    const newShouldShow = showFromParent || isHovered;
    setShouldShow(newShouldShow);
    log('info', `🟡 FloatingCloseButton 状态更新，showFromParent: ${showFromParent}, isHovered: ${isHovered}, shouldShow: ${newShouldShow}`);
  }, [showFromParent, isHovered]);
  
  // 处理鼠标进入事件
  const handleMouseEnter = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsHovered(true);
    log('info', '🟢 FloatingCloseButton 鼠标进入，设置isHovered为true');
  };

  // 处理鼠标离开事件
  const handleMouseLeave = (e: React.MouseEvent) => {
    e.stopPropagation();
    timeoutRef.current = setTimeout(() => {
      setIsHovered(false);
      log('info', '🔴 FloatingCloseButton 鼠标离开（延迟），设置isHovered为false');
    }, 100);
  };
  
  // 清理定时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

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

  const handleClick = () => {
    minimizeWindow();
  };

  return (
    <div 
      className="floating-close-button-container"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button 
        onClick={handleClick}
        className="close-floating-btn-separate"
        style={{ 
          opacity: shouldShow ? 1 : 0,
          visibility: shouldShow ? 'visible' : 'hidden',
          pointerEvents: shouldShow ? 'auto' : 'none',
          transition: 'opacity 0.2s ease, visibility 0.2s ease'
        }}
      >
        <X size={14} />
      </button>
      <div 
        className="close-button-tooltip"
        style={{ 
          opacity: shouldShow ? 1 : 0,
          visibility: shouldShow ? 'visible' : 'hidden',
          transition: 'opacity 0.2s ease, visibility 0.2s ease'
        }}
      >
        隐藏 CueMate，按 <span className="shortcut-key">⌘</span> + <span className="shortcut-key">\</span> 重新显示
      </div>
    </div>
  );
}