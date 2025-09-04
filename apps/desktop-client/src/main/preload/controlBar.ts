import { contextBridge, ipcRenderer } from 'electron';
import type { FrontendLogMessage } from '../../shared/types.js';

/**
 * 控制条窗口预加载脚本
 * 为控制条窗口的渲染进程安全地暴露主进程 API
 */

// 定义控制条窗口可用的 API
const controlBarAPI = {
  // === 窗口管理 API ===
  showFloatingWindows: () => ipcRenderer.invoke('show-floating-windows'),
  hideFloatingWindows: () => ipcRenderer.invoke('hide-floating-windows'),
  toggleFloatingWindows: () => ipcRenderer.invoke('toggle-floating-windows'),

  // 关闭按钮状态由组件内部管理，保留接口以兼容现有代码
  showCloseButton: () => ipcRenderer.invoke('show-close-button'),
  hideCloseButton: () => ipcRenderer.invoke('hide-close-button'),

  showMainContent: () => ipcRenderer.invoke('show-main-content'),
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

  // === 登录状态检查 API ===
  checkLoginStatus: () => ipcRenderer.invoke('check-login-status'),

  // === 事件处理 API ===
  onMouseEnter: () => ipcRenderer.invoke('control-bar-mouse-enter'),
  onMouseLeave: () => ipcRenderer.invoke('control-bar-mouse-leave'),

  // === 日志 API ===
  log: (logMessage: FrontendLogMessage) => ipcRenderer.invoke('frontend-log', logMessage),

  // === 开发工具 API ===
  openDevTools: () => ipcRenderer.invoke('open-dev-tools'),

  // === 事件监听 API ===
  on: (channel: string, callback: (...args: any[]) => void) => {
    // 只允许特定的事件频道
    const allowedChannels = [
      'mouse-enter',
      'mouse-leave',
      'position-changed',
      'app-state-changed',
      'shortcut-triggered',
      'login-status-changed', // 添加登录状态变化事件
    ];

    if (allowedChannels.includes(channel)) {
      ipcRenderer.on(channel, callback);
    } else {
      // 预加载脚本中不使用 logger，保持 console.warn
      console.warn(`控制条窗口不允许监听频道: ${channel}`);
    }
  },

  off: (channel: string, callback?: (...args: any[]) => void) => {
    if (callback) {
      ipcRenderer.off(channel, callback);
    } else {
      ipcRenderer.removeAllListeners(channel);
    }
  },

  // === 工具方法 ===
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
};

// 日志功能的便捷方法
const logger = {
  info: (message: string) => controlBarAPI.log({ level: 'info', message, timestamp: Date.now() }),
  warn: (message: string) => controlBarAPI.log({ level: 'warn', message, timestamp: Date.now() }),
  error: (message: string) => controlBarAPI.log({ level: 'error', message, timestamp: Date.now() }),
  debug: (message: string) => controlBarAPI.log({ level: 'debug', message, timestamp: Date.now() }),
};

// 通过 contextBridge 安全地暴露 API
contextBridge.exposeInMainWorld('electronAPI', controlBarAPI);
contextBridge.exposeInMainWorld('logger', logger);

// 类型定义（供 TypeScript 使用）
export type ControlBarAPI = typeof controlBarAPI;
export type Logger = typeof logger;

// 类型声明已移除，使用动态类型

// 预加载脚本中不使用 logger，保持 console.log
console.log('控制条窗口预加载脚本已加载');
