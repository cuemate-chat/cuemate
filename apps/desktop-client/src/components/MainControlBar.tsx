import * as Tooltip from '@radix-ui/react-tooltip';
import { motion } from 'framer-motion';
import { Layout } from 'lucide-react';
import { useEffect, useState } from 'react';
import CueMateLogo from '../assets/CueMate.png';
import CueMateLogo2 from '../assets/CueMate2.png';
import { logger } from '../utils/rendererLogger.js';
import { LoggedInControlBar } from './LoggedInControlBar';

interface MainControlBarProps {
  // 移除未使用的参数
}

// 加载动画组件
const LoadingDots = () => {
  return (
    <div className="loading-dots">
      <motion.span
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
        className="dot"
      />
      <motion.span
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
        className="dot"
      />
      <motion.span
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
        className="dot"
      />
    </div>
  );
};

export function MainControlBar({}: MainControlBarProps) {
  const [isLogoHovered, setIsLogoHovered] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMainAppVisible, setIsMainAppVisible] = useState(false);

  // 检查登录状态
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        if ((window as any).electronAPI) {
          const result = await (window as any).electronAPI.checkLoginStatus();
          if (result.success) {
            setIsLoggedIn(result.isLoggedIn);
          } else {
            await logger.error(`登录状态检查失败: ${result.error}`);
          }
        }
      } catch (error) {
        await logger.error(`登录状态检查异常: ${error}`);
      } finally {
        setIsLoading(false);
      }
    };

    checkLoginStatus();
  }, []);

  // 监听 WebSocket 登录登出事件
  useEffect(() => {
    const handleWebSocketLoginSuccess = (data: { isLoggedIn: boolean; user?: any }) => {
      setIsLoggedIn(data.isLoggedIn);
      setIsLoading(false);
    };

    const handleWebSocketLogout = (data: { isLoggedIn: boolean }) => {
      setIsLoggedIn(data.isLoggedIn);
      setIsLoading(false);
    };

    // 监听主应用窗口显示/隐藏事件
    const handleMainAppShow = () => {
      setIsMainAppVisible(true);
    };

    const handleMainAppHide = () => {
      setIsMainAppVisible(false);
    };

    // 监听 WebSocket 事件
    if ((window as any).electronAPI && (window as any).electronAPI.on) {
      (window as any).electronAPI.on('websocket-login-success', handleWebSocketLoginSuccess);
      (window as any).electronAPI.on('websocket-logout', handleWebSocketLogout);
      (window as any).electronAPI.on('main-app-show', handleMainAppShow);
      (window as any).electronAPI.on('main-app-hide', handleMainAppHide);
    }

    // 清理监听器
    return () => {
      if ((window as any).electronAPI && (window as any).electronAPI.off) {
        (window as any).electronAPI.off('websocket-login-success', handleWebSocketLoginSuccess);
        (window as any).electronAPI.off('websocket-logout', handleWebSocketLogout);
        (window as any).electronAPI.off('main-app-show', handleMainAppShow);
        (window as any).electronAPI.off('main-app-hide', handleMainAppHide);
      }
    };
  }, []);

  // 处理 logo 点击事件 - 跳转到帮助文档  
  const handleLogoClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      // 使用原有的 IPC 方式（因为这是在 Electron 渲染进程中）
      if ((window as any).electronAPI && 'openExternalUrl' in (window as any).electronAPI) {
        await ((window as any).electronAPI as any).openExternalUrl('https://docs.cuemate.chat');
      }
    } catch (error) {
      await logger.error(`打开链接失败: ${error}`);
    }
  };

  // 处理 logo 悬浮事件
  const handleLogoMouseEnter = () => {
    setIsLogoHovered(true);
  };

  const handleLogoMouseLeave = () => {
    setIsLogoHovered(false);
  };

  // 处理登录提示点击事件 - 打开主应用（一次性）
  const handleLoginPromptClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if ((window as any).electronAPI) {
        await (window as any).electronAPI.showMainContent();
        setIsMainAppVisible(true);
      }
    } catch (error) {
      await logger.error(`显示主应用失败: ${error}`);
    }
  };

  // 处理右侧按钮点击 - 根据主应用窗口状态切换显示/隐藏
  const handleToggleMainApp = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if ((window as any).electronAPI) {
        if (isMainAppVisible) {
          // 如果主应用窗口显示，则隐藏
          await (window as any).electronAPI.hideMainContent();
          setIsMainAppVisible(false);
        } else {
          // 如果主应用窗口隐藏，则显示
          await (window as any).electronAPI.showMainContent();
          setIsMainAppVisible(true);
        }
      }
    } catch (error) {
      await logger.error(`切换主应用显示状态失败: ${error}`);
    }
  };

  return (
    <motion.div 
      className="floating-control-bar"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Logo 区域 - 点击展开主应用 */}
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <div 
            className="logo-section" 
            onClick={handleLogoClick}
            onMouseEnter={handleLogoMouseEnter}
            onMouseLeave={handleLogoMouseLeave}
          >
            <div className="logo-icon">
              <img 
                src={isLogoHovered ? CueMateLogo2 : CueMateLogo} 
                alt="CueMate" 
                className="logo-image" 
              />
            </div>
          </div>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className="radix-tooltip-content">
            访问 CueMate 网站
            <Tooltip.Arrow className="radix-tooltip-arrow" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>

      {/* 欢迎文字 / 已登录控制栏 */}
      {isLoading ? (
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <motion.div 
              className="welcome-text"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              正在检查登录状态...
            </motion.div>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content className="radix-tooltip-content">
              正在检查登录状态
              <Tooltip.Arrow className="radix-tooltip-arrow" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      ) : isLoggedIn ? (
        <LoggedInControlBar />
      ) : (
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <motion.div 
              className="welcome-text"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <div 
                className="login-prompt clickable"
                onClick={handleLoginPromptClick}
              >
                欢迎使用 CueMate, 请先登录
                <LoadingDots />
              </div>
            </motion.div>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content className="radix-tooltip-content">
              点击此处或右侧按钮打开主应用
              <Tooltip.Arrow className="radix-tooltip-arrow" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      )}

      {/* 悬浮窗口按钮 */}
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button 
            onClick={handleToggleMainApp} 
            className="floating-overlay-btn"
          >
            <motion.div
              whileHover={{ scale: 1.2 }}
              transition={{ duration: 0.2 }}
            >
              <Layout size={18} />
            </motion.div>
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className="radix-tooltip-content">
            {isMainAppVisible ? (
              <>
                关闭主应用窗口，快捷键 <span className="shortcut-key"> ⌘</span> + <span className="shortcut-key">J</span>
              </>
            ) : (
              <>
                打开主应用窗口，快捷键 <span className="shortcut-key"> ⌘</span> + <span className="shortcut-key">J</span>
              </>
            )}
            <Tooltip.Arrow className="radix-tooltip-arrow" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </motion.div>
  );
}
