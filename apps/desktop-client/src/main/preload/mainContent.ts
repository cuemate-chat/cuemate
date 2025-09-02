import { contextBridge, ipcRenderer } from 'electron';
import type { FrontendLogMessage } from '../../shared/types.js';

/**
 * 主内容窗口预加载脚本
 * 为主内容窗口的渲染进程安全地暴露主进程 API
 */

// 定义主内容窗口可用的 API（最完整的API集合）
const mainContentAPI = {
  // === 窗口管理 API ===
  showFloatingWindows: () => ipcRenderer.invoke('show-floating-windows'),
  hideFloatingWindows: () => ipcRenderer.invoke('hide-floating-windows'),
  toggleFloatingWindows: () => ipcRenderer.invoke('toggle-floating-windows'),
  
  showCloseButton: () => ipcRenderer.invoke('show-close-button'),
  hideCloseButton: () => ipcRenderer.invoke('hide-close-button'),
  
  showMainContent: () => ipcRenderer.invoke('show-main-content'),
  hideMainContent: () => ipcRenderer.invoke('hide-main-content'),
  toggleMainContent: () => ipcRenderer.invoke('toggle-main-content'),
  
  getAppState: () => ipcRenderer.invoke('get-app-state'),

  // === 系统交互 API ===
  openExternalUrl: (url: string) => ipcRenderer.invoke('open-external-url', url),
  showFileDialog: (options?: any) => ipcRenderer.invoke('show-file-dialog', options),
  showFolderDialog: () => ipcRenderer.invoke('show-folder-dialog'),

  // === 应用控制 API ===
  quitApp: () => ipcRenderer.invoke('quit-app'),
  restartApp: () => ipcRenderer.invoke('restart-app'),
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),

  // === 日志 API ===
  log: (logMessage: FrontendLogMessage) => ipcRenderer.invoke('frontend-log', logMessage),

  // === 开发工具 API ===
  openDevTools: (windowId?: string) => ipcRenderer.invoke('open-dev-tools', windowId),

  // === 事件监听 API ===
  on: (channel: string, callback: (...args: any[]) => void) => {
    // 主内容窗口允许监听更多事件频道
    const allowedChannels = [
      'window-resized',
      'window-moved',
      'window-maximized',
      'window-minimized',
      'window-restored',
      'app-state-changed',
      'shortcut-triggered',
      'theme-changed',
      'data-updated'
    ];
    
    if (allowedChannels.includes(channel)) {
      ipcRenderer.on(channel, callback);
    } else {
      console.warn(`主内容窗口不允许监听频道: ${channel}`);
    }
  },

  off: (channel: string, callback?: (...args: any[]) => void) => {
    if (callback) {
      ipcRenderer.off(channel, callback);
    } else {
      ipcRenderer.removeAllListeners(channel);
    }
  },

  // === 数据持久化 API（未来扩展）===
  // 这里可以添加文件操作、数据库操作等 API
  // saveData: (data: any) => ipcRenderer.invoke('save-data', data),
  // loadData: () => ipcRenderer.invoke('load-data'),

  // === 工具方法 ===
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  },
  
  // === 主题相关 API ===
  getTheme: () => {
    // 检测系统主题
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  },
  
  onThemeChange: (callback: (theme: 'light' | 'dark') => void) => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => callback(mediaQuery.matches ? 'dark' : 'light');
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }
};

// 日志功能的便捷方法（完整版）
const logger = {
  info: (message: string) => mainContentAPI.log({ level: 'info', message, timestamp: Date.now() }),
  warn: (message: string) => mainContentAPI.log({ level: 'warn', message, timestamp: Date.now() }),
  error: (message: string) => mainContentAPI.log({ level: 'error', message, timestamp: Date.now() }),
  debug: (message: string) => mainContentAPI.log({ level: 'debug', message, timestamp: Date.now() }),
  
  // 结构化日志方法
  logWithContext: (level: 'info' | 'warn' | 'error' | 'debug', message: string, context?: any) => {
    const logMessage = context 
      ? `${message} | Context: ${JSON.stringify(context)}`
      : message;
    return mainContentAPI.log({ level, message: logMessage, timestamp: Date.now() });
  }
};

// 实用工具集合
const utils = {
  // 复制到剪贴板
  copyToClipboard: async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      logger.info(`文本已复制到剪贴板: ${text.substring(0, 50)}...`);
      return true;
    } catch (error) {
      logger.error(`复制到剪贴板失败: ${error}`);
      return false;
    }
  },
  
  // 从剪贴板读取
  readFromClipboard: async () => {
    try {
      const text = await navigator.clipboard.readText();
      logger.debug('从剪贴板读取文本成功');
      return text;
    } catch (error) {
      logger.error(`从剪贴板读取失败: ${error}`);
      return null;
    }
  },
  
  // 格式化字节大小
  formatBytes: (bytes: number, decimals: number = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  },
  
  // 防抖函数
  debounce: <T extends (...args: any[]) => any>(func: T, wait: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(null, args), wait);
    };
  },
  
  // 节流函数
  throttle: <T extends (...args: any[]) => any>(func: T, limit: number) => {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func.apply(null, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
};

// 通过 contextBridge 安全地暴露 API
contextBridge.exposeInMainWorld('electronAPI', mainContentAPI);
contextBridge.exposeInMainWorld('logger', logger);
contextBridge.exposeInMainWorld('utils', utils);

// 类型定义（供 TypeScript 使用）
export type MainContentAPI = typeof mainContentAPI;
export type Logger = typeof logger;
export type Utils = typeof utils;

// 类型声明已移除，使用动态类型

// 初始化日志
console.log('📱 主内容窗口预加载脚本已加载');
logger.info('主内容窗口预加载脚本初始化完成');