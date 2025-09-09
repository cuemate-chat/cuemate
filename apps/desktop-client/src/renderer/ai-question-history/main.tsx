import React from 'react';
import ReactDOM from 'react-dom/client';
import { AIQuestionHistoryApp } from './AIQuestionHistoryApp';
import './index.css';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <AIQuestionHistoryApp />
  </React.StrictMode>
);


