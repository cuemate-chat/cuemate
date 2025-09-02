import { BrowserWindow } from 'electron';
import type { WindowConfig } from '../../shared/types.js';
import { getPreloadPath, getRendererPath } from '../utils/paths.js';

/**
 * 关闭按钮窗口 - 小型浮动关闭按钮
 * 通常跟随控制条窗口显示，提供关闭/退出功能
 */
export class CloseButtonWindow {
  private window: BrowserWindow | null = null;
  private isDevelopment: boolean;
  
  private readonly config: WindowConfig = {
    id: 'close-button',
    label: 'close-button',
    width: 32,
    height: 32,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    skipTaskbar: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    focusable: false,  // 不获取焦点
    show: false,
  };

  constructor(isDevelopment: boolean = false) {
    this.isDevelopment = isDevelopment;
  }

  /**
   * 创建关闭按钮窗口
   */
  public async create(): Promise<void> {
    if (this.window) {
      console.log('⚠️ close-button 窗口已存在，跳过创建');
      return;
    }

    console.log('❌ 创建 close-button 关闭按钮窗口');

    try {
      this.window = new BrowserWindow({
        width: this.config.width,
        height: this.config.height,
        // 初始位置会由 WindowManager 计算并设置
        x: 0,
        y: 0,
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
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          webSecurity: !this.isDevelopment, // 恢复原逻辑，开发模式禁用 webSecurity
          preload: getPreloadPath('closeButton')
        }
      });

      // 加载页面
      if (this.isDevelopment) {
        await this.window.loadURL('http://localhost:3000/src/renderer/close-button/');
      } else {
        await this.window.loadFile(getRendererPath('close-button'));
      }

      // 设置窗口事件监听
      this.setupEvents();

      console.log('✅ close-button 关闭按钮窗口创建成功');

    } catch (error) {
      console.error('❌ 创建 close-button 窗口失败:', error);
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
      console.log('❌ close-button 窗口准备就绪');
    });

    // 鼠标进入按钮区域
    this.window.on('enter-full-screen', () => {
      // 发送悬停状态到渲染进程
      this.window?.webContents.send('mouse-enter');
    });

    // 鼠标离开按钮区域
    this.window.on('leave-full-screen', () => {
      // 发送离开状态到渲染进程
      this.window?.webContents.send('mouse-leave');
    });

    // 防止窗口关闭，改为隐藏
    this.window.on('close', (event) => {
      event.preventDefault();
      this.hide();
    });

    // 窗口已关闭
    this.window.on('closed', () => {
      console.log('❌ close-button 窗口已关闭');
      this.window = null;
    });

    // 防止窗口获得焦点
    this.window.on('focus', () => {
      console.log('⚠️ close-button 意外获得焦点，立即模糊');
      if (this.window) {
        this.window.blur();
      }
    });

    // 监听点击事件
    this.window.webContents.on('before-input-event', (_event, input) => {
      if (input.type === 'mouseDown') {
        console.log('🖱️ close-button 被点击');
        // 发送点击事件到渲染进程
        this.window?.webContents.send('button-clicked');
      }
    });
  }

  /**
   * 显示关闭按钮窗口
   */
  public show(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.showInactive();  // 显示但不激活（不获得焦点）
      console.log('👀 close-button 窗口已显示');
      
      // 确保窗口在最顶层
      this.window.setAlwaysOnTop(true, 'floating');
    }
  }

  /**
   * 隐藏关闭按钮窗口
   */
  public hide(): void {
    if (this.window && !this.window.isDestroyed() && this.window.isVisible()) {
      this.window.hide();
      console.log('👁️ close-button 窗口已隐藏');
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
      console.log(`📍 close-button 窗口位置已更新: (${x}, ${y})`);
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
   * 设置按钮样式状态
   */
  public setHoverState(isHovered: boolean): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send('set-hover-state', isHovered);
    }
  }

  /**
   * 设置按钮按下状态
   */
  public setPressedState(isPressed: boolean): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send('set-pressed-state', isPressed);
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
      console.log('🗑️ 销毁 close-button 窗口');
      this.window.destroy();
      this.window = null;
    }
  }
}