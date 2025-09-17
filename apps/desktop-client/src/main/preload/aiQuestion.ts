import { contextBridge, ipcRenderer } from 'electron';
import type { FrontendLogMessage } from '../../shared/types.js';

/**
 * AI问答窗口预加载脚本
 * 为AI问答窗口的渲染进程安全地暴露主进程 API
 */

// 定义AI问答窗口可用的 API
const aiQuestionAPI = {
  // === 窗口管理 API ===
  showAIQuestion: () => ipcRenderer.invoke('show-ai-question'),
  hideAIQuestion: () => ipcRenderer.invoke('hide-ai-question'),
  toggleAIQuestion: () => ipcRenderer.invoke('toggle-ai-question'),

  // === 用户数据 API ===
  getUserData: () => ipcRenderer.invoke('get-user-data'),

  // === 历史窗口 API ===
  showAIQuestionHistory: () => ipcRenderer.invoke('show-ai-question-history'),

  // === 窗口高度管理 API ===
  setAIWindowHeight: (percentage: number) => ipcRenderer.invoke('set-ai-window-height', percentage),
  getAIWindowHeight: () => ipcRenderer.invoke('get-ai-window-height'),

  // === 模式切换 API ===
  switchToMode: (mode: 'voice-qa' | 'mock-interview' | 'interview-training') =>
    ipcRenderer.invoke('switch-to-mode', mode),

  // === 对话加载 API ===
  loadConversation: (conversationData: any) =>
    ipcRenderer.invoke('load-conversation', conversationData),

  // === 事件监听 API ===
  onLoadConversation: (callback: (conversationData: any) => void) => {
    ipcRenderer.on('load-conversation-data', (_event, data) => callback(data));
  },
  removeLoadConversationListener: () => {
    ipcRenderer.removeAllListeners('load-conversation-data');
  },
  onWindowHeightChanged: (callback: (data: { heightPercentage: number }) => void) => {
    ipcRenderer.on('window-height-changed', (_event, data) => callback(data));
  },
  removeWindowHeightChangedListener: () => {
    ipcRenderer.removeAllListeners('window-height-changed');
  },
  onModeChange: (
    callback: (mode: 'voice-qa' | 'mock-interview' | 'interview-training') => void,
  ) => {
    ipcRenderer.on('mode-change', (_event, mode) => callback(mode));
  },
  removeModeChangeListener: () => {
    ipcRenderer.removeAllListeners('mode-change');
  },

  // === 日志 API ===
  log: (logMessage: FrontendLogMessage) => ipcRenderer.invoke('frontend-log', logMessage),

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
  info: (message: string) => aiQuestionAPI.log({ level: 'info', message, timestamp: Date.now() }),
  warn: (message: string) => aiQuestionAPI.log({ level: 'warn', message, timestamp: Date.now() }),
  error: (message: string) => aiQuestionAPI.log({ level: 'error', message, timestamp: Date.now() }),
  debug: (message: string) => aiQuestionAPI.log({ level: 'debug', message, timestamp: Date.now() }),
};

// 通过 contextBridge 安全地暴露 API
contextBridge.exposeInMainWorld('electronAPI', aiQuestionAPI);
contextBridge.exposeInMainWorld('logger', logger);

// 类型定义（供 TypeScript 使用）
export type AIQuestionAPI = typeof aiQuestionAPI;
export type Logger = typeof logger;
