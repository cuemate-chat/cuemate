import { appWindow } from '@tauri-apps/api/window';
import { motion } from 'framer-motion';
import { Maximize2, Minimize2, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import Logo from '../assets/CueMate.png';

interface FloatingPanelProps {
  children: React.ReactNode;
}

const FloatingPanel: React.FC<FloatingPanelProps> = ({ children }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  // 仅用于触发渲染，不直接使用值
  const [, setIsDragging] = useState(false);

  useEffect(() => {
    // 设置窗口为始终置顶
    appWindow.setAlwaysOnTop(true);
  }, []);

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleClose = async () => {
    await appWindow.hide();
  };

  const handleStartDrag = async () => {
    setIsDragging(true);
    await appWindow.startDragging();
    setIsDragging(false);
  };

  return (
    <motion.div
      className="floating-panel bg-gray-900/95 backdrop-blur-lg rounded-xl shadow-2xl border border-gray-700/50 overflow-hidden"
      animate={{
        height: isMinimized ? '60px' : 'auto',
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* 标题栏 */}
      <div
        className="panel-header flex items-center justify-between p-3 bg-gray-800/50 border-b border-gray-700/50 cursor-move"
        onMouseDown={handleStartDrag}
      >
        <div className="flex items-center space-x-2">
          <img src={Logo} alt="CueMate" className="h-4 select-none" draggable={false} />
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-gray-300">CueMate</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleMinimize}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {isMinimized ? (
              <Maximize2 className="w-4 h-4 text-gray-400" />
            ) : (
              <Minimize2 className="w-4 h-4 text-gray-400" />
            )}
          </button>
          
          <button
            onClick={handleClose}
            className="p-1 hover:bg-red-600/20 rounded transition-colors"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <X className="w-4 h-4 text-gray-400 hover:text-red-400" />
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      {!isMinimized && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="panel-content"
        >
          {children}
        </motion.div>
      )}
    </motion.div>
  );
};

export default FloatingPanel;
