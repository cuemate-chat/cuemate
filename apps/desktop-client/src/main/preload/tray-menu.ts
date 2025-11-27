import { contextBridge, ipcRenderer } from 'electron';

/**
 * 托盘菜单窗口预加载脚本
 * 为托盘菜单渲染进程安全地暴露主进程 API
 */

// 定义托盘菜单窗口可用的 API
const trayMenuAPI = {
  // 获取用户数据（包含 token）
  getUserData: () => ipcRenderer.invoke('get-user-data'),

  // 获取用户统计数据
  getUserStats: async () => {
    return await ipcRenderer.invoke('get-user-stats');
  },

  // 获取应用状态
  getAppState: async () => {
    return await ipcRenderer.invoke('get-app-state');
  },

  // 显示应用
  showApp: async () => {
    await ipcRenderer.invoke('show-app');
  },

  // 隐藏应用
  hideApp: async () => {
    await ipcRenderer.invoke('hide-app');
  },

  // 设置交互模式
  setInteractiveMode: async () => {
    await ipcRenderer.invoke('set-interactive-mode');
  },

  // 设置穿透模式
  setClickThroughMode: async () => {
    await ipcRenderer.invoke('set-click-through-mode');
  },

  // 退出应用
  quitApp: async () => {
    await ipcRenderer.invoke('quit-app');
  },

  // 获取 Dock 图标显示状态
  getDockIconVisible: async () => {
    return await ipcRenderer.invoke('get-dock-icon-visible');
  },

  // 设置 Dock 图标显示状态
  setDockIconVisible: async (visible: boolean) => {
    return await ipcRenderer.invoke('set-dock-icon-visible', visible);
  },

  // 获取 Docker 退出时是否关闭设置
  getStopDockerOnQuit: async () => {
    return await ipcRenderer.invoke('get-stop-docker-on-quit');
  },

  // 设置 Docker 退出时是否关闭
  setStopDockerOnQuit: async (stop: boolean) => {
    return await ipcRenderer.invoke('set-stop-docker-on-quit', stop);
  },

  // 监听点击穿透模式变化
  onClickThroughChanged: (callback: (enabled: boolean) => void) => {
    const handler = (_e: any, enabled: boolean) => callback(enabled);
    ipcRenderer.on('click-through-changed', handler);
    return () => ipcRenderer.off('click-through-changed', handler);
  },

  // 监听应用显示/隐藏状态变化
  onAppVisibilityChanged: (callback: (visible: boolean) => void) => {
    const handler = (_e: any, visible: boolean) => callback(visible);
    ipcRenderer.on('app-visibility-changed', handler);
    return () => ipcRenderer.off('app-visibility-changed', handler);
  },

  // 监听设置变更事件（主窗口修改设置后通知托盘菜单刷新）
  onSettingsChanged: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('settings-changed', handler);
    return () => ipcRenderer.off('settings-changed', handler);
  },

  // 监听托盘菜单显示事件
  onTrayMenuShown: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('tray-menu-shown', handler);
    return () => ipcRenderer.off('tray-menu-shown', handler);
  },
};

// 通过 contextBridge 安全地暴露 API
contextBridge.exposeInMainWorld('electronAPI', trayMenuAPI);

// 类型定义（供 TypeScript 使用）
export type TrayMenuAPI = typeof trayMenuAPI;
