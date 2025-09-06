import React from 'react';
import ReactDOM from 'react-dom/client';
import { AIQuestionApp } from './AIQuestionApp';
import './index.css';

// 创建根元素
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// 渲染应用
root.render(
  <React.StrictMode>
    <AIQuestionApp />
  </React.StrictMode>
);
