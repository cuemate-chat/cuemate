import { X } from 'lucide-react';

// 日志工具函数
const log = async (level: 'info' | 'warn' | 'error' | 'debug', message: string) => {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('log_from_frontend', { level, message });
  } catch (error) {
    // 如果日志命令失败，静默处理
  }
};

interface FloatingCloseButtonProps {
  showCloseButton: boolean;
}

export function FloatingCloseButton({ showCloseButton }: FloatingCloseButtonProps) {
  log('info', `🟡 FloatingCloseButton 重新渲染，showCloseButton: ${showCloseButton}`);

  const minimizeWindow = async () => {
    try {
      await log('info', '开始最小化窗口...');
      const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
      const currentWindow = getCurrentWebviewWindow();
      await log('info', `获取到窗口: ${currentWindow.label}`);
      
      // 尝试隐藏窗口
      await currentWindow.hide();
      await log('info', '窗口已隐藏');
    } catch (error) {
      await log('error', `操作窗口失败: ${error}`);
      // 备用方案：尝试最小化
      try {
        const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
        const currentWindow = getCurrentWebviewWindow();
        await currentWindow.minimize();
        await log('info', '窗口已最小化');
      } catch (minError) {
        await log('error', `最小化也失败: ${minError}`);
      }
    }
  };


  return (
    <div className="floating-close-button-container">
      <button 
        onClick={minimizeWindow}
        className="close-floating-btn-separate"
        style={{ 
          opacity: showCloseButton ? 1 : 0,
          visibility: showCloseButton ? 'visible' : 'hidden',
          pointerEvents: showCloseButton ? 'auto' : 'none'
        }}
      >
        <X size={14} />
      </button>
      <div 
        className="close-button-tooltip"
        style={{ 
          opacity: showCloseButton ? 1 : 0,
          visibility: showCloseButton ? 'visible' : 'hidden'
        }}
      >
        隐藏 CueMate，按 <span className="shortcut-key">⌘</span><span className="shortcut-key">\</span> 重新显示
      </div>
    </div>
  );
}