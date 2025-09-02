import { BrowserWindow } from 'electron';
import type { WindowConfig } from '../../shared/types.js';

/**
 * 主焦点窗口 - 隐形锚点窗口
 * 负责保持应用焦点，防止其他窗口抢夺系统焦点
 */
export class MainFocusWindow {
  private window: BrowserWindow | null = null;
  private isDevelopment: boolean;
  
  private readonly config: WindowConfig = {
    id: 'main-focus',
    label: 'main-focus',
    width: 1,
    height: 1,
    x: -2000,  // 放在屏幕外
    y: -2000,
    alwaysOnTop: false,
    frame: false,
    transparent: true,
    skipTaskbar: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    focusable: true,
    show: false,  // 不显示，但可以获得焦点
  };

  constructor(isDevelopment: boolean = false) {
    this.isDevelopment = isDevelopment;
  }

  /**
   * 创建主焦点窗口
   */
  public async create(): Promise<void> {
    if (this.window) {
      console.log('⚠️ main-focus 窗口已存在，跳过创建');
      return;
    }

    console.log('🎯 创建 main-focus 主焦点窗口');

    try {
      this.window = new BrowserWindow({
        width: this.config.width,
        height: this.config.height,
        x: this.config.x,
        y: this.config.y,
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
          webSecurity: !this.isDevelopment,
        }
      });

      // 加载一个空的HTML页面
      const emptyHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>CueMate Focus Anchor</title>
            <style>
              body { 
                margin: 0; 
                padding: 0; 
                background: transparent; 
                width: 1px; 
                height: 1px;
                overflow: hidden;
              }
            </style>
          </head>
          <body></body>
        </html>
      `;
      
      await this.window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(emptyHtml)}`);

      // 设置窗口事件监听
      this.setupEvents();

      // 显示窗口但不激活（这样可以获得焦点但不会显示给用户）
      this.window.showInactive();
      
      // 立即获得焦点
      this.window.focus();

      console.log('✅ main-focus 主焦点窗口创建成功');
      console.log(`📍 窗口位置: (${this.config.x}, ${this.config.y})`);

    } catch (error) {
      console.error('❌ 创建 main-focus 窗口失败:', error);
      throw error;
    }
  }

  /**
   * 设置窗口事件监听
   */
  private setupEvents(): void {
    if (!this.window) return;

    this.window.on('ready-to-show', () => {
      console.log('🎯 main-focus 窗口准备就绪');
    });

    this.window.on('focus', () => {
      console.log('🎯 main-focus 窗口获得焦点');
    });

    this.window.on('blur', () => {
      console.log('🎯 main-focus 窗口失去焦点');
      // 立即重新获得焦点
      setTimeout(() => {
        if (this.window && !this.window.isDestroyed()) {
          this.window.focus();
        }
      }, 10);
    });

    this.window.on('closed', () => {
      console.log('🎯 main-focus 窗口已关闭');
      this.window = null;
    });
  }

  /**
   * 确保窗口获得焦点
   */
  public focus(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.focus();
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
   * 销毁窗口
   */
  public destroy(): void {
    if (this.window && !this.window.isDestroyed()) {
      console.log('🗑️ 销毁 main-focus 窗口');
      this.window.destroy();
      this.window = null;
    }
  }
}