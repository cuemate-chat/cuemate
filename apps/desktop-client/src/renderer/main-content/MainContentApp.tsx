import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, 
  Search, 
  FileText, 
  Folder,
  Minimize2,
  Maximize2,
  X,
  Home,
  Star,
  Clock
} from 'lucide-react';

interface AppInfo {
  name: string;
  version: string;
  platform: string;
  arch: string;
  electronVersion: string;
  nodeVersion: string;
  chromeVersion: string;
}

export const MainContentApp: React.FC = () => {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [, setIsMaximized] = useState(false);

  // 获取应用信息
  const fetchAppInfo = useCallback(async () => {
    try {
      const result = await (window as any).electronAPI?.getAppInfo();
      if (result?.success) {
        setAppInfo(result.data);
        (window as any).logger?.info('应用信息加载成功');
      }
    } catch (error) {
      (window as any).logger?.error('获取应用信息失败: ' + error);
    }
  }, []);

  // 处理窗口控制
  const handleMinimize = useCallback(async () => {
    try {
      await (window as any).electronAPI?.hideMainContent();
      (window as any).logger?.info('主窗口最小化');
    } catch (error) {
      (window as any).logger?.error('窗口最小化失败: ' + error);
    }
  }, []);

  const handleMaximize = useCallback(() => {
    (window as any).logger?.info('窗口最大化切换');
    // 这里可以添加最大化逻辑
  }, []);

  const handleClose = useCallback(async () => {
    try {
      await (window as any).electronAPI?.hideMainContent();
      (window as any).logger?.info('主窗口关闭');
    } catch (error) {
      (window as any).logger?.error('窗口关闭失败: ' + error);
    }
  }, []);

  // 处理设置
  const handleSettings = useCallback(() => {
    setActiveTab('settings');
    (window as any).logger?.info('切换到设置页面');
  }, []);

  // 处理文件操作
  const handleOpenFile = useCallback(async () => {
    try {
      const result = await (window as any).electronAPI?.showFileDialog();
      if (result?.success && !result.data.canceled) {
        (window as any).logger?.info('选择文件: ' + JSON.stringify(result.data.filePaths));
      }
    } catch (error) {
      (window as any).logger?.error('文件对话框失败: ' + error);
    }
  }, []);

  const handleOpenFolder = useCallback(async () => {
    try {
      const result = await (window as any).electronAPI?.showFolderDialog();
      if (result?.success && !result.data.canceled) {
        (window as any).logger?.info('选择文件夹: ' + JSON.stringify(result.data.filePaths));
      }
    } catch (error) {
      (window as any).logger?.error('文件夹对话框失败: ' + error);
    }
  }, []);

  // 初始化和主题检测
  useEffect(() => {
    fetchAppInfo();

    // 检测系统主题
    if ((window as any).electronAPI?.getTheme) {
      const currentTheme = (window as any).electronAPI.getTheme();
      setTheme(currentTheme);

      // 监听主题变化
      const cleanup = (window as any).electronAPI.onThemeChange?.((newTheme: 'light' | 'dark') => {
        setTheme(newTheme);
        (window as any).logger?.info(`主题切换到: ${newTheme}`);
      });

      return cleanup;
    }
  }, [fetchAppInfo]);

  // 监听窗口事件
  useEffect(() => {
    if ((window as any).electronAPI?.on) {
      (window as any).electronAPI.on('window-maximized', (maximized: boolean) => {
        setIsMaximized(maximized);
      });

      (window as any).electronAPI.on('window-resized', (bounds: any) => {
        (window as any).logger?.debug(`窗口尺寸变化: ${bounds.width}x${bounds.height}`);
      });

      (window as any).electronAPI.on('window-moved', (bounds: any) => {
        (window as any).logger?.debug(`窗口位置变化: (${bounds.x}, ${bounds.y})`);
      });
    }

    return () => {
      if ((window as any).electronAPI?.off) {
        (window as any).electronAPI.off('window-maximized');
        (window as any).electronAPI.off('window-resized');
        (window as any).electronAPI.off('window-moved');
      }
    };
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="tab-content">
            <div className="welcome-section">
              <h1 className="text-3xl font-bold mb-4">欢迎使用 CueMate</h1>
              <p className="text-gray-600 dark:text-gray-300 mb-8">
                一个强大的桌面助手工具，帮助您提高工作效率。
              </p>
              
              <div className="feature-grid">
                <motion.div 
                  className="feature-card"
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Search className="feature-icon" />
                  <h3>快速搜索</h3>
                  <p>强大的全文搜索功能</p>
                </motion.div>
                
                <motion.div 
                  className="feature-card"
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleOpenFile}
                >
                  <FileText className="feature-icon" />
                  <h3>文件管理</h3>
                  <p>便捷的文件操作</p>
                </motion.div>
                
                <motion.div 
                  className="feature-card"
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleOpenFolder}
                >
                  <Folder className="feature-icon" />
                  <h3>文件夹浏览</h3>
                  <p>快速访问常用目录</p>
                </motion.div>
                
                <motion.div 
                  className="feature-card"
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSettings}
                >
                  <Settings className="feature-icon" />
                  <h3>个性化设置</h3>
                  <p>自定义您的体验</p>
                </motion.div>
              </div>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="tab-content">
            <h2 className="text-2xl font-bold mb-6">应用设置</h2>
            
            {appInfo && (
              <div className="settings-section">
                <h3 className="text-lg font-semibold mb-4">应用信息</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">应用名称:</span>
                    <span className="info-value">{appInfo.name}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">版本:</span>
                    <span className="info-value">{appInfo.version}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">平台:</span>
                    <span className="info-value">{appInfo.platform}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">架构:</span>
                    <span className="info-value">{appInfo.arch}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Electron:</span>
                    <span className="info-value">{appInfo.electronVersion}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Node.js:</span>
                    <span className="info-value">{appInfo.nodeVersion}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Chromium:</span>
                    <span className="info-value">{appInfo.chromeVersion}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">主题:</span>
                    <span className="info-value">{theme === 'dark' ? '暗色' : '亮色'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="tab-content">
            <div className="text-center py-20">
              <h2 className="text-xl font-semibold mb-4">功能开发中</h2>
              <p className="text-gray-600 dark:text-gray-300">
                该功能正在开发中，敬请期待。
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={`main-content-app ${theme}`}>
      {/* 自定义标题栏 */}
      <div className="custom-titlebar">
        <div className="titlebar-left">
          <span className="app-title">CueMate</span>
        </div>
        <div className="titlebar-right">
          <motion.button
            className="titlebar-button"
            onClick={handleMinimize}
            whileHover={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}
            whileTap={{ scale: 0.95 }}
          >
            <Minimize2 size={14} />
          </motion.button>
          <motion.button
            className="titlebar-button"
            onClick={handleMaximize}
            whileHover={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}
            whileTap={{ scale: 0.95 }}
          >
            <Maximize2 size={14} />
          </motion.button>
          <motion.button
            className="titlebar-button close"
            onClick={handleClose}
            whileHover={{ backgroundColor: 'rgba(239, 68, 68, 0.9)' }}
            whileTap={{ scale: 0.95 }}
          >
            <X size={14} />
          </motion.button>
        </div>
      </div>

      <div className="main-layout">
        {/* 侧边栏 */}
        <div className="sidebar">
          <div className="sidebar-menu">
            <motion.button
              className={`menu-item ${activeTab === 'home' ? 'active' : ''}`}
              onClick={() => setActiveTab('home')}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
            >
              <Home size={18} />
              <span>首页</span>
            </motion.button>
            
            <motion.button
              className={`menu-item ${activeTab === 'recent' ? 'active' : ''}`}
              onClick={() => setActiveTab('recent')}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
            >
              <Clock size={18} />
              <span>最近</span>
            </motion.button>
            
            <motion.button
              className={`menu-item ${activeTab === 'favorites' ? 'active' : ''}`}
              onClick={() => setActiveTab('favorites')}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
            >
              <Star size={18} />
              <span>收藏</span>
            </motion.button>
            
            <motion.button
              className={`menu-item ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
            >
              <Settings size={18} />
              <span>设置</span>
            </motion.button>
          </div>
        </div>

        {/* 主内容区域 */}
        <div className="content-area">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {renderTabContent()}
          </motion.div>
        </div>
      </div>
    </div>
  );
};