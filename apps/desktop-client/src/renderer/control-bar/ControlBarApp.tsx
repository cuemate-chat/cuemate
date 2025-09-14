import React from 'react';
import '../../App.css';
import { FloatingControlBar } from './components/FloatingControlBar.js';

export const ControlBarApp: React.FC = () => {
  return (
    <div className="app-container">
      <FloatingControlBar />
    </div>
  );
};