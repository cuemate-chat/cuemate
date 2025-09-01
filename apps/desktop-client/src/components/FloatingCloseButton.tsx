import * as Tooltip from '@radix-ui/react-tooltip';
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

export function FloatingCloseButton({ showCloseButton: _showCloseButton }: FloatingCloseButtonProps) {
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
  }, [showFromParent, isHovered]);
  
  // 处理鼠标进入事件
  const handleMouseEnter = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 关键：鼠标进入NSPanel时，立即恢复隐形锚点的焦点
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('ensure_main_focus');
    } catch (error) {
      await log('error', `恢复隐形锚点焦点失败: ${error}`);
    }
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsHovered(true);
    // 立即清理任何可能存在的定时器，防止意外隐藏
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  // 处理鼠标离开事件
  const handleMouseLeave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    timeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 200); // 200ms延迟，避免意外的鼠标离开
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
      await log('info', '开始隐藏所有窗口...');
      
      // 隐藏 control-bar 窗口
      try {
        const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
        const controlWindow = await WebviewWindow.getByLabel('control-bar');
        if (controlWindow) {
          await controlWindow.hide();
          await log('info', 'control-bar 窗口已隐藏');
        }
      } catch (error) {
        await log('error', `隐藏 control-bar 窗口失败: ${error}`);
      }
      
      // 隐藏 close-button 窗口
      try {
        const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
        const currentWindow = getCurrentWebviewWindow();
        await currentWindow.hide();
        await log('info', 'close-button 窗口已隐藏');
      } catch (error) {
        await log('error', `隐藏 close-button 窗口失败: ${error}`);
      }
      
      
      await log('info', '所有窗口已隐藏');
    } catch (error) {
      await log('error', `隐藏窗口失败: ${error}`);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    minimizeWindow();
  };

  return (
    <div 
      className="floating-close-button-container"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Tooltip.Provider>
        <Tooltip.Root delayDuration={0}>
          <Tooltip.Trigger asChild>
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
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              className="radix-tooltip-content"
              side="right"
              sideOffset={5}
              style={{ 
                opacity: shouldShow ? 1 : 0,
                visibility: shouldShow ? 'visible' : 'hidden',
                transition: 'opacity 0.2s ease, visibility 0.2s ease'
              }}
            >
              隐藏 CueMate，按 <span className="shortcut-key">⌘</span> + <span className="shortcut-key"> \ </span>  重新显示
              <Tooltip.Arrow className="radix-tooltip-arrow" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    </div>
  );
}