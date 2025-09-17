import * as Tooltip from '@radix-ui/react-tooltip';
import { useState } from 'react';
import { CloseButton } from './CloseButton.js';
import { MainControlBar } from './MainControlBar.js';

interface FloatingControlBarProps {
  // 组件已完全自管理，不再需要外部回调
}

export function FloatingControlBar({}: FloatingControlBarProps = {}) {
  // 关闭按钮相关状态
  const [showCloseButton, setShowCloseButton] = useState(false);

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