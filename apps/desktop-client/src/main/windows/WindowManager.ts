import type { BrowserWindow } from 'electron';
import { screen } from 'electron';
import type { AppState } from '../../shared/types.js';
import { logger } from '../../utils/logger.js';
import { WebSocketClient } from '../websocket/WebSocketClient.js';
import { AIQuestionHistoryWindow } from './AIQuestionHistoryWindow.js';
import { AIQuestionWindow } from './AIQuestionWindow.js';
import { ControlBarWindow } from './ControlBarWindow.js';
import { MainContentWindow } from './MainContentWindow.js';

export class WindowManager {
  private controlBarWindow: ControlBarWindow;
  private mainContentWindow: MainContentWindow;
  private aiQuestionWindow: AIQuestionWindow;
  private webSocketClient: WebSocketClient;
  private isDevelopment: boolean;
  private appState: AppState;
  private aiQuestionHistoryWindow: AIQuestionHistoryWindow;
  private windowStatesBeforeHide: {
    isMainContentVisible: boolean;
    isAIQuestionVisible: boolean;
    isAIQuestionHistoryVisible: boolean;
  } = {
    isMainContentVisible: false,
    isAIQuestionVisible: false,
    isAIQuestionHistoryVisible: false,
  }; // 保存所有窗口隐藏前的状态

  constructor(isDevelopment: boolean = false) {
    this.isDevelopment = isDevelopment;

    // 初始化应用状态
    this.appState = {
      isControlBarVisible: true,
      isCloseButtonVisible: false, // 关闭按钮状态由组件内部管理
      isMainContentVisible: false,
      isAIQuestionVisible: false,
      isAIQuestionHistoryVisible: false as any,
    };

    // 创建窗口实例 - control-bar 现在作为主焦点窗口，关闭按钮已集成
    this.controlBarWindow = new ControlBarWindow(this.isDevelopment);
    this.mainContentWindow = new MainContentWindow(this.isDevelopment);
    this.aiQuestionWindow = new AIQuestionWindow(this.isDevelopment);
    this.aiQuestionHistoryWindow = new AIQuestionHistoryWindow(this.isDevelopment);

    // 创建 WebSocket 客户端
    this.webSocketClient = new WebSocketClient(this);
  }

  /**
   * 初始化窗口管理器
   */
  public async initialize(): Promise<void> {
    try {
      // 1. 创建控制条窗口（现在作为主焦点窗口）
      await this.controlBarWindow.create();

      // 2. 创建主内容窗口（初始隐藏）
      await this.mainContentWindow.create();

      // 3. 创建AI问答窗口（初始隐藏）
      await this.aiQuestionWindow.create();

      // 3.1 创建AI问答历史窗口（初始隐藏）
      await this.aiQuestionHistoryWindow.create();

      // 4. 设置窗口事件监听
      this.setupWindowEvents();

      // 5. 连接 WebSocket 客户端
      this.webSocketClient.connect();
      logger.info('WebSocket 客户端连接已启动');

      // 6. 显示浮动窗口（control-bar）
      this.showFloatingWindows();
    } catch (error) {
      logger.error({ error }, '窗口管理器初始化失败');
      throw error;
    }
  }

  /**
   * 设置窗口事件监听
   */
  private setupWindowEvents(): void {
    // 监听控制条窗口事件
    const controlBarWindow = this.controlBarWindow.getBrowserWindow();
    if (controlBarWindow) {
      controlBarWindow.on('focus', () => {});
    }

    // 监听主内容窗口事件
    const mainContentWindow = this.mainContentWindow.getBrowserWindow();
    if (mainContentWindow) {
      // 允许 main-content 在交互期间获得焦点（以便键盘输入）。
      mainContentWindow.on('focus', () => {});

      mainContentWindow.on('blur', () => {
        setTimeout(() => this.ensureMainFocus(), 0);
      });

      mainContentWindow.on('hide', () => {
        setTimeout(() => this.ensureMainFocus(), 0);
      });

      mainContentWindow.on('close', (event) => {
        // 阻止窗口关闭，改为隐藏
        event.preventDefault();
        this.hideMainContent();
      });
    }

    // 监听 AI 问答窗口事件用于联动历史窗口定位
    const aiWindow = this.aiQuestionWindow.getBrowserWindow();
    if (aiWindow) {
      const relayoutHistory = () => {
        if (this.isAIQuestionHistoryVisible()) {
          const bounds = this.computeHistoryBoundsNextToAI();
          if (bounds) {
            this.aiQuestionHistoryWindow.setBounds(bounds);
          }
        }
      };

      aiWindow.on('move', relayoutHistory);
      aiWindow.on('moved', relayoutHistory as any);
      aiWindow.on('resize', relayoutHistory);
      aiWindow.on('resized', relayoutHistory as any);
      aiWindow.on('show', relayoutHistory);
    }
  }

  /**
   * 确保焦点在主焦点窗口上（现在是 control-bar）
   */
  public ensureMainFocus(): void {
    this.controlBarWindow.ensureFocus();
  }

  /**
   * 显示浮动窗口
   */
  public showFloatingWindows(): void {
    logger.info('显示浮动窗口');

    this.controlBarWindow.show();
    this.appState.isControlBarVisible = true;
    this.appState.isCloseButtonVisible = true; // 统一状态管理

    // 恢复所有窗口之前的状态
    if (this.windowStatesBeforeHide.isMainContentVisible) {
      this.mainContentWindow.show();
      this.appState.isMainContentVisible = true;
    }

    if (this.windowStatesBeforeHide.isAIQuestionVisible) {
      this.aiQuestionWindow.show();
      this.appState.isAIQuestionVisible = true;
    }

    if (this.windowStatesBeforeHide.isAIQuestionHistoryVisible) {
      this.showAIQuestionHistoryNextToAI();
    }

    // 初始时确保焦点在 control-bar
    setTimeout(() => this.ensureMainFocus(), 100);
  }

  /**
   * 隐藏浮动窗口
   */
  public hideFloatingWindows(): void {
    logger.info('隐藏浮动窗口');

    // 保存所有窗口当前状态
    this.windowStatesBeforeHide = {
      isMainContentVisible: this.appState.isMainContentVisible,
      isAIQuestionVisible: this.appState.isAIQuestionVisible,
      isAIQuestionHistoryVisible: this.isAIQuestionHistoryVisible(),
    };

    // 隐藏所有相关窗口
    if (this.appState.isMainContentVisible) {
      this.mainContentWindow.hide();
      this.appState.isMainContentVisible = false;
    }

    if (this.appState.isAIQuestionVisible) {
      this.aiQuestionWindow.hide();
      this.appState.isAIQuestionVisible = false;
    }

    if (this.isAIQuestionHistoryVisible()) {
      this.aiQuestionHistoryWindow.hide();
    }

    this.controlBarWindow.hide();
    this.appState.isControlBarVisible = false;
    this.appState.isCloseButtonVisible = false;

    // 浮动窗口隐藏后，若 main-content 不可见，再恢复 control-bar 焦点
    setTimeout(() => this.ensureMainFocus(), 100);
  }

  /**
   * 切换浮动窗口显示状态
   */
  public toggleFloatingWindows(): void {
    if (this.appState.isControlBarVisible) {
      this.hideFloatingWindows();
    } else {
      this.showFloatingWindows();
    }
  }

  /**
   * 显示关闭按钮 - 由控制条组件内部管理
   */
  public showCloseButton(): void {
    this.appState.isCloseButtonVisible = true;
  }

  /**
   * 隐藏关闭按钮 - 由控制条组件内部管理
   */
  public hideCloseButton(): void {
    this.appState.isCloseButtonVisible = false;
  }

  /**
   * 显示主内容窗口
   */
  public showMainContent(): void {
    this.mainContentWindow.show();
    this.appState.isMainContentVisible = true;
    // 主内容窗口已显示
  }

  /**
   * 隐藏主内容窗口
   */
  public hideMainContent(): void {
    this.mainContentWindow.hide();
    this.appState.isMainContentVisible = false;
    // 主内容窗口已隐藏

    // 立即恢复焦点
    this.ensureMainFocus();
  }

  /**
   * 切换主内容窗口显示状态
   */
  public toggleMainContent(): void {
    if (this.appState.isMainContentVisible) {
      this.hideMainContent();
    } else {
      this.showMainContent();
    }
  }

  /**
   * 打开外部链接
   */
  public openExternalUrl(url: string): void {
    const { shell } = require('electron');
    shell.openExternal(url);
    logger.info({ url }, '打开外部链接');
  }

  /**
   * 获取应用状态
   */
  public getAppState(): AppState {
    return { ...this.appState };
  }

  /**
   * 获取控制条窗口实例
   */
  public getControlBarWindow(): BrowserWindow | null {
    return this.controlBarWindow.getBrowserWindow();
  }

  /**
   * 显示AI问答窗口
   */
  public showAIQuestion(): void {
    this.aiQuestionWindow.show();
    this.appState.isAIQuestionVisible = true;
  }

  /**
   * 隐藏AI问答窗口
   */
  public hideAIQuestion(): void {
    this.aiQuestionWindow.hide();
    this.appState.isAIQuestionVisible = false;
    // 关闭 AI 窗口时，同步关闭历史窗口
    if (this.isAIQuestionHistoryVisible()) {
      this.aiQuestionHistoryWindow.hide();
    }
  }

  /**
   * 切换AI问答窗口显示状态
   */
  public toggleAIQuestion(): void {
    if (this.appState.isAIQuestionVisible) {
      this.hideAIQuestion();
    } else {
      this.showAIQuestion();
    }
  }

  // === 历史窗口相关 ===
  public isAIQuestionHistoryVisible(): boolean {
    const w = this.aiQuestionHistoryWindow.getBrowserWindow();
    return !!(w && w.isVisible());
  }

  private computeHistoryBoundsNextToAI(): Electron.Rectangle | null {
    const aiWin = this.aiQuestionWindow.getBrowserWindow();
    if (!aiWin) return null;
    const aiBounds = aiWin.getBounds();
    const display = screen.getDisplayMatching(aiBounds) || screen.getPrimaryDisplay();
    const workArea = display.workArea;
    const rightSpace = workArea.x + workArea.width - (aiBounds.x + aiBounds.width);
    const minWidth = 260;
    const maxWidth = Math.max(420, Math.floor(workArea.width * 0.5));
    let width = Math.floor(rightSpace * 0.8);
    width = Math.max(minWidth, Math.min(width, maxWidth, rightSpace - 10));
    const x = aiBounds.x + aiBounds.width + 10;
    const y = aiBounds.y;
    const height = aiBounds.height;
    // 若空间不足，回退贴左侧
    if (x + width > workArea.x + workArea.width) {
      const leftWidth = Math.floor((aiBounds.x - workArea.x) * 0.7);
      const leftWidthClamped = Math.max(minWidth, Math.min(leftWidth, maxWidth));
      const leftX = Math.max(workArea.x, aiBounds.x - 10 - leftWidthClamped);
      return { x: leftX, y, width: leftWidthClamped, height };
    }
    return { x, y, width, height };
  }

  public showAIQuestionHistoryNextToAI(): void {
    const bounds = this.computeHistoryBoundsNextToAI();
    if (!bounds) return;
    this.aiQuestionHistoryWindow.setBounds(bounds);
    this.aiQuestionHistoryWindow.show();
  }

  public hideAIQuestionHistory(): void {
    this.aiQuestionHistoryWindow.hide();
  }

  public toggleAIQuestionHistoryNextToAI(): void {
    if (this.isAIQuestionHistoryVisible()) {
      this.hideAIQuestionHistory();
    } else {
      this.showAIQuestionHistoryNextToAI();
    }
  }

  /**
   * 获取 WebSocket 客户端实例
   */
  public getWebSocketClient(): WebSocketClient {
    return this.webSocketClient;
  }

  /**
   * 销毁窗口管理器
   */
  public destroy(): void {
    logger.info('销毁窗口管理器');

    // 断开 WebSocket 连接
    this.webSocketClient.disconnect();

    this.controlBarWindow.destroy();
    this.mainContentWindow.destroy();
    this.aiQuestionWindow.destroy();
  }
}
