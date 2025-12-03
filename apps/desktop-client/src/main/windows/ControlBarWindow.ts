import { BrowserWindow, screen } from 'electron';
import type { WindowConfig } from '../../shared/types.js';
import { createLogger } from '../../utils/logger.js';
import { getPreloadPath, getRendererPath, getWindowIconPath } from '../utils/paths.js';

const log = createLogger('ControlBarWindow');

/**
 * 控制条窗口 - 应用主窗口和控制中心
 * 管理所有其他窗口，始终保持在最顶层，支持拖拽和悬停交互
 */
export class ControlBarWindow {
  private window: BrowserWindow | null = null;
  private isDevelopment: boolean;
  private isMoving: boolean = false;
  private onCloseCallback?: () => void;

  private readonly config: WindowConfig = {
    id: 'control-bar',
    label: 'control-bar',
    width: 1000,
    height: 100,
    alwaysOnTop: true, // 悬浮窗口需要总是置顶
    frame: false,
    transparent: true,
    skipTaskbar: true, // 不显示在任务栏，纯悬浮应用
    resizable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    focusable: true, // 可以处理鼠标和键盘事件
    show: false,
    center: true, // 初始居中显示
  };

  constructor(isDevelopment: boolean = false) {
    this.isDevelopment = isDevelopment;
  }

  /**
   * 创建控制条窗口
   */
  public async create(): Promise<void> {
    if (this.window) return;

    try {
      // 获取主显示器信息来计算初始位置
      const primaryDisplay = screen.getPrimaryDisplay();
      const { x: displayX, y: displayY, width: screenWidth } = primaryDisplay.workArea;

      // 初始位置：在主屏幕水平居中，距离顶部 10 像素
      const initialX = displayX + Math.floor((screenWidth - this.config.width) / 2);
      const initialY = displayY + 10;

      this.window = new BrowserWindow({
        width: this.config.width,
        height: this.config.height,
        x: initialX,
        y: initialY,
        icon: getWindowIconPath(), // 设置窗口图标
        alwaysOnTop: true, // 创建时就设置为置顶
        frame: this.config.frame,
        transparent: this.config.transparent,
        skipTaskbar: this.config.skipTaskbar,
        resizable: this.config.resizable,
        minimizable: this.config.minimizable,
        maximizable: this.config.maximizable,
        closable: this.config.closable,
        focusable: this.config.focusable,
        show: this.config.show,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          webSecurity: false, // 强制禁用以确保透明效果
          devTools: this.isDevelopment,
          preload: getPreloadPath('controlBar'),
        },
      });

      // 根据全局隐身状态应用内容保护
      try {
        const enabled = !!(global as any).stealthModeEnabled;
        this.window.setContentProtection(enabled);
      } catch {}

      // 设置最高层级，确保显示在所有应用之上（包括全屏应用）
      this.window.setAlwaysOnTop(true, 'screen-saver');
      this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      this.window.setFullScreenable(false);

      // 加载页面
      if (this.isDevelopment) {
        await this.window.loadURL('http://localhost:3000/src/renderer/control-bar/');
      } else {
        await this.window.loadFile(getRendererPath('control-bar'));
      }

      // 设置窗口事件监听
      this.setupEvents();

      // 开发环境下自动打开独立的 DevTools
      // if (this.isDevelopment) {
      this.window.webContents.openDevTools({ mode: 'detach' });
      // }
    } catch (error) {
      log.error('create', '创建 control-bar 窗口失败', {}, error);
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

    // 鼠标进入窗口区域（用于显示关闭按钮）
    this.window.on('enter-full-screen', () => {
      // 发送事件到渲染进程
      this.window?.webContents.send('mouse-enter');
    });

    // 鼠标离开窗口区域
    this.window.on('leave-full-screen', () => {
      // 发送事件到渲染进程
      this.window?.webContents.send('mouse-leave');
    });

    // 窗口开始移动
    this.window.on('will-move', () => {
      this.isMoving = true;
    });

    // 窗口移动完成
    this.window.on('moved', () => {
      if (this.isMoving) {
        // 发送位置更新事件
        const bounds = this.window!.getBounds();
        this.window!.webContents.send('position-changed', bounds);

        this.isMoving = false;
      }
    });

    // 窗口关闭（实际上不会关闭，而是隐藏）
    this.window.on('close', (event) => {
      event.preventDefault();
      // 作为主窗口，关闭时隐藏所有子窗口
      if (this.onCloseCallback) {
        this.onCloseCallback();
      }
      // 隐藏窗口
      this.hide();
    });

    // 窗口已关闭
    this.window.on('closed', () => {
      this.window = null;
    });

    // control-bar 现在作为主焦点窗口，应该保持焦点
    this.window.on('focus', () => {});

    // 失去焦点时的处理
    this.window.on('blur', () => {});
  }

  /**
   * 显示控制条窗口
   */
  public show(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.show(); // 显示窗口但不争抢焦点

      // 确保窗口在最顶层，使用最高级别悬浮在所有应用之上（包括全屏应用）
      this.window.setAlwaysOnTop(true, 'screen-saver');
      this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      this.window.setFullScreenable(false);
      this.window.moveTop();
    }
  }

  /**
   * 隐藏控制条窗口
   */
  public hide(): void {
    if (this.window && !this.window.isDestroyed() && this.window.isVisible()) {
      // 隐藏 control-bar 时，同步触发关闭回调以隐藏所有子窗口
      if (this.onCloseCallback) {
        this.onCloseCallback();
      }
      // 隐藏窗口
      this.window.hide();
    }
  }

  /**
   * 检查窗口是否可见
   */
  public isVisible(): boolean {
    return this.window ? this.window.isVisible() : false;
  }

  /**
   * 设置窗口位置
   */
  public setPosition(x: number, y: number): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.setPosition(x, y);
    }
  }

  /**
   * 获取窗口位置和大小
   */
  public getBounds(): Electron.Rectangle | null {
    if (this.window && !this.window.isDestroyed()) {
      return this.window.getBounds();
    }
    return null;
  }

  /**
   * 居中显示窗口
   */
  public center(): void {
    if (this.window && !this.window.isDestroyed()) {
      const primaryDisplay = screen.getPrimaryDisplay();
      const { x: displayX, width: screenWidth } = primaryDisplay.workArea;
      const windowBounds = this.window.getBounds();

      const centerX = displayX + Math.floor((screenWidth - windowBounds.width) / 2);
      this.setPosition(centerX, windowBounds.y);
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
   * 确保窗口获得焦点（作为主焦点窗口）
   */
  public ensureFocus(): void {
    if (this.window && !this.window.isDestroyed() && this.window.isVisible()) {
      if (!this.window.isFocused()) {
        this.window.focus();
      }
    }
  }

  /**
   * 检查是否拥有焦点
   */
  public isFocused(): boolean {
    return this.window ? this.window.isFocused() : false;
  }

  /**
   * 设置窗口关闭回调函数
   */
  public setOnCloseCallback(callback: () => void): void {
    this.onCloseCallback = callback;
  }

  /**
   * 销毁窗口
   */
  public destroy(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.destroy();
      this.window = null;
    }
  }
}
