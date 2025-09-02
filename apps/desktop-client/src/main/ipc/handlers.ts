import { ipcMain, app, shell, dialog } from 'electron';
import { WindowManager } from '../windows/WindowManager.js';
import type { FrontendLogMessage } from '../../shared/types.js';

/**
 * 设置 IPC 通信处理器
 * 替代 Tauri 的 command 系统，处理前端和后端之间的通信
 */
export function setupIPC(windowManager: WindowManager): void {
  console.log('🔌 设置 IPC 通信处理器');

  // === 窗口管理相关 IPC 处理器 ===

  /**
   * 显示浮动窗口
   */
  ipcMain.handle('show-floating-windows', async () => {
    try {
      windowManager.showFloatingWindows();
      console.log('📡 IPC: 显示浮动窗口命令已执行');
      return { success: true };
    } catch (error) {
      console.error('❌ IPC: 显示浮动窗口失败:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 隐藏浮动窗口
   */
  ipcMain.handle('hide-floating-windows', async () => {
    try {
      windowManager.hideFloatingWindows();
      console.log('📡 IPC: 隐藏浮动窗口命令已执行');
      return { success: true };
    } catch (error) {
      console.error('❌ IPC: 隐藏浮动窗口失败:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 切换浮动窗口显示状态
   */
  ipcMain.handle('toggle-floating-windows', async () => {
    try {
      windowManager.toggleFloatingWindows();
      console.log('📡 IPC: 切换浮动窗口命令已执行');
      return { success: true };
    } catch (error) {
      console.error('❌ IPC: 切换浮动窗口失败:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 显示关闭按钮
   */
  ipcMain.handle('show-close-button', async () => {
    try {
      windowManager.showCloseButton();
      console.log('📡 IPC: 显示关闭按钮命令已执行');
      return { success: true };
    } catch (error) {
      console.error('❌ IPC: 显示关闭按钮失败:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 隐藏关闭按钮
   */
  ipcMain.handle('hide-close-button', async () => {
    try {
      windowManager.hideCloseButton();
      console.log('📡 IPC: 隐藏关闭按钮命令已执行');
      return { success: true };
    } catch (error) {
      console.error('❌ IPC: 隐藏关闭按钮失败:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 显示主内容窗口
   */
  ipcMain.handle('show-main-content', async () => {
    try {
      windowManager.showMainContent();
      console.log('📡 IPC: 显示主内容窗口命令已执行');
      return { success: true };
    } catch (error) {
      console.error('❌ IPC: 显示主内容窗口失败:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 隐藏主内容窗口
   */
  ipcMain.handle('hide-main-content', async () => {
    try {
      windowManager.hideMainContent();
      console.log('📡 IPC: 隐藏主内容窗口命令已执行');
      return { success: true };
    } catch (error) {
      console.error('❌ IPC: 隐藏主内容窗口失败:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 切换主内容窗口显示状态
   */
  ipcMain.handle('toggle-main-content', async () => {
    try {
      windowManager.toggleMainContent();
      console.log('📡 IPC: 切换主内容窗口命令已执行');
      return { success: true };
    } catch (error) {
      console.error('❌ IPC: 切换主内容窗口失败:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 获取应用状态
   */
  ipcMain.handle('get-app-state', async () => {
    try {
      const appState = windowManager.getAppState();
      console.log('📡 IPC: 获取应用状态:', appState);
      return { success: true, data: appState };
    } catch (error) {
      console.error('❌ IPC: 获取应用状态失败:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // === 应用控制相关 IPC 处理器 ===

  /**
   * 退出应用
   */
  ipcMain.handle('quit-app', async () => {
    try {
      console.log('📡 IPC: 收到退出应用命令');
      app.quit();
      return { success: true };
    } catch (error) {
      console.error('❌ IPC: 退出应用失败:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 重启应用
   */
  ipcMain.handle('restart-app', async () => {
    try {
      console.log('📡 IPC: 收到重启应用命令');
      app.relaunch();
      app.quit();
      return { success: true };
    } catch (error) {
      console.error('❌ IPC: 重启应用失败:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 获取应用版本信息
   */
  ipcMain.handle('get-app-info', async () => {
    try {
      const appInfo = {
        name: app.getName(),
        version: app.getVersion(),
        platform: process.platform,
        arch: process.arch,
        electronVersion: process.versions.electron,
        nodeVersion: process.versions.node,
        chromeVersion: process.versions.chrome
      };
      console.log('📡 IPC: 获取应用信息:', appInfo);
      return { success: true, data: appInfo };
    } catch (error) {
      console.error('❌ IPC: 获取应用信息失败:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // === 系统交互相关 IPC 处理器 ===

  /**
   * 打开外部链接
   */
  ipcMain.handle('open-external-url', async (_event, url: string) => {
    try {
      console.log('📡 IPC: 打开外部链接:', url);
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      console.error('❌ IPC: 打开外部链接失败:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 显示文件夹选择对话框
   */
  ipcMain.handle('show-folder-dialog', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory', 'createDirectory'],
        title: '选择文件夹'
      });

      console.log('📡 IPC: 文件夹对话框结果:', result);
      return { 
        success: true, 
        data: {
          canceled: result.canceled,
          filePaths: result.filePaths
        }
      };
    } catch (error) {
      console.error('❌ IPC: 文件夹对话框失败:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 显示文件选择对话框
   */
  ipcMain.handle('show-file-dialog', async (_event, options: any = {}) => {
    try {
      const dialogOptions = {
        properties: ['openFile', 'multiSelections'],
        title: '选择文件',
        filters: options.filters || [
          { name: '所有文件', extensions: ['*'] }
        ],
        ...options
      };

      const result = await dialog.showOpenDialog(dialogOptions);
      console.log('📡 IPC: 文件对话框结果:', result);
      
      return { 
        success: true, 
        data: {
          canceled: result.canceled,
          filePaths: result.filePaths
        }
      };
    } catch (error) {
      console.error('❌ IPC: 文件对话框失败:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // === 日志相关 IPC 处理器 ===

  /**
   * 前端日志处理
   */
  ipcMain.handle('frontend-log', async (_event, logMessage: FrontendLogMessage) => {
    try {
      const { level, message, timestamp } = logMessage;
      const time = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString();
      const prefix = `[${time}] [RENDERER] [${level.toUpperCase()}]`;

      switch (level) {
        case 'error':
          console.error(`${prefix} ${message}`);
          break;
        case 'warn':
          console.warn(`${prefix} ${message}`);
          break;
        case 'debug':
          console.debug(`${prefix} ${message}`);
          break;
        case 'info':
        default:
          console.log(`${prefix} ${message}`);
          break;
      }

      return { success: true };
    } catch (error) {
      console.error('❌ IPC: 前端日志处理失败:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // === 鼠标和键盘事件相关 IPC 处理器 ===

  /**
   * 处理控制条鼠标进入事件
   */
  ipcMain.handle('control-bar-mouse-enter', async () => {
    try {
      // 延迟显示关闭按钮，避免误触
      setTimeout(() => {
        windowManager.showCloseButton();
      }, 300);
      console.log('📡 IPC: 控制条鼠标进入事件已处理');
      return { success: true };
    } catch (error) {
      console.error('❌ IPC: 控制条鼠标进入事件处理失败:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 处理控制条鼠标离开事件
   */
  ipcMain.handle('control-bar-mouse-leave', async () => {
    try {
      // 延迟隐藏关闭按钮，给用户时间点击
      setTimeout(() => {
        windowManager.hideCloseButton();
      }, 1000);
      console.log('📡 IPC: 控制条鼠标离开事件已处理');
      return { success: true };
    } catch (error) {
      console.error('❌ IPC: 控制条鼠标离开事件处理失败:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 处理关闭按钮点击事件
   */
  ipcMain.handle('close-button-clicked', async () => {
    try {
      console.log('📡 IPC: 关闭按钮被点击');
      // 隐藏所有浮动窗口
      windowManager.hideFloatingWindows();
      return { success: true };
    } catch (error) {
      console.error('❌ IPC: 关闭按钮点击处理失败:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // === 开发工具相关 IPC 处理器 ===

  /**
   * 打开开发者工具
   */
  ipcMain.handle('open-dev-tools', async (event, windowId?: string) => {
    try {
      if (windowId) {
        // 为指定窗口打开开发者工具（功能暂未实现）
        console.log(`📡 IPC: 尝试为窗口 ${windowId} 打开开发者工具（功能待实现）`);
      } else {
        // 为发送请求的窗口打开开发者工具
        event.sender.openDevTools();
        console.log('📡 IPC: 为当前窗口打开开发者工具');
      }
      return { success: true };
    } catch (error) {
      console.error('❌ IPC: 打开开发者工具失败:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  console.log('✅ IPC 通信处理器设置完成');
}

// 辅助函数已内联，移除未使用的函数