import { contextBridge, ipcRenderer } from 'electron';
import type { FrontendLogMessage } from '../../shared/types.js';

/**
 * 关闭按钮窗口预加载脚本
 * 为关闭按钮窗口的渲染进程安全地暴露主进程 API
 */

// 定义关闭按钮窗口可用的 API
const closeButtonAPI = {
  // === 按钮交互 API ===
  onClick: () => ipcRenderer.invoke('close-button-clicked'),
  
  // === 窗口管理 API ===
  hideFloatingWindows: () => ipcRenderer.invoke('hide-floating-windows'),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  
  // === 日志 API ===
  log: (logMessage: FrontendLogMessage) => ipcRenderer.invoke('frontend-log', logMessage),

  // === 事件监听 API ===
  on: (channel: string, callback: (...args: any[]) => void) => {
    // 只允许特定的事件频道
    const allowedChannels = [
      'mouse-enter',
      'mouse-leave',
      'button-clicked',
      'set-hover-state',
      'set-pressed-state'
    ];
    
    if (allowedChannels.includes(channel)) {
      ipcRenderer.on(channel, callback);
    } else {
      console.warn(`关闭按钮窗口不允许监听频道: ${channel}`);
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
  platform: process.platform
};

// 日志功能的便捷方法（简化版）
const logger = {
  info: (message: string) => closeButtonAPI.log({ level: 'info', message, timestamp: Date.now() }),
  warn: (message: string) => closeButtonAPI.log({ level: 'warn', message, timestamp: Date.now() }),
  error: (message: string) => closeButtonAPI.log({ level: 'error', message, timestamp: Date.now() }),
  debug: (message: string) => closeButtonAPI.log({ level: 'debug', message, timestamp: Date.now() })
};

// 通过 contextBridge 安全地暴露 API
contextBridge.exposeInMainWorld('electronAPI', closeButtonAPI);
contextBridge.exposeInMainWorld('logger', logger);

// 类型定义（供 TypeScript 使用）
export type CloseButtonAPI = typeof closeButtonAPI;

// 类型声明已移除，使用动态类型

console.log('❌ 关闭按钮窗口预加载脚本已加载');