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
  hideMainContent: () => ipcRenderer.invoke('hide-main-content'),
  toggleMainContent: () => ipcRenderer.invoke('toggle-main-content'),

  showAIQuestion: () => ipcRenderer.invoke('show-ai-question'),
  hideAIQuestion: () => ipcRenderer.invoke('hide-ai-question'),
  toggleAIQuestion: () => ipcRenderer.invoke('toggle-ai-question'),

  toggleAIQuestionHistory: () => ipcRenderer.invoke('toggle-ai-question-history'),

  showInterviewer: () => ipcRenderer.invoke('show-interviewer'),
  hideInterviewer: () => ipcRenderer.invoke('hide-interviewer'),
  toggleInterviewer: () => ipcRenderer.invoke('toggle-interviewer'),

  // === 模式切换 API ===
  switchToMode: (mode: 'voice-qa' | 'mock-interview' | 'interview-training') =>
    ipcRenderer.invoke('switch-to-mode', mode),

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

  // === 圆形模式事件监听 ===
  onSwitchToCircleMode: (callback: (data: { circleSize: number }) => void) => {
    ipcRenderer.on('switch-to-circle-mode', (_event, data) => callback(data));
  },

  onSwitchToNormalMode: (callback: () => void) => {
    ipcRenderer.on('switch-to-normal-mode', (_event) => callback());
  },

  // === 事件监听 API ===
  on: (channel: string, callback: (...args: any[]) => void) => {
    // 只允许特定的事件频道
    const allowedChannels = [
      'mouse-enter',
      'mouse-leave',
      'position-changed',
      'app-state-changed',
      'shortcut-triggered',
      'websocket-login-success', // WebSocket 登录成功事件
      'websocket-logout', // WebSocket 登出事件
      'switch-to-circle-mode', // 圆形模式切换
      'switch-to-normal-mode', // 正常模式切换
      'ask-ai-button-disabled', // 提问AI按钮禁用状态
    ];

    if (allowedChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args));
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
