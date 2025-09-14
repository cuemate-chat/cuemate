import { execSync } from 'child_process';
import { app, BrowserWindow, globalShortcut, Menu, MenuItem, shell } from 'electron';
import type { LogLevel } from '../shared/types.js';
import { logger } from '../utils/logger.js';
import { setupIPC } from './ipc/handlers.js';
import { ensureDockActiveAndIcon } from './utils/dock.js';
import { getAppIconPath } from './utils/paths.js';
import { setupGlobalShortcuts } from './utils/shortcuts.js';
import { WindowManager } from './windows/WindowManager.js';

// 在应用启动前设置应用名称
app.setName('CueMate');

class CueMateApp {
  private windowManager: WindowManager;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';

    // 设置日志环境变量
    this.setupLoggingEnvironment();

    logger.info(`运行模式: ${this.isDevelopment ? '开发模式' : '生产模式'}`);
    this.windowManager = new WindowManager(this.isDevelopment);

    this.initialize();
  }

  private createApplicationMenu(): void {
    const template = [
      {
        label: 'CueMate',
        submenu: [
          {
            label: '关于 CueMate',
            click: async () => {
              await shell.openExternal('https://github.com/CueMate-Chat/CueMate');
            },
          },
          { type: 'separator' },
          {
            label: '隐藏 CueMate Web',
            accelerator: 'Command+H',
            click: () => {
              this.windowManager.hideMainContent();
            },
          },
          {
            label: '隐藏其他',
            accelerator: 'Command+Option+H',
            click: () => {
              this.windowManager.hideFloatingWindows();
            },
          },
          { type: 'separator' },
          {
            label: '退出 CueMate',
            accelerator: process.platform === 'darwin' ? 'Command+Q' : 'Ctrl+Q',
            click: () => {
              app.quit();
            },
          },
        ],
      },
      {
        label: '编辑',
        submenu: [
          {
            label: '撤销',
            accelerator: 'CommandOrControl+Z',
            role: 'undo',
          },
          {
            label: '重做',
            accelerator: 'Shift+CommandOrControl+Z',
            role: 'redo',
          },
          { type: 'separator' },
          {
            label: '剪切',
            accelerator: 'CommandOrControl+X',
            role: 'cut',
          },
          {
            label: '复制',
            accelerator: 'CommandOrControl+C',
            role: 'copy',
          },
          {
            label: '粘贴',
            accelerator: 'CommandOrControl+V',
            role: 'paste',
          },
          {
            label: '全选',
            accelerator: 'CommandOrControl+A',
            role: 'selectall',
          },
        ],
      },
      {
        label: '视图',
        submenu: [
          {
            label: '重新加载',
            accelerator: 'CommandOrControl+R',
            click: (_item: MenuItem, focusedWindow?: BrowserWindow) => {
              if (focusedWindow) {
                focusedWindow.reload();
              }
            },
          },
          {
            label: '强制重新加载',
            accelerator: 'CommandOrControl+Shift+R',
            click: (_item: MenuItem, focusedWindow?: BrowserWindow) => {
              if (focusedWindow) {
                focusedWindow.webContents.reloadIgnoringCache();
              }
            },
          },
          {
            label: '切换开发者工具',
            accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
            click: (_item: MenuItem, focusedWindow?: BrowserWindow) => {
              if (focusedWindow) {
                focusedWindow.webContents.toggleDevTools();
              }
            },
          },
          { type: 'separator' },
          {
            label: '实际大小',
            accelerator: 'CommandOrControl+0',
            click: (_item: MenuItem, focusedWindow?: BrowserWindow) => {
              if (focusedWindow) {
                focusedWindow.webContents.setZoomLevel(0);
              }
            },
          },
          {
            label: '放大',
            accelerator: 'CommandOrControl+Plus',
            click: (_item: MenuItem, focusedWindow?: BrowserWindow) => {
              if (focusedWindow) {
                const currentZoom = focusedWindow.webContents.getZoomLevel();
                focusedWindow.webContents.setZoomLevel(currentZoom + 1);
              }
            },
          },
          {
            label: '缩小',
            accelerator: 'CommandOrControl+-',
            click: (_item: MenuItem, focusedWindow?: BrowserWindow) => {
              if (focusedWindow) {
                const currentZoom = focusedWindow.webContents.getZoomLevel();
                focusedWindow.webContents.setZoomLevel(currentZoom - 1);
              }
            },
          },
          { type: 'separator' },
          {
            label: '切换全屏',
            accelerator: process.platform === 'darwin' ? 'Ctrl+Command+F' : 'F11',
            click: (_item: MenuItem, focusedWindow?: BrowserWindow) => {
              if (focusedWindow) {
                focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
              }
            },
          },
        ],
      },
      {
        label: '窗口',
        submenu: [
          {
            label: '最小化',
            accelerator: 'CommandOrControl+M',
            click: (_item: MenuItem, focusedWindow?: BrowserWindow) => {
              if (focusedWindow) {
                focusedWindow.minimize();
              }
            },
          },
          {
            label: '关闭',
            accelerator: 'CommandOrControl+W',
            click: (_item: MenuItem, focusedWindow?: BrowserWindow) => {
              if (focusedWindow) {
                focusedWindow.close();
              }
            },
          },
        ],
      },
      {
        label: '帮助',
        submenu: [
          {
            label: '访问官网',
            click: async () => {
              await shell.openExternal('https://github.com/CueMate-Chat/CueMate');
            },
          },
        ],
      },
    ];

    const menu = Menu.buildFromTemplate(template as any);
    Menu.setApplicationMenu(menu);

    logger.info('自定义应用菜单已设置');
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

      // 创建自定义菜单
      this.createApplicationMenu();

      // 设置应用图标 & 确保 Dock 常驻
      try {
        const iconPath = getAppIconPath();
        logger.info({ iconPath }, '应用图标路径');

        // 在 macOS 上设置 Dock 图标并确保可见
        if (process.platform === 'darwin' && app.dock) {
          ensureDockActiveAndIcon('ready');
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
        ensureDockActiveAndIcon('activate');
        this.windowManager.showFloatingWindows();
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

  private cleanup(): void {
    logger.info('清理应用资源');

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
