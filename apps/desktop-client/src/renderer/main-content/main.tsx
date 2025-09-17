import React from 'react';
import { createRoot } from 'react-dom/client';
import { MainContentApp } from './MainContentApp';
import './index.css';

// 确保 DOM 已加载
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

function initializeApp() {
  const container = document.getElementById('root');
  if (!container) {
    console.error('未找到根元素 #root');
    return;
  }

  const root = createRoot(container);
  
  root.render(
    <React.StrictMode>
      <MainContentApp />
    </React.StrictMode>
  );

  // 发送日志到主进程
  if ((window as any).logger) {
    (window as any).logger.info('主内容窗口 React 应用已启动');
  }
}
