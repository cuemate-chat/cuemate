import React from 'react';
import { createRoot } from 'react-dom/client';
import { logger } from '../../utils/rendererLogger.js';
import { ControlBarApp } from './ControlBarApp';
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
    logger.error('未找到根元素 #root');
    return;
  }

  const root = createRoot(container);
  
  root.render(
    <React.StrictMode>
      <ControlBarApp />
    </React.StrictMode>
  );

}