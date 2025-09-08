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

  private readonly config: WindowConfig = {
    id: 'ai-question',
    label: 'ai-question',
    width: 700,
    height: 600,
    alwaysOnTop: true, // 悬浮窗口
    frame: false, // 无边框
    transparent: true, // 透明
    skipTaskbar: true, // 不在任务栏显示
    resizable: false, // 不可调整大小
    minimizable: false,
    maximizable: false,
    closable: false, // 不可关闭（会被阻止并改为隐藏）
    focusable: true, // 允许获得焦点
    show: false,
    center: true,
  };

  constructor(isDevelopment: boolean = false) {
    this.isDevelopment = isDevelopment;
  }

  /**
   * 创建AI问答窗口
   */
  public async create(): Promise<void> {
    if (this.window) {
      logger.info('ai-question 窗口已存在，跳过创建');
      return;
    }

    try {
      // 获取主显示器信息来计算初始位置 - 和 MainContentWindow 一样
      const primaryDisplay = screen.getPrimaryDisplay();
      const { x: displayX, y: displayY, width: screenWidth } = primaryDisplay.workArea;

      // 在主屏幕居中显示 - 显示在 ControlBarWindow 下方
      const initialX = displayX + Math.floor((screenWidth - this.config.width) / 2);
      const initialY = displayY + 90;

      this.window = new BrowserWindow({
        width: this.config.width,
        height: this.config.height,
        x: initialX,
        y: initialY,
        icon: getWindowIconPath(),
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

      // 设置窗口层级和可见性 - AI 窗口也需要最高层级，确保显示在其他应用之上
      this.window.setAlwaysOnTop(true, 'screen-saver');
      this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      this.window.setFullScreenable(false);

      // 加载页面
      if (this.isDevelopment) {
        await this.window.loadURL('http://localhost:3000/src/renderer/ai-question/');
      } else {
        await this.window.loadFile(getRendererPath('ai-question'));
      }

      // 设置窗口事件监听
      this.setupEvents();

      logger.info('ai-question 窗口创建成功');
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
      this.window.focus();

      // 确保窗口在最顶层
      this.window.setAlwaysOnTop(true, 'screen-saver');
      this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      this.window.setFullScreenable(false);
      this.window.moveTop();

      logger.info('ai-question 窗口已显示');
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
      logger.info('ai-question 窗口已销毁');
    }
  }

  /**
   * 检查窗口是否可见
   */
  public isVisible(): boolean {
    return this.window ? this.window.isVisible() : false;
  }
}
