import { useCallback, useState } from 'react';
import './App.css';
import { FloatingCloseButton } from './components/FloatingCloseButton';
import { FloatingControlBar } from './components/FloatingControlBar';

// 日志工具函数
const log = async (level: 'info' | 'warn' | 'error' | 'debug', message: string) => {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('log_from_frontend', { level, message });
  } catch (error) {
    // 如果日志命令失败，静默处理
  }
};

function App() {
  const [showCloseButton, setShowCloseButton] = useState(false);

  const handleMouseOver = useCallback(async (e: React.MouseEvent) => {
    // 只有从容器外部进入时才触发
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      await log('info', '🔵 App.tsx - MouseOver 触发（从外部进入）');
      await log('info', `  - target: ${(e.target as HTMLElement)?.className || 'unknown'}`);
      await log('info', `  - relatedTarget: ${(e.relatedTarget as HTMLElement)?.className || 'unknown'}`);
      await log('info', `  - 当前 showCloseButton: ${showCloseButton}`);
      setShowCloseButton(true);
      await log('info', '  - 设置 showCloseButton = true');
    }
  }, [showCloseButton]);

  const handleMouseOut = useCallback(async (e: React.MouseEvent) => {
    // 只有真正离开容器时才触发
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      await log('info', '🔴 App.tsx - MouseOut 触发（真正离开）');
      await log('info', `  - target: ${(e.target as HTMLElement)?.className || 'unknown'}`);
      await log('info', `  - relatedTarget: ${(e.relatedTarget as HTMLElement)?.className || 'unknown'}`);
      await log('info', `  - 当前 showCloseButton: ${showCloseButton}`);
      setShowCloseButton(false);
      await log('info', '  - 设置 showCloseButton = false');
    }
  }, [showCloseButton]);

  return (
    <div 
      className="app-container"
      onMouseOver={handleMouseOver}
      onMouseOut={handleMouseOut}
    >
      <FloatingControlBar />
      <FloatingCloseButton showCloseButton={showCloseButton} />
    </div>
  );
}

export default App;