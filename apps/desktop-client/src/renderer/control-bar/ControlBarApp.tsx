import React, { useEffect } from 'react';
import '../../App.css';
import { FloatingControlBar } from './components/FloatingControlBar.js';

export const ControlBarApp: React.FC = () => {
  // 监听点击穿透状态变化并应用到全局
  useEffect(() => {
    try {
      const api: any = (window as any).electronAPI;
      const off = api?.clickThrough?.onChanged?.((enabled: boolean) => {
        // 直接在body上添加/移除class，这样所有元素都能感知到穿透状态
        if (enabled) {
          document.body.classList.add('click-through-mode');
        } else {
          document.body.classList.remove('click-through-mode');
        }
      });
      return () => { try { off?.(); } catch {} };
    } catch {}
  }, []);

  return (
    <div className="app-container">
      <FloatingControlBar />
    </div>
  );
};