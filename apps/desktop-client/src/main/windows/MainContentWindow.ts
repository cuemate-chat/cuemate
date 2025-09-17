import { BrowserWindow, screen } from 'electron';
import type { WindowConfig } from '../../shared/types.js';
import { logger } from '../../utils/logger.js';
import { getPreloadPath, getRendererPath, getWindowIconPath } from '../utils/paths.js';

/**
 * 主内容窗口 - 普通功能窗口
 * 显示主要功能和内容，受 control-bar 控制
 */
export class MainContentWindow {
  private window: BrowserWindow | null = null;
  private isDevelopment: boolean;
  private parentWindow: BrowserWindow | null = null;
  private lastBounds: Electron.Rectangle | null = null;
  private isCircleMode: boolean = false; // 是否为圆形图标模式
  private originalBounds: Electron.Rectangle | null = null; // 保存原始窗口尺寸

  private readonly config: WindowConfig = {
    id: 'main-content',
    label: 'main-content',
    width: 1200,
    height: 800,
    alwaysOnTop: true, // 主内容窗口也需要悬浮，但层级低于悬浮窗口
    frame: true, // 有标题栏和边框
    transparent: false, // 不透明
    skipTaskbar: false, // 显示在任务栏/Dock，作为主窗口保持应用图标显示
    resizable: true, // 可调整大小
    minimizable: true,
    maximizable: true,
    closable: true, // 可关闭（但会被阻止并改为圆形模式）
    focusable: true, // 允许获得焦点，以便用户可以输入内容
    show: true, // 默认显示大窗口
    center: true,
  };

  constructor(isDevelopment: boolean = false, parentWindow: BrowserWindow | null = null) {
    this.isDevelopment = isDevelopment;
    this.parentWindow = parentWindow;
  }

  /**
   * 创建主内容窗口
   */
  public async create(): Promise<void> {
    if (this.window) {
      logger.info('main-content 窗口已存在，跳过创建');
      return;
    }

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
      const initialY = displayY + Math.floor((screenHeight - this.config.height) / 2) + 20;

      this.window = new BrowserWindow({
        width: this.config.width,
        height: this.config.height,
        x: initialX,
        y: initialY,
        icon: getWindowIconPath(), // 设置窗口图标
        parent: this.parentWindow || undefined, // 设置父窗口
        alwaysOnTop: true, // 主内容窗口也需要悬浮
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
          preload: getPreloadPath('mainContent'), // 添加预加载脚本
        },
      });

      // 设置最小尺寸
      this.window.setMinimumSize(800, 600);

      // 加载页面
      if (this.isDevelopment) {
        await this.window.loadURL('http://localhost:3000/src/renderer/main-content/');
      } else {
        await this.window.loadFile(getRendererPath('main-content'));
      }

      // 设置窗口事件监听
      this.setupEvents();

      // 页面加载完成，默认显示大窗口
      this.window.webContents.once('did-finish-load', () => {
        logger.info('main-content 页面加载完成，默认显示大窗口');
      });
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
    this.window.on('ready-to-show', () => {});

    // 窗口显示时
    this.window.on('show', () => {
      // 窗口已显示
    });

    // 窗口隐藏时
    this.window.on('hide', () => {
      // 窗口已隐藏
    });

    // 窗口获得焦点时（应该立即转移到主焦点窗口）
    this.window.on('focus', () => {});

    // 窗口失去焦点
    this.window.on('blur', () => {});

    // 窗口尺寸改变
    this.window.on('resized', () => {
      const bounds = this.window!.getBounds();

      // 保存窗口状态
      this.lastBounds = bounds;

      // 通知渲染进程窗口尺寸变化
      this.window!.webContents.send('window-resized', bounds);
    });

    // 窗口移动
    this.window.on('moved', () => {
      const bounds = this.window!.getBounds();

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

    // 阻止窗口关闭，改为切换到圆形模式
    this.window.on('close', (event) => {
      logger.info('main-content 窗口尝试关闭，改为切换到圆形模式');
      event.preventDefault();
      this.switchToCircleMode();
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

      // 如果当前是圆形模式，先切换回正常模式
      if (this.isCircleMode) {
        this.switchToNormalMode();
      } else {
        // 恢复上次的窗口位置和大小
        if (this.lastBounds) {
          this.window.setBounds(this.lastBounds);
        }
      }

      this.window.show(); // 显示窗口
      this.window.setAlwaysOnTop(true, 'normal'); // 设置为普通悬浮窗口
      this.window.setVisibleOnAllWorkspaces(true); // 在所有工作区可见
      this.window.moveTop(); // 移到当前层级最顶部
      // 窗口已显示
    }
  }

  /**
   * 隐藏主内容窗口（实际切换到圆形模式）
   */
  public hide(): void {
    if (this.window && !this.window.isDestroyed() && this.window.isVisible()) {
      // 切换到圆形模式而不是隐藏
      this.switchToCircleMode();
    }
  }

  /**
   * 真正的隐藏窗口（用于 hideAllChildWindows）
   */
  public hideWindow(): void {
    if (this.window && !this.window.isDestroyed() && this.window.isVisible()) {
      // 保存当前窗口状态
      this.lastBounds = this.window.getBounds();
      this.window.hide();
    }
  }

  /**
   * 检查窗口是否可见
   */
  public isVisible(): boolean {
    return this.window ? this.window.isVisible() || this.isCircleMode : false;
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
   * 切换到圆形图标模式
   */
  public switchToCircleMode(): void {
    if (!this.window || this.window.isDestroyed() || this.isCircleMode) {
      return;
    }

    try {
      // 保存当前窗口尺寸和样式
      this.originalBounds = this.window.getBounds();

      // 设置圆形图标尺寸和位置
      const circleSize = 50;
      const primaryDisplay = screen.getPrimaryDisplay();
      const {
        x: displayX,
        y: displayY,
        width: screenWidth,
        height: screenHeight,
      } = primaryDisplay.workArea;

      // 位置：紧贴屏幕右侧，垂直居中
      const x = displayX + screenWidth - circleSize - 10; // 距离屏幕边缘10px
      const y = displayY + Math.floor((screenHeight - circleSize) / 2);

      // 设置圆形模式的窗口属性
      this.window.setResizable(false);
      this.window.setMinimizable(false);
      this.window.setMaximizable(false);
      this.window.setAlwaysOnTop(true, 'floating');
      this.window.setHasShadow(false);
      this.window.setSkipTaskbar(true); // 圆形模式不在任务栏显示

      // 临时修改窗口样式为无边框透明
      this.window.setBackgroundColor('rgba(0, 0, 0, 0)');

      // 设置新的窗口尺寸
      this.window.setBounds({
        x,
        y,
        width: circleSize,
        height: circleSize,
      });

      // 向渲染进程发送圆形模式切换事件
      this.window.webContents.send('switch-to-circle-mode', { circleSize });

      this.isCircleMode = true;

      logger.info('main-content 切换到圆形图标模式');
    } catch (error) {
      logger.error({ error }, 'main-content 切换到圆形图标模式失败');
    }
  }

  /**
   * 从圆形图标模式切换回正常模式
   */
  public switchToNormalMode(): void {
    if (!this.window || this.window.isDestroyed() || !this.isCircleMode || !this.originalBounds) {
      return;
    }

    try {
      // 恢复窗口属性
      this.window.setResizable(this.config.resizable ?? true);
      this.window.setMinimizable(this.config.minimizable ?? true);
      this.window.setMaximizable(this.config.maximizable ?? true);
      this.window.setAlwaysOnTop(true, 'normal'); // 恢复正常层级
      this.window.setHasShadow(true);
      this.window.setSkipTaskbar(this.config.skipTaskbar ?? false); // 恢复任务栏设置

      // 恢复窗口背景色
      this.window.setBackgroundColor('#ffffff');

      // 恢复原始窗口尺寸
      this.window.setBounds(this.originalBounds);

      // 向渲染进程发送正常模式切换事件
      this.window.webContents.send('switch-to-normal-mode');

      this.isCircleMode = false;
      this.originalBounds = null;

      logger.info('main-content 切换回正常模式');
    } catch (error) {
      logger.error({ error }, 'main-content 切换回正常模式失败');
    }
  }

  /**
   * 切换圆形图标模式
   */
  public toggleCircleMode(): void {
    if (this.isCircleMode) {
      this.switchToNormalMode();
    } else {
      this.switchToCircleMode();
    }
  }

  /**
   * 检查是否为圆形模式
   */
  public isInCircleMode(): boolean {
    return this.isCircleMode;
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
      this.originalBounds = null;
    }
  }
}
