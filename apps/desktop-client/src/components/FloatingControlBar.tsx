import * as Tooltip from '@radix-ui/react-tooltip';
import { useEffect, useState } from 'react';
import CueMate2 from '../assets/CueMate2.png';
import { logger } from '../utils/rendererLogger.js';
import { CloseButton } from './CloseButton.js';
import { MainControlBar } from './MainControlBar.js';

interface FloatingControlBarProps {
  // 组件已完全自管理，不再需要外部回调
}

export function FloatingControlBar({}: FloatingControlBarProps = {}) {
  // 关闭按钮相关状态
  const [showCloseButton, setShowCloseButton] = useState(false);
  // 圆形图标模式状态
  const [isCircleMode, setIsCircleMode] = useState(false);

  // 在小圆模式下为 html 添加 circle-mode 类，触发透明样式
  useEffect(() => {
    if (isCircleMode) {
      document.documentElement.classList.add('circle-mode');
    } else {
      document.documentElement.classList.remove('circle-mode');
    }
    return () => document.documentElement.classList.remove('circle-mode');
  }, [isCircleMode]);

  // 注册全局快捷键和监听主进程事件
  useEffect(() => {
    const setupGlobalShortcut = async () => {
      try {
        if ((window as any).electronAPI) {
          // 监听主进程发送的圆形模式切换事件
          (window as any).electronAPI.onSwitchToCircleMode((_data: { circleSize: number }) => {
            setIsCircleMode(true);
          });

          (window as any).electronAPI.onSwitchToNormalMode(() => {
            setIsCircleMode(false);
          });
        }
      } catch (error) {
        await logger.error(`组件初始化失败: ${error}`);
      }
    };

    setupGlobalShortcut();
  }, []);

  // 处理容器鼠标进入事件
  const handleContainerMouseEnter = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowCloseButton(true);
  };

  // 处理容器鼠标离开事件
  const handleContainerMouseLeave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowCloseButton(false);
  };

  // 圆形图标模式的事件处理
  const handleCircleClick = () => {
    if (isCircleMode && (window as any).electronAPI) {
      // 切换回正常模式
      (window as any).electronAPI.toggleFloatingWindows?.();
    }
  };


  // 如果是圆形图标模式，渲染圆形图标
  if (isCircleMode) {
    return (
      <div 
        className="circle-icon-container"
        onClick={handleCircleClick}
      >
        {/* 圆形图标 */}
        <div className="circle-icon">
          <img 
            src={CueMate2} 
            alt="CueMate" 
            className="circle-icon-logo"
          />
        </div>
      </div>
    );
  }

  // 正常模式渲染原来的控制栏
  return (
    <Tooltip.Provider>
      <div 
        className="floating-control-bar-container"
        onMouseEnter={handleContainerMouseEnter}
        onMouseLeave={handleContainerMouseLeave}
      >
        {/* 主控制栏 */}
        <MainControlBar />

        {/* 关闭按钮 */}
        <CloseButton 
          showCloseButton={showCloseButton} 
        />
      </div>
    </Tooltip.Provider>
  );
}