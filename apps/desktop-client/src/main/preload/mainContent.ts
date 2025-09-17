import { contextBridge, ipcRenderer } from 'electron';

/**
 * 主内容窗口预加载脚本
 * 为主内容窗口的渲染进程安全地暴露主进程 API
 */

// 定义主内容窗口可用的 API
const mainContentAPI = {
  // === 窗口事件监听 API ===
  on: (channel: string, callback: (...args: any[]) => void) => {
    // 只允许特定的事件频道
    const allowedChannels = [
      'window-resized',
      'window-moved',
      'window-maximized',
      'window-minimized',
      'switch-to-circle-mode',
      'switch-to-normal-mode',
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

  // === 圆形模式切换 API ===
  onSwitchToCircleMode: (callback: (data: { circleSize: number }) => void) => {
    ipcRenderer.on('switch-to-circle-mode', (_event, data) => callback(data));
  },

  onSwitchToNormalMode: (callback: () => void) => {
    ipcRenderer.on('switch-to-normal-mode', () => callback());
  },

  // === 窗口控制 API ===
  toggleFloatingWindows: () => {
    ipcRenderer.send('toggle-floating-windows');
  },
};

// 通过 contextBridge 安全地暴露 API
contextBridge.exposeInMainWorld('electronAPI', mainContentAPI);

// 类型定义（供 TypeScript 使用）
export type MainContentAPI = typeof mainContentAPI;
