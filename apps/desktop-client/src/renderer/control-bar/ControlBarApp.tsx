import React, { useCallback } from 'react';
import '../../App.css';
import { FloatingControlBar } from '../../components/FloatingControlBar.js';

export const ControlBarApp: React.FC = () => {
  // 处理显示关闭按钮
  const handleShowCloseButton = useCallback(async () => {
    try {
      await (window as any).electronAPI?.showCloseButton();
    } catch (error) {
      console.error('显示关闭按钮失败:', error);
    }
  }, []);

  // 处理隐藏关闭按钮
  const handleHideCloseButton = useCallback(async () => {
    try {
      await (window as any).electronAPI?.hideCloseButton();
    } catch (error) {
      console.error('隐藏关闭按钮失败:', error);
    }
  }, []);

  return (
    <div className="app-container">
      <FloatingControlBar
        onShowCloseButton={handleShowCloseButton}
        onHideCloseButton={handleHideCloseButton}
      />
    </div>
  );
};