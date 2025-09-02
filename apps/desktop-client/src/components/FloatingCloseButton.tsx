import * as Tooltip from '@radix-ui/react-tooltip';
import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

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

interface FloatingCloseButtonProps {
  showCloseButton: boolean;
}

export function FloatingCloseButton({ showCloseButton: _showCloseButton }: FloatingCloseButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);
  const [showFromParent, setShowFromParent] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 监听来自主进程的显示/隐藏事件
  useEffect(() => {
    const setupEventListener = () => {
      try {
        if ((window as any).electronAPI) {
          // 监听关闭按钮显示/隐藏事件
          (window as any).electronAPI.on('toggle-close-button', (show: boolean) => {
            setShowFromParent(show);
          });
        }
      } catch (error) {
        log('error', `设置事件监听失败: ${error}`);
      }
    };
    
    setupEventListener();
    
    // 清理函数
    return () => {
      if ((window as any).electronAPI) {
        (window as any).electronAPI.off('toggle-close-button');
      }
    };
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
    
    // 关键：鼠标进入关闭按钮时，确保焦点管理
    try {
      if ((window as any).electronAPI) {
        await (window as any).electronAPI.ensureMainFocus();
      }
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