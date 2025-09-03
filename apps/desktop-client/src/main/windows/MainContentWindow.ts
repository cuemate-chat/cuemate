import { BrowserWindow, screen } from 'electron';
import type { WindowConfig } from '../../shared/types.js';
import { logger } from '../../utils/logger.js';
import { getWindowIconPath } from '../utils/paths.js';

/**
 * 主内容窗口 - 应用的主要界面
 * 显示主要功能和内容，可以隐藏/显示
 */
export class MainContentWindow {
  private window: BrowserWindow | null = null;
  private isDevelopment: boolean;
  private lastBounds: Electron.Rectangle | null = null;

  private readonly config: WindowConfig = {
    id: 'main-content',
    label: 'main-content',
    width: 1200,
    height: 800,
    alwaysOnTop: false, // 主内容窗口不需要总是置顶
    frame: true, // 有标题栏和边框
    transparent: false, // 不透明
    skipTaskbar: false, // 在任务栏显示
    resizable: true, // 可调整大小
    minimizable: true,
    maximizable: true,
    closable: true, // 可关闭（但会被阻止并改为隐藏）
    focusable: true, // 允许获得焦点，以便用户可以输入内容
    show: false,
    center: true,
  };

  constructor(isDevelopment: boolean = false) {
    this.isDevelopment = isDevelopment;
  }

  /**
   * 创建主内容窗口
   */
  public async create(): Promise<void> {
    if (this.window) {
      logger.info('main-content 窗口已存在，跳过创建');
      return;
    }

    logger.info('创建 main-content 主内容窗口');

    try {
      // 获取主显示器信息来计算初始位置
      const primaryDisplay = screen.getPrimaryDisplay();
      const {
        x: displayX,
        y: displayY,
        width: screenWidth,
        height: screenHeight,
      } = primaryDisplay.workArea;

      // 在主屏幕居中显示
      const initialX = displayX + Math.floor((screenWidth - this.config.width) / 2);
      const initialY = displayY + Math.floor((screenHeight - this.config.height) / 2);

      this.window = new BrowserWindow({
        width: this.config.width,
        height: this.config.height,
        x: initialX,
        y: initialY,
        icon: getWindowIconPath(), // 设置窗口图标
        alwaysOnTop: this.config.alwaysOnTop,
        frame: this.config.frame,
        transparent: this.config.transparent,
        skipTaskbar: this.config.skipTaskbar,
        resizable: this.config.resizable,
        minimizable: this.config.minimizable,
        maximizable: this.config.maximizable,
        closable: this.config.closable,
        focusable: this.config.focusable,
        show: this.config.show,
        title: 'CueMate',
        titleBarStyle: 'default',
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          webSecurity: !this.isDevelopment,
          devTools: this.isDevelopment, // 仅开发环境允许打开 DevTools，但不自动打开
          // main-content 窗口加载外部 web 应用，不需要预加载脚本
        },
      });

      // 设置最小尺寸
      this.window.setMinimumSize(800, 600);

      // 加载页面 - 直接加载您的 Docker web 应用
      await this.window.loadURL('http://localhost:80');

      // 设置窗口事件监听
      this.setupEvents();

      logger.info('main-content 主内容窗口创建成功');
      logger.info(`窗口位置: (${initialX}, ${initialY})`);
    } catch (error) {
      logger.error({ error }, '创建 main-content 窗口失败');
      throw error;
    }
  }

  /**
   * 设置窗口事件监听
   */
  private setupEvents(): void {
    if (!this.window) return;

    // 窗口准备显示
    this.window.on('ready-to-show', () => {
      logger.info('main-content 窗口准备就绪');
    });

    // 窗口显示时
    this.window.on('show', () => {
      logger.info('main-content 窗口已显示');
    });

    // 窗口隐藏时
    this.window.on('hide', () => {
      logger.info('main-content 窗口已隐藏');
    });

    // 窗口获得焦点时（应该立即转移到主焦点窗口）
    this.window.on('focus', () => {
      logger.info('main-content 获得焦点（将转移到主焦点）');
    });

    // 窗口失去焦点
    this.window.on('blur', () => {
      logger.info('main-content 失去焦点');
    });

    // 窗口尺寸改变
    this.window.on('resized', () => {
      const bounds = this.window!.getBounds();
      logger.info(`main-content 窗口尺寸已改变: ${bounds.width}x${bounds.height}`);

      // 保存窗口状态
      this.lastBounds = bounds;

      // 通知渲染进程窗口尺寸变化
      this.window!.webContents.send('window-resized', bounds);
    });

    // 窗口移动
    this.window.on('moved', () => {
      const bounds = this.window!.getBounds();
      logger.info(`main-content 窗口位置已改变: (${bounds.x}, ${bounds.y})`);

      // 保存窗口状态
      this.lastBounds = bounds;

      // 通知渲染进程窗口位置变化
      this.window!.webContents.send('window-moved', bounds);
    });

    // 窗口最小化
    this.window.on('minimize', () => {
      logger.info('main-content 窗口已最小化');
    });

    // 窗口从最小化恢复
    this.window.on('restore', () => {
      logger.info('main-content 窗口已恢复');
    });

    // 窗口最大化
    this.window.on('maximize', () => {
      logger.info('main-content 窗口已最大化');
      this.window!.webContents.send('window-maximized', true);
    });

    // 窗口取消最大化
    this.window.on('unmaximize', () => {
      logger.info('main-content 窗口取消最大化');
      this.window!.webContents.send('window-maximized', false);
    });

    // 阻止窗口关闭，改为隐藏
    this.window.on('close', (event) => {
      logger.info('main-content 窗口尝试关闭，改为隐藏');
      event.preventDefault();
      this.hide();
    });

    // 窗口已关闭（实际销毁时）
    this.window.on('closed', () => {
      logger.info('main-content 窗口已关闭');
      this.window = null;
      this.lastBounds = null;
    });

    // 页面加载完成
    this.window.webContents.on('did-finish-load', () => {
      logger.info('main-content 页面加载完成');
    });

    // 处理页面崩溃
    this.window.webContents.on('crashed', () => {
      logger.error('main-content 页面崩溃');
      // 可以在这里添加崩溃恢复逻辑
    });

    // 处理未响应
    this.window.on('unresponsive', () => {
      logger.warn('main-content 窗口无响应');
    });

    // 恢复响应
    this.window.on('responsive', () => {
      logger.info('main-content 窗口恢复响应');
    });
  }

  /**
   * 显示主内容窗口
   */
  public show(): void {
    if (this.window && !this.window.isDestroyed()) {
      // 如果窗口被最小化，先恢复
      if (this.window.isMinimized()) {
        this.window.restore();
      }

      // 恢复上次的窗口位置和大小
      if (this.lastBounds) {
        this.window.setBounds(this.lastBounds);
      }

      this.window.show(); // 显示并激活窗口，允许键盘输入
      logger.info('main-content 窗口已显示');
    }
  }

  /**
   * 隐藏主内容窗口
   */
  public hide(): void {
    if (this.window && !this.window.isDestroyed() && this.window.isVisible()) {
      // 保存当前窗口状态
      this.lastBounds = this.window.getBounds();

      this.window.hide();
      logger.info('main-content 窗口已隐藏');
    }
  }

  /**
   * 检查窗口是否可见
   */
  public isVisible(): boolean {
    return this.window ? this.window.isVisible() : false;
  }

  /**
   * 切换窗口显示状态
   */
  public toggle(): void {
    if (this.isVisible()) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * 居中显示窗口
   */
  public center(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.center();
      logger.info('main-content 窗口已居中');
    }
  }

  /**
   * 最小化窗口
   */
  public minimize(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.minimize();
    }
  }

  /**
   * 最大化窗口
   */
  public maximize(): void {
    if (this.window && !this.window.isDestroyed()) {
      if (this.window.isMaximized()) {
        this.window.unmaximize();
      } else {
        this.window.maximize();
      }
    }
  }

  /**
   * 获取窗口位置和大小
   */
  public getBounds(): Electron.Rectangle | null {
    if (this.window && !this.window.isDestroyed()) {
      return this.window.getBounds();
    }
    return this.lastBounds;
  }

  /**
   * 设置窗口位置和大小
   */
  public setBounds(bounds: Electron.Rectangle): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.setBounds(bounds);
      this.lastBounds = bounds;
    }
  }

  /**
   * 获取窗口 ID
   */
  public getId(): string {
    return this.config.id;
  }

  /**
   * 获取 BrowserWindow 实例
   */
  public getBrowserWindow(): BrowserWindow | null {
    return this.window;
  }

  /**
   * 检查窗口是否存在且未销毁
   */
  public isValid(): boolean {
    return this.window !== null && !this.window.isDestroyed();
  }

  /**
   * 发送消息到渲染进程
   */
  public sendToRenderer(channel: string, data?: any): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send(channel, data);
    }
  }

  /**
   * 销毁窗口
   */
  public destroy(): void {
    if (this.window && !this.window.isDestroyed()) {
      logger.info('销毁 main-content 窗口');
      this.window.destroy();
      this.window = null;
      this.lastBounds = null;
    }
  }
}
