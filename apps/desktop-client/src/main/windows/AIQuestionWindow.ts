import { BrowserWindow, screen } from 'electron';
import type { WindowConfig } from '../../shared/types.js';
import { logger } from '../../utils/logger.js';
import { getPreloadPath, getRendererPath, getWindowIconPath } from '../utils/paths.js';

/**
 * AI 问答窗口 - 透明的悬浮窗口
 * 用于显示AI问答界面，类似ControlBarWindow的透明悬浮设计
 */
export class AIQuestionWindow {
  private window: BrowserWindow | null = null;
  private isDevelopment: boolean;
  private parentWindow: BrowserWindow | null = null;
  private heightPercentage: number = 75; // 默认75%

  private readonly config: WindowConfig = {
    id: 'ai-question',
    label: 'ai-question',
    width: 700, // 将被动态计算覆盖
    height: 600, // 将被动态计算覆盖
    alwaysOnTop: true, // 悬浮窗口
    frame: false, // 无边框
    transparent: true, // 透明
    skipTaskbar: true, // 子窗口不在任务栏显示
    resizable: false, // 不可调整大小
    minimizable: false,
    maximizable: false,
    closable: false, // 不可关闭（会被阻止并改为隐藏）
    focusable: true, // 允许获得焦点
    show: false,
    center: true,
  };

  constructor(isDevelopment: boolean = false, parentWindow: BrowserWindow | null = null) {
    this.isDevelopment = isDevelopment;
    this.parentWindow = parentWindow;
  }

  /**
   * 计算AI问答窗口的动态尺寸
   */
  private calculateWindowSize(): { width: number; height: number } {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workArea;

    // ControlBar固定尺寸和位置
    const controlBarHeight = 100;
    const controlBarY = 10;

    // 动态计算AI窗口尺寸
    const aiWidth = Math.floor(screenWidth * 0.46);
    const availableHeight = screenHeight - controlBarHeight - controlBarY;
    const aiHeight = Math.floor(availableHeight * (this.heightPercentage / 100));

    // 设置最小尺寸限制
    const minWidth = 400;
    const minHeight = 300;
    const maxWidth = Math.floor(screenWidth * 0.8); // 最大不超过屏幕80%
    const maxHeight = Math.floor(screenHeight * 0.9); // 最大不超过屏幕90%

    return {
      width: Math.max(minWidth, Math.min(aiWidth, maxWidth)),
      height: Math.max(minHeight, Math.min(aiHeight, maxHeight)),
    };
  }

  /**
   * 创建AI问答窗口
   */
  public async create(): Promise<void> {
    if (this.window) {
      return;
    }

    try {
      // 获取主显示器信息来计算初始位置
      const primaryDisplay = screen.getPrimaryDisplay();
      const { x: displayX, y: displayY, width: screenWidth } = primaryDisplay.workArea;

      // 计算动态尺寸
      const { width: dynamicWidth, height: dynamicHeight } = this.calculateWindowSize();

      // 在主屏幕居中显示 - 显示在 ControlBarWindow 下方
      const initialX = displayX + Math.floor((screenWidth - dynamicWidth) / 2);
      const initialY = displayY + 90;

      this.window = new BrowserWindow({
        width: dynamicWidth,
        height: dynamicHeight,
        x: initialX,
        y: initialY,
        icon: getWindowIconPath(),
        parent: this.parentWindow || undefined, // 设置父窗口
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
        title: 'CueMate AI Question',
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          webSecurity: !this.isDevelopment,
          devTools: this.isDevelopment,
          preload: getPreloadPath('aiQuestion'),
        },
      });

      // 根据全局隐身状态应用内容保护
      try {
        const enabled = !!(global as any).stealthModeEnabled;
        this.window.setContentProtection(enabled);
      } catch {}

      // 设置窗口层级和可见性 - AI 窗口也需要最高层级，确保显示在其他应用之上
      this.window.setAlwaysOnTop(true, 'screen-saver');
      this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      this.window.setFullScreenable(false);

      // // 开发模式下自动打开开发者工具
      // if (this.isDevelopment) {
      //   this.window.webContents.openDevTools({ mode: 'detach' });
      // }

      // 加载页面
      if (this.isDevelopment) {
        await this.window.loadURL('http://localhost:3000/src/renderer/ai-question/');
      } else {
        await this.window.loadFile(getRendererPath('ai-question'));
      }

      // 设置窗口事件监听
      this.setupEvents();
    } catch (error) {
      logger.error({ error }, '创建 ai-question 窗口失败');
      throw error;
    }
  }

  /**
   * 设置窗口事件监听
   */
  private setupEvents(): void {
    if (!this.window) return;

    // 阻止窗口关闭，改为隐藏
    this.window.on('close', (event) => {
      event.preventDefault();
      this.hide();
    });
  }

  /**
   * 显示AI问答窗口
   */
  public show(): void {
    if (!this.window) {
      logger.warn('ai-question 窗口不存在，无法显示');
      return;
    }

    try {
      // 如果窗口被最小化，先恢复
      if (this.window.isMinimized()) {
        this.window.restore();
      }

      // 显示窗口
      this.window.show();

      // 确保窗口在最顶层，使用最高级别
      this.window.setAlwaysOnTop(true, 'screen-saver');
      this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      this.window.setFullScreenable(false);
      this.window.moveTop();

      // 延迟聚焦，确保层级设置生效后再聚焦
      setTimeout(() => {
        if (this.window && !this.window.isDestroyed()) {
          this.window.focus();
        }
      }, 50);
    } catch (error) {
      logger.error({ error }, '显示 ai-question 窗口失败');
    }
  }

  /**
   * 隐藏AI问答窗口
   */
  public hide(): void {
    if (!this.window) {
      logger.warn('ai-question 窗口不存在，无法隐藏');
      return;
    }

    try {
      this.window.hide();
    } catch (error) {
      logger.error({ error }, '隐藏 ai-question 窗口失败');
    }
  }

  /**
   * 切换AI问答窗口显示状态
   */
  public toggle(): void {
    if (!this.window) {
      logger.warn('ai-question 窗口不存在，无法切换');
      return;
    }

    if (this.window.isVisible()) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * 获取窗口实例
   */
  public getBrowserWindow(): BrowserWindow | null {
    return this.window;
  }

  /**
   * 销毁窗口
   */
  public destroy(): void {
    if (this.window) {
      this.window.destroy();
      this.window = null;
    }
  }

  /**
   * 检查窗口是否可见
   */
  public isVisible(): boolean {
    return this.window ? this.window.isVisible() : false;
  }

  /**
   * 设置高度百分比
   */
  public setHeightPercentage(percentage: number): void {
    this.heightPercentage = percentage;
    this.updateWindowSize();
  }

  /**
   * 获取当前高度百分比
   */
  public getHeightPercentage(): number {
    return this.heightPercentage;
  }

  /**
   * 重新计算并更新窗口尺寸
   * 用于屏幕分辨率变化时的动态调整
   */
  public updateWindowSize(): void {
    if (!this.window) {
      logger.warn('ai-question 窗口不存在，无法更新尺寸');
      return;
    }

    try {
      const { width: newWidth, height: newHeight } = this.calculateWindowSize();
      const primaryDisplay = screen.getPrimaryDisplay();
      const { x: displayX, y: displayY, width: screenWidth } = primaryDisplay.workArea;

      // 重新计算居中位置
      const newX = displayX + Math.floor((screenWidth - newWidth) / 2);
      const newY = displayY + 90;

      // 更新窗口尺寸和位置
      this.window.setBounds({
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
      });

      // 通知渲染进程高度变化
      this.window.webContents.send('window-height-changed', {
        heightPercentage: this.heightPercentage,
      });
    } catch (error) {
      logger.error({ error }, '更新 ai-question 窗口尺寸失败');
    }
  }
}
