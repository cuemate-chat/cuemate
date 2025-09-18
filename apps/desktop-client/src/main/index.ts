import { execSync } from 'child_process';
import { app, globalShortcut, Menu, nativeImage, Tray } from 'electron';
import type { LogLevel } from '../shared/types.js';
import { logger } from '../utils/logger.js';
import { setupIPC } from './ipc/handlers.js';
import { getAppIconPath } from './utils/paths.js';
import { setupGlobalShortcuts } from './utils/shortcuts.js';
import { WindowManager } from './windows/WindowManager.js';

// 在应用启动前设置应用名称和图标
app.setName('CueMate');

class CueMateApp {
  private windowManager: WindowManager;
  private isDevelopment: boolean;
  private tray: Tray | null = null;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';

    // 设置日志环境变量
    this.setupLoggingEnvironment();

    logger.info(`运行模式: ${this.isDevelopment ? '开发模式' : '生产模式'}`);
    this.windowManager = new WindowManager(this.isDevelopment);

    this.initialize();
  }

  private setupLoggingEnvironment(): void {
    // 设置日志级别
    if (!process.env.LOG_LEVEL) {
      process.env.LOG_LEVEL = this.isDevelopment ? 'debug' : 'info';
    }

    // 设置时区
    if (!process.env.CUEMATE_LOG_TZ && !process.env.TZ) {
      process.env.TZ = 'Asia/Shanghai';
    }

    logger.info('日志环境配置完成', {
      logLevel: process.env.LOG_LEVEL,
      timezone: process.env.CUEMATE_LOG_TZ || process.env.TZ,
      userDataPath: app?.getPath('userData'),
    });
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

      // 设置应用图标 & 确保 Dock 常驻
      try {
        const iconPath = getAppIconPath();
        logger.info({ iconPath }, '应用图标路径');

        // 在 macOS 上隐藏 Dock 图标但保留菜单栏
        if (process.platform === 'darwin') {
          // 保持regular模式以确保菜单栏显示，只隐藏dock图标
          app.dock.hide();
          logger.info('已隐藏 dock 图标，应用菜单栏保持可用');
        }

        // 创建菜单栏图标（任务栏图标）
        this.createTrayIcon();
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

      // macOS: 当点击 dock 图标时重新激活（虽然 dock 图标已隐藏，但保留处理逻辑）
      app.on('activate', () => {
        this.windowManager.showFloatingWindows();
        // 在 accessory 模式下，确保应用能够正确激活和聚焦
        if (process.platform === 'darwin') {
          app.focus({ steal: true });
        }
      });

      // macOS: 监听 Dock 图标右键菜单的退出选项
      if (process.platform === 'darwin') {
        app.on('will-quit', () => {
          logger.info('应用将要退出 (用户主动退出)');

          // 在开发模式下，立即停止开发服务
          if (this.isDevelopment) {
            try {
              logger.info('正在停止开发服务...');
              // 同步执行停止命令
              const commands = [
                "pkill -f 'pnpm.*dev' || true",
                "pkill -f 'vite' || true",
                "pkill -f 'esbuild' || true",
              ];

              commands.forEach((cmd) => {
                try {
                  execSync(cmd);
                  logger.info(`执行停止命令: ${cmd}`);
                } catch (error) {
                  // pkill 找不到进程时会报错，这是正常的
                  logger.debug(`停止命令结果: ${cmd} - ${(error as Error).message}`);
                }
              });

              logger.info('开发服务已停止');
            } catch (error) {
              logger.warn({ error }, '停止开发服务时出错');
            }
          }
        });
      }
    });

    // 当所有窗口关闭时
    app.on('window-all-closed', () => {
      logger.info('所有窗口已关闭');
      // 在所有平台上都退出应用，包括 macOS
      app.quit();
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

  /**
   * 创建菜单栏图标（任务栏图标）
   */
  private createTrayIcon(): void {
    try {
      const iconPath = getAppIconPath();
      logger.info({ iconPath }, '创建菜单栏图标，图标路径');

      const image = nativeImage.createFromPath(iconPath);
      logger.info({ isEmpty: image.isEmpty(), size: image.getSize() }, '图标加载结果');

      if (image.isEmpty()) {
        logger.error('图标为空，无法创建菜单栏图标');
        return;
      }

      // 调整图标大小适合菜单栏（macOS 推荐 16x16 或 22x22）
      const resizedImage = image.resize({ width: 22, height: 22 });

      this.tray = new Tray(resizedImage);
      this.tray.setToolTip('CueMate - 智能语音面试助手');

      // 创建菜单
      const contextMenu = Menu.buildFromTemplate([
        {
          label: '显示应用',
          click: () => {
            this.windowManager.showFloatingWindows();
            // 在 macOS 上确保应用能够正确激活
            if (process.platform === 'darwin') {
              app.focus({ steal: true });
            }
          },
        },
        {
          label: '隐藏应用',
          click: () => {
            this.windowManager.hideFloatingWindows();
          },
        },
        { type: 'separator' },
        {
          label: '退出',
          click: () => {
            app.quit();
          },
        },
      ]);

      this.tray.setContextMenu(contextMenu);
    } catch (error) {
      logger.error({ error }, '创建菜单栏图标失败');
    }
  }

  private cleanup(): void {
    logger.info('清理应用资源');

    // 清理菜单栏图标
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
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
