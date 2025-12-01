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
  getUserData: () => ipcRenderer.invoke('get-user-data'),

  // === interviewId 持久化 API ===
  interviewId: {
    get: () => ipcRenderer.invoke('interview-id-get'),
    set: (interviewId: string | null) => ipcRenderer.invoke('interview-id-set', interviewId),
    clear: () => ipcRenderer.invoke('interview-id-clear'),
  },

  // === 隐身模式（内容保护）API ===
  visibility: {
    get: () => ipcRenderer.invoke('visibility-get'),
    set: (enabled: boolean) => ipcRenderer.invoke('visibility-set', enabled),
    onChanged: (callback: (enabled: boolean) => void) => {
      ipcRenderer.on('stealth-mode-changed', (_e, enabled) => callback(enabled));
      return () => ipcRenderer.removeAllListeners('stealth-mode-changed');
    },
  },

  // === 点击穿透模式 API ===
  clickThrough: {
    get: () => ipcRenderer.invoke('click-through-get'),
    set: (enabled: boolean) => ipcRenderer.invoke('click-through-set', enabled),
    onChanged: (callback: (enabled: boolean) => void) => {
      const handler = (_e: any, enabled: boolean) => callback(enabled);
      ipcRenderer.on('click-through-changed', handler);
      return () => ipcRenderer.off('click-through-changed', handler);
    },
  },

  // === 事件处理 API ===
  onMouseEnter: () => ipcRenderer.invoke('control-bar-mouse-enter'),
  onMouseLeave: () => ipcRenderer.invoke('control-bar-mouse-leave'),

  // === 日志 API ===
  log: (logMessage: FrontendLogMessage) => ipcRenderer.invoke('frontend-log', logMessage),

  // === ASR 配置 API ===
  asrConfig: {
    get: () => ipcRenderer.invoke('asr-config-get'),
    updateDevices: (partial: {
      microphone_device_id?: string;
      microphone_device_name?: string;
      speaker_device_id?: string;
      speaker_device_name?: string;
    }) => ipcRenderer.invoke('asr-config-update-devices', partial),
    onChanged: (callback: (config: any) => void) => {
      ipcRenderer.on('asr-config-changed', (_event, config) => callback(config));
      return () => ipcRenderer.removeAllListeners('asr-config-changed');
    },
  },

  // === 音频文件保存 API ===
  saveAudioFile: (audioData: Uint8Array, fileName: string) =>
    ipcRenderer.invoke('save-audio-file', audioData, fileName),

  // === 开发工具 API ===
  openDevTools: () => ipcRenderer.invoke('open-dev-tools'),

  // === 面试 IPC API ===
  interview: {
    // 注册为控制栏窗口
    registerWindow: () => ipcRenderer.send('interview:register-window', 'control-bar'),
    // 注销窗口
    unregisterWindow: () => ipcRenderer.send('interview:unregister-window'),
    // 发送面试事件
    sendInterviewEvent: (event: string, data?: any) =>
      ipcRenderer.send(`interview:${event}`, data),
    // 监听面试事件
    onInterviewEvent: (event: string, callback: (data: any) => void) => {
      ipcRenderer.on(`interview:${event}`, (_event, data) => callback(data));
      return () => ipcRenderer.removeAllListeners(`interview:${event}`);
    },
    // 获取当前面试状态
    getCurrentState: () => ipcRenderer.invoke('interview:get-current-state'),
    // 设置当前面试状态
    setCurrentState: (state: any) => ipcRenderer.send('interview:set-current-state', state),
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
      'ask-ai-button-disabled', // 提问 AI 按钮禁用状态
      'main-app-show', // 主应用显示事件
      'main-app-hide', // 主应用隐藏事件
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
