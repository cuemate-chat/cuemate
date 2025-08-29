import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { motion } from 'framer-motion';
import { Maximize2, Minimize2, Settings, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

const FloatingOverlay: React.FC = () => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    // 设置窗口属性
    const setupWindow = async () => {
      const window = getCurrentWindow();
      await window.setAlwaysOnTop(true);
      await window.setSkipTaskbar(true);
    };
    setupWindow();
  }, []);

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleClose = async () => {
    try {
      await invoke('hide_floating_overlay');
    } catch (error) {
      console.error('隐藏悬浮窗口失败:', error);
    }
  };

  const handleSettings = async () => {
    // 显示主控制窗口
    try {
      const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
      const controlWindow = await WebviewWindow.getByLabel('control-bar');
      if (controlWindow) {
        await controlWindow.show();
        await controlWindow.setFocus();
      }
    } catch (error) {
      console.error('显示控制窗口失败:', error);
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0',
        margin: '0'
      }}
    >
      <motion.div
        className="floating-bubble"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        style={{
          background: 'rgba(30, 30, 30, 0.3)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          borderRadius: isMinimized ? '25px' : '25px',
          padding: isMinimized ? '8px 16px' : '12px 20px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          minWidth: isMinimized ? '120px' : '280px',
          maxWidth: '300px'
        }}
      >
        {/* 主内容区 */}
        <div className="flex items-center justify-between">
          {/* Logo和状态 */}
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs font-medium text-white">CueMate</span>
            {isRecording && (
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </div>

          {!isMinimized && (
            <div className="flex items-center space-x-1">
              <button
                onClick={toggleRecording}
                className={`p-1.5 rounded-full transition-all duration-200 ${
                  isRecording 
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                    : 'text-gray-400 hover:bg-white/10'
                }`}
                title={isRecording ? '停止录音' : '开始录音'}
              >
                <div className="w-2.5 h-2.5 rounded-full border border-current" />
              </button>
              
              <button
                onClick={handleSettings}
                className="p-1.5 text-gray-400 hover:bg-white/10 rounded-full transition-all duration-200"
                title="设置"
              >
                <Settings className="w-2.5 h-2.5" />
              </button>
              
              <button
                onClick={handleMinimize}
                className="p-1.5 text-gray-400 hover:bg-white/10 rounded-full transition-all duration-200"
                title="收起"
              >
                <Minimize2 className="w-2.5 h-2.5" />
              </button>
              
              <button
                onClick={handleClose}
                className="p-1.5 text-gray-400 hover:bg-red-500/20 hover:text-red-400 rounded-full transition-all duration-200"
                title="关闭"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          )}

          {isMinimized && (
            <button
              onClick={handleMinimize}
              className="p-1 text-gray-400 hover:bg-white/10 rounded-full transition-all duration-200"
              title="展开"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* 展开内容 */}
        {!isMinimized && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-2 pt-2 border-t border-white/10"
          >
            <div className="flex items-center justify-between text-xs text-gray-300">
              <span>Ready</span>
              <div className="flex items-center space-x-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <span>Online</span>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default FloatingOverlay;