import { app, globalShortcut } from 'electron';
import { WindowManager } from './windows/WindowManager.js';
import { setupIPC } from './ipc/handlers.js';
import { setupGlobalShortcuts } from './utils/shortcuts.js';
import { getAppIconPath } from './utils/paths.js';
import type { LogLevel } from '../shared/types.js';

class CueMateApp {
  private windowManager: WindowManager;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    console.log(`运行模式: ${this.isDevelopment ? '开发模式' : '生产模式'}`);
    this.windowManager = new WindowManager(this.isDevelopment);
    
    this.initialize();
  }

  private initialize(): void {
    console.log('CueMate Desktop Client 启动');
    
    // 设置应用程序事件监听器
    this.setupAppEvents();
    
    // 设置 IPC 通信
    setupIPC(this.windowManager);
  }

  private setupAppEvents(): void {
    // 当应用准备就绪时
    app.whenReady().then(() => {
      console.log('应用已准备就绪，开始初始化窗口管理器');
      
      // 设置应用图标
      try {
        const iconPath = getAppIconPath();
        console.log('应用图标路径:', iconPath);
        
        // 在 macOS 上设置 Dock 图标
        if (process.platform === 'darwin') {
          app.dock.setIcon(iconPath);
          console.log('macOS Dock 图标已设置');
        }
      } catch (error) {
        console.warn('设置应用图标失败:', error);
      }
      
      // 设置全局快捷键（必须在app ready之后）
      setupGlobalShortcuts(this.windowManager);
      
      // 初始化窗口管理器
      this.windowManager.initialize()
        .then(() => {
          console.log('窗口管理器初始化完成');
        })
        .catch((error) => {
          console.error('窗口管理器初始化失败:', error);
        });

      // macOS: 当点击 dock 图标时重新激活
      app.on('activate', () => {
        console.log('应用被重新激活 (Dock 图标点击)');
        this.windowManager.showFloatingWindows();
      });
    });

    // 当所有窗口关闭时
    app.on('window-all-closed', () => {
      console.log('所有窗口已关闭');
      // macOS: 通常应用不会完全退出
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    // 当应用即将退出时
    app.on('before-quit', () => {
      console.log('应用准备退出');
      
      // 清理资源
      this.cleanup();
    });

    // 处理第二个实例启动
    app.on('second-instance', () => {
      console.log('检测到第二个实例，激活现有应用');
      this.windowManager.showFloatingWindows();
    });

    // macOS: 处理重新打开事件
    app.on('open-url', (event, url) => {
      console.log('处理 URL:', url);
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
    console.log('清理应用资源');
    
    // macOS: 确保 Dock 图标保持正确直到应用完全退出
    if (process.platform === 'darwin') {
      try {
        const iconPath = getAppIconPath();
        app.dock.setIcon(iconPath);
        console.log('Dock 图标在退出前已确认设置');
      } catch (error) {
        console.warn('退出前设置 Dock 图标失败:', error);
      }
    }
    
    // 注销所有全局快捷键
    globalShortcut.unregisterAll();
    
    // 清理窗口管理器
    this.windowManager.destroy();
  }

  // 日志方法（供 IPC 使用）
  public log(level: LogLevel, message: string): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    switch (level) {
      case 'error':
        console.error(`${prefix} ${message}`);
        break;
      case 'warn':
        console.warn(`${prefix} ${message}`);
        break;
      case 'debug':
        if (this.isDevelopment) {
          console.debug(`${prefix} ${message}`);
        }
        break;
      case 'info':
      default:
        console.log(`${prefix} ${message}`);
        break;
    }
  }
}

// 确保只有一个应用实例运行
if (!app.requestSingleInstanceLock()) {
  console.log('应用已在运行，退出当前实例');
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
  console.error('未捕获的异常:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的 Promise 拒绝:', reason, 'at:', promise);
});