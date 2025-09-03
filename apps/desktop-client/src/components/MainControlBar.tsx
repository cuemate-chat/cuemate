import * as Tooltip from '@radix-ui/react-tooltip';
import { motion } from 'framer-motion';
import { Layout } from 'lucide-react';
import { useEffect, useState } from 'react';
import CueMateLogo from '../assets/CueMate.png';
import CueMateLogo2 from '../assets/CueMate2.png';

// 日志工具函数 - 使用 Electron IPC
const log = async (level: 'info' | 'warn' | 'error' | 'debug', message: string) => {
  try {
    if ((window as any).electronAPI) {
      await (window as any).electronAPI.log({ level, message });
    }
  } catch (error) {
    // 如果日志命令失败，静默处理
    console.warn('日志发送失败:', error);
  }
};

interface MainControlBarProps {
  // 移除未使用的参数
}

export function MainControlBar({}: MainControlBarProps) {
  const [isLogoHovered, setIsLogoHovered] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 检查登录状态
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        if ((window as any).electronAPI) {
          const result = await (window as any).electronAPI.checkLoginStatus();
          if (result.success) {
            setIsLoggedIn(result.isLoggedIn);
          } else {
            await log('error', `登录状态检查失败: ${result.error}`);
          }
        }
      } catch (error) {
        await log('error', `登录状态检查异常: ${error}`);
      } finally {
        setIsLoading(false);
      }
    };

    checkLoginStatus();
  }, []);

  // 监听登录状态变化事件
  useEffect(() => {
    const handleLoginStatusChanged = (data: { isLoggedIn: boolean; user?: any }) => {
      setIsLoggedIn(data.isLoggedIn);
      setIsLoading(false);
      log('info', `登录状态已更新: ${data.isLoggedIn ? '已登录' : '未登录'}`);
    };

    // 监听登录状态变化事件
    if ((window as any).electronAPI && (window as any).electronAPI.on) {
      (window as any).electronAPI.on('login-status-changed', handleLoginStatusChanged);
    }

    // 清理监听器
    return () => {
      if ((window as any).electronAPI && (window as any).electronAPI.off) {
        (window as any).electronAPI.off('login-status-changed', handleLoginStatusChanged);
      }
    };
  }, []);

  // 处理 logo 点击事件 - 跳转到帮助文档
  const handleLogoClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if ((window as any).electronAPI && 'openExternalUrl' in (window as any).electronAPI) {
        await ((window as any).electronAPI as any).openExternalUrl('https://cuemate.chat');
      }
    } catch (error) {
      await log('error', `打开链接失败: ${error}`);
    }
  };

  // 处理 logo 悬浮事件
  const handleLogoMouseEnter = () => {
    setIsLogoHovered(true);
  };

  const handleLogoMouseLeave = () => {
    setIsLogoHovered(false);
  };

  const openMainApp = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if ((window as any).electronAPI) {
        await (window as any).electronAPI.showMainContent();
        await log('info', '主应用窗口已显示');
      }
    } catch (error) {
      await log('error', `显示主应用失败: ${error}`);
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
            访问 CueMate 官网
            <Tooltip.Arrow className="radix-tooltip-arrow" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>

      {/* 欢迎文字 */}
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <motion.div 
            className="welcome-text"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            {isLoading ? (
              '正在检查登录状态...'
            ) : isLoggedIn ? (
              `已登录，欢迎使用 CueMate`
            ) : (
              '欢迎使用 CueMate, 请先登录'
            )}
          </motion.div>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className="radix-tooltip-content">
            点击右侧按钮打开主应用
            <Tooltip.Arrow className="radix-tooltip-arrow" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>

      {/* 悬浮窗口按钮 */}
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button 
            onClick={openMainApp} 
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
            打开主应用窗口，快捷键 <span className="shortcut-key"> ⌘</span> + <span className="shortcut-key">J</span>
            <Tooltip.Arrow className="radix-tooltip-arrow" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </motion.div>
  );
}
