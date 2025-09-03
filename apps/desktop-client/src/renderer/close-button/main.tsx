import React from 'react';
import { createRoot } from 'react-dom/client';
import { CloseButtonApp } from './CloseButtonApp';
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
    // 渲染进程中保留 console.error，因为这是错误处理
    console.error('未找到根元素 #root');
    return;
  }

  const root = createRoot(container);
  
  root.render(
    <React.StrictMode>
      <CloseButtonApp />
    </React.StrictMode>
  );

  // 发送日志到主进程
  if ((window as any).logger) {
    (window as any).logger.info('关闭按钮窗口 React 应用已启动');
  }
}