import { app, globalShortcut } from 'electron';
import type { LogLevel } from '../shared/types.js';
import { logger } from '../utils/logger.js';
import { setupIPC } from './ipc/handlers.js';
import { getAppIconPath } from './utils/paths.js';
import { setupGlobalShortcuts } from './utils/shortcuts.js';
import { WindowManager } from './windows/WindowManager.js';

class CueMateApp {
  private windowManager: WindowManager;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    logger.info(`运行模式: ${this.isDevelopment ? '开发模式' : '生产模式'}`);
    this.windowManager = new WindowManager(this.isDevelopment);

    this.initialize();
  }

  private initialize(): void {
    logger.info('CueMate Desktop Client 启动');

    // 设置应用程序事件监听器
    this.setupAppEvents();

    // 设置 IPC 通信
    setupIPC(this.windowManager);
  }

  private setupAppEvents(): void {
    // 当应用准备就绪时
    app.whenReady().then(() => {
      logger.info('应用已准备就绪，开始初始化窗口管理器');

      // 设置应用图标
      try {
        const iconPath = getAppIconPath();
        logger.info({ iconPath }, '应用图标路径');

        // 在 macOS 上设置 Dock 图标
        if (process.platform === 'darwin') {
          app.dock.setIcon(iconPath);
          logger.info('macOS Dock 图标已设置');
        }
      } catch (error) {
        logger.warn({ error }, '设置应用图标失败');
      }

      // 设置全局快捷键（必须在app ready之后）
      setupGlobalShortcuts(this.windowManager);

      // 初始化窗口管理器
      this.windowManager
        .initialize()
        .then(() => {
          logger.info('窗口管理器初始化完成');
        })
        .catch((error) => {
          logger.error('窗口管理器初始化失败:', error);
        });

      // macOS: 当点击 dock 图标时重新激活
      app.on('activate', () => {
        logger.info('应用被重新激活 (Dock 图标点击)');
        this.windowManager.showFloatingWindows();
      });
    });

    // 当所有窗口关闭时
    app.on('window-all-closed', () => {
      logger.info('所有窗口已关闭');
      // macOS: 通常应用不会完全退出
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    // 当应用即将退出时
    app.on('before-quit', () => {
      logger.info('应用准备退出');

      // 清理资源
      this.cleanup();
    });

    // 处理第二个实例启动
    app.on('second-instance', () => {
      logger.info('检测到第二个实例，激活现有应用');
      this.windowManager.showFloatingWindows();
    });

    // macOS: 处理重新打开事件
    app.on('open-url', (event, url) => {
      logger.info({ url }, '处理 URL');
      event.preventDefault();
      // 处理自定义 URL scheme
    });

    // 处理证书错误（开发环境）
    if (this.isDevelopment) {
      app.on('certificate-error', (event, _webContents, _url, _error, _certificate, callback) => {
        event.preventDefault();
        callback(true);
      });
    }
  }

  private cleanup(): void {
    logger.info('清理应用资源');

    // macOS: 确保 Dock 图标保持正确直到应用完全退出
    if (process.platform === 'darwin') {
      try {
        const iconPath = getAppIconPath();
        app.dock.setIcon(iconPath);
        logger.info('Dock 图标在退出前已确认设置');
      } catch (error) {
        logger.warn({ error }, '退出前设置 Dock 图标失败');
      }
    }

    // 注销所有全局快捷键
    globalShortcut.unregisterAll();

    // 清理窗口管理器
    this.windowManager.destroy();
  }

  // 日志方法（供 IPC 使用）
  public log(level: LogLevel, message: string): void {
    switch (level) {
      case 'error':
        logger.error(message);
        break;
      case 'warn':
        logger.warn(message);
        break;
      case 'debug':
        if (this.isDevelopment) {
          logger.debug(message);
        }
        break;
      case 'info':
      default:
        logger.info(message);
        break;
    }
  }
}

// 确保只有一个应用实例运行
if (!app.requestSingleInstanceLock()) {
  logger.info('应用已在运行，退出当前实例');
  app.quit();
} else {
  // 创建应用实例
  const cueMateApp = new CueMateApp();

  // 导出应用实例供 IPC 使用
  (global as any).cueMateApp = cueMateApp;
}

// 禁用安全警告（开发环境）
if (process.env.NODE_ENV === 'development') {
  process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  logger.error({ error }, '未捕获的异常');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, '未处理的 Promise 拒绝');
});
