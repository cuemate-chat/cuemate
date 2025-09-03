import { BrowserWindow, screen } from 'electron';
import type { WindowConfig } from '../../shared/types.js';
import { getPreloadPath, getRendererPath, getWindowIconPath } from '../utils/paths.js';

/**
 * 控制条窗口 - 主要的浮动交互界面
 * 始终保持在最顶层，支持拖拽和悬停交互
 */
export class ControlBarWindow {
  private window: BrowserWindow | null = null;
  private isDevelopment: boolean;
  private isMoving: boolean = false;
  private moveStartTime: number = 0;
  
  private readonly config: WindowConfig = {
    id: 'control-bar',
    label: 'control-bar',
    width: 360,
    height: 100,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    skipTaskbar: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    focusable: true,   // 作为主焦点窗口，可以获得焦点
    show: false,
    center: true,  // 初始居中显示
  };

  constructor(isDevelopment: boolean = false) {
    this.isDevelopment = isDevelopment;
  }

  /**
   * 创建控制条窗口
   */
  public async create(): Promise<void> {
    if (this.window) {
      console.log('⚠️ control-bar 窗口已存在，跳过创建');
      return;
    }

    console.log('🎮 创建 control-bar 控制条窗口');

    try {
      // 获取主显示器信息来计算初始位置
      const primaryDisplay = screen.getPrimaryDisplay();
      const { x: displayX, y: displayY, width: screenWidth } = primaryDisplay.workArea;
      
      // 初始位置：在主屏幕水平居中，距离顶部 30 像素
      const initialX = displayX + Math.floor((screenWidth - this.config.width) / 2);
      const initialY = displayY + 30;

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
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          webSecurity: !this.isDevelopment, // 恢复原逻辑，开发模式禁用 webSecurity
          preload: getPreloadPath('controlBar')
        }
      });

      // 加载页面
      if (this.isDevelopment) {
        await this.window.loadURL('http://localhost:3000/src/renderer/control-bar/');
      } else {
        await this.window.loadFile(getRendererPath('control-bar'));
      }

      // 设置窗口事件监听
      this.setupEvents();

      console.log('✅ control-bar 控制条窗口创建成功');
      console.log(`📍 窗口位置: (${initialX}, ${initialY})`);

    } catch (error) {
      console.error('❌ 创建 control-bar 窗口失败:', error);
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
      console.log('🎮 control-bar 窗口准备就绪');
    });

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
      this.moveStartTime = Date.now();
      console.log('🔄 control-bar 窗口开始移动');
    });

    // 窗口移动完成
    this.window.on('moved', () => {
      if (this.isMoving) {
        const moveEndTime = Date.now();
        const moveDuration = moveEndTime - this.moveStartTime;
        console.log(`📍 control-bar 窗口移动完成，耗时: ${moveDuration}ms`);
        
        // 发送位置更新事件
        const bounds = this.window!.getBounds();
        this.window!.webContents.send('position-changed', bounds);
        
        this.isMoving = false;
      }
    });

    // 窗口关闭（实际上不会关闭，而是隐藏）
    this.window.on('close', (event) => {
      event.preventDefault();
      this.hide();
    });

    // 窗口已关闭
    this.window.on('closed', () => {
      console.log('🎮 control-bar 窗口已关闭');
      this.window = null;
    });

    // control-bar 现在作为主焦点窗口，应该保持焦点
    this.window.on('focus', () => {
      console.log('🎯 control-bar 获得焦点（作为主焦点窗口）');
    });

    // 失去焦点时的处理
    this.window.on('blur', () => {
      console.log('😶‍🌫️ control-bar 失去焦点');
    });
  }

  /**
   * 显示控制条窗口
   */
  public show(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.show();  // 显示并激活，作为主焦点窗口
      console.log('👀 control-bar 窗口已显示并获得焦点');
      
      // 确保窗口在最顶层
      this.window.setAlwaysOnTop(true, 'floating');
    }
  }

  /**
   * 隐藏控制条窗口
   */
  public hide(): void {
    if (this.window && !this.window.isDestroyed() && this.window.isVisible()) {
      this.window.hide();
      console.log('👁️ control-bar 窗口已隐藏');
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
      console.log(`📍 control-bar 窗口位置已更新: (${x}, ${y})`);
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
        console.log('🎯 control-bar 重新获得焦点');
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
   * 销毁窗口
   */
  public destroy(): void {
    if (this.window && !this.window.isDestroyed()) {
      console.log('🗑️ 销毁 control-bar 窗口');
      this.window.destroy();
      this.window = null;
    }
  }
}