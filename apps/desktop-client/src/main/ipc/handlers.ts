import { app, dialog, ipcMain, shell } from 'electron';
import type { FrontendLogMessage } from '../../shared/types.js';
import { logger } from '../../utils/logger.js';
import { WindowManager } from '../windows/WindowManager.js';

/**
 * 设置 IPC 通信处理器
 * 替代 Tauri 的 command 系统，处理前端和后端之间的通信
 */
export function setupIPC(windowManager: WindowManager): void {
  logger.info('设置 IPC 通信处理器');

  // === 窗口管理相关 IPC 处理器 ===

  /**
   * 显示浮动窗口
   */
  ipcMain.handle('show-floating-windows', async () => {
    try {
      windowManager.showFloatingWindows();
      logger.info('IPC: 显示浮动窗口命令已执行');
      return { success: true };
    } catch (error) {
      logger.error({ error }, 'IPC: 显示浮动窗口失败');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 隐藏浮动窗口
   */
  ipcMain.handle('hide-floating-windows', async () => {
    try {
      windowManager.hideFloatingWindows();
      logger.info('IPC: 隐藏浮动窗口命令已执行');
      return { success: true };
    } catch (error) {
      logger.error({ error }, 'IPC: 隐藏浮动窗口失败');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 切换浮动窗口显示状态
   */
  ipcMain.handle('toggle-floating-windows', async () => {
    try {
      windowManager.toggleFloatingWindows();
      logger.info('IPC: 切换浮动窗口命令已执行');
      return { success: true };
    } catch (error) {
      logger.error({ error }, 'IPC: 切换浮动窗口失败');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 显示关闭按钮 - 已集成到控制条组件中
   */
  ipcMain.handle('show-close-button', async () => {
    try {
      // 关闭按钮现在由控制条组件内部管理，保留接口以兼容
      windowManager.showCloseButton();
      logger.info('IPC: 显示关闭按钮状态已更新（已集成到控制条）');
      return { success: true };
    } catch (error) {
      logger.error({ error }, 'IPC: 显示关闭按钮状态更新失败');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 隐藏关闭按钮 - 已集成到控制条组件中
   */
  ipcMain.handle('hide-close-button', async () => {
    try {
      // 关闭按钮现在由控制条组件内部管理，保留接口以兼容
      windowManager.hideCloseButton();
      logger.info('IPC: 隐藏关闭按钮状态已更新（已集成到控制条）');
      return { success: true };
    } catch (error) {
      logger.error({ error }, 'IPC: 隐藏关闭按钮状态更新失败');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 显示主内容窗口
   */
  ipcMain.handle('show-main-content', async () => {
    try {
      windowManager.showMainContent();
      logger.info('IPC: 显示主内容窗口命令已执行');
      return { success: true };
    } catch (error) {
      logger.error({ error }, 'IPC: 显示主内容窗口失败');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 隐藏主内容窗口
   */
  ipcMain.handle('hide-main-content', async () => {
    try {
      windowManager.hideMainContent();
      logger.info('IPC: 隐藏主内容窗口命令已执行');
      return { success: true };
    } catch (error) {
      logger.error({ error }, 'IPC: 隐藏主内容窗口失败');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 切换主内容窗口显示状态
   */
  ipcMain.handle('toggle-main-content', async () => {
    try {
      windowManager.toggleMainContent();
      logger.info('IPC: 切换主内容窗口命令已执行');
      return { success: true };
    } catch (error) {
      logger.error({ error }, 'IPC: 切换主内容窗口失败');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 获取应用状态
   */
  ipcMain.handle('get-app-state', async () => {
    try {
      const appState = windowManager.getAppState();
      logger.info({ appState }, 'IPC: 获取应用状态');
      return { success: true, data: appState };
    } catch (error) {
      logger.error({ error }, 'IPC: 获取应用状态失败');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // === 应用控制相关 IPC 处理器 ===

  /**
   * 退出应用
   */
  ipcMain.handle('quit-app', async () => {
    try {
      logger.info('IPC: 收到退出应用命令');
      app.quit();
      return { success: true };
    } catch (error) {
      logger.error({ error }, 'IPC: 退出应用失败');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  /**
   * 重启应用
   */
  ipcMain.handle('restart-app', async () => {
    try {
      logger.info('IPC: 收到重启应用命令');
      app.relaunch();
      app.quit();
      return { success: true };
    } catch (error) {
      logger.error({ error }, 'IPC: 重启应用失败');
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
        chromeVersion: process.versions.chrome,
      };
      logger.info({ appInfo }, 'IPC: 获取应用信息');
      return { success: true, data: appInfo };
    } catch (error) {
      logger.error({ error }, 'IPC: 获取应用信息失败');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // === 系统交互相关 IPC 处理器 ===

  /**
   * 打开外部链接
   */
  ipcMain.handle('open-external-url', async (_event, url: string) => {
    try {
      logger.info({ url }, 'IPC: 打开外部链接');
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      logger.error({ error }, 'IPC: 打开外部链接失败');
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
        title: '选择文件夹',
      });

      logger.info({ result }, 'IPC: 文件夹对话框结果');
      return {
        success: true,
        data: {
          canceled: result.canceled,
          filePaths: result.filePaths,
        },
      };
    } catch (error) {
      logger.error({ error }, 'IPC: 文件夹对话框失败');
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
        filters: options.filters || [{ name: '所有文件', extensions: ['*'] }],
        ...options,
      };

      const result = await dialog.showOpenDialog(dialogOptions);
      logger.info({ result }, 'IPC: 文件对话框结果');

      return {
        success: true,
        data: {
          canceled: result.canceled,
          filePaths: result.filePaths,
        },
      };
    } catch (error) {
      logger.error({ error }, 'IPC: 文件对话框失败');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // === 日志相关 IPC 处理器 ===

  /**
   * 检查用户登录状态
   */
  ipcMain.handle('check-login-status', async () => {
    try {
      logger.info('IPC: 检查用户登录状态');

      // 调用 web-api 检查登录状态
      const response = await fetch('http://localhost:3001/auth/login-status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // 设置较短的超时时间，避免长时间等待
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data = await response.json();
        logger.info({ user: data.user }, 'IPC: 用户已登录');
        return {
          success: true,
          isLoggedIn: data.isLoggedIn,
          user: data.user,
        };
      } else if (response.status === 401) {
        logger.info('IPC: 用户未登录');
        return {
          success: true,
          isLoggedIn: false,
        };
      } else {
        logger.warn({ status: response.status }, 'IPC: 登录检查返回异常状态码');
        return {
          success: true,
          isLoggedIn: false,
        };
      }
    } catch (error) {
      logger.error({ error }, 'IPC: 登录状态检查失败');
      return {
        success: false,
        isLoggedIn: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

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
          logger.error(`${prefix} ${message}`);
          break;
        case 'warn':
          logger.warn(`${prefix} ${message}`);
          break;
        case 'debug':
          logger.debug(`${prefix} ${message}`);
          break;
        case 'info':
        default:
          logger.info(`${prefix} ${message}`);
          break;
      }

      return { success: true };
    } catch (error) {
      logger.error({ error }, 'IPC: 前端日志处理失败');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // === 鼠标和键盘事件相关 IPC 处理器 ===

  /**
   * 处理关闭按钮点击事件 - 现在由集成的控制条组件处理
   */
  ipcMain.handle('close-button-clicked', async () => {
    try {
      logger.info('IPC: 关闭按钮被点击');
      // 隐藏所有浮动窗口
      windowManager.hideFloatingWindows();
      return { success: true };
    } catch (error) {
      logger.error({ error }, 'IPC: 关闭按钮点击处理失败');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // 移除了单独的控制条鼠标事件处理，现在由集成的组件内部处理

  // === 开发工具相关 IPC 处理器 ===

  /**
   * 打开开发者工具
   */
  ipcMain.handle('open-dev-tools', async (event, windowId?: string) => {
    try {
      if (windowId) {
        // 为指定窗口打开开发者工具（功能暂未实现）
        logger.info({ windowId }, 'IPC: 尝试为窗口打开开发者工具（功能待实现）');
      } else {
        // 为发送请求的窗口打开开发者工具
        event.sender.openDevTools();
        logger.info('IPC: 为当前窗口打开开发者工具');
      }
      return { success: true };
    } catch (error) {
      logger.error({ error }, 'IPC: 打开开发者工具失败');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  logger.info('IPC 通信处理器设置完成');
}

// 辅助函数已内联，移除未使用的函数
