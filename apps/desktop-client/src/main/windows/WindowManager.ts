import type { BrowserWindow } from 'electron';
import { screen } from 'electron';
import type { AppState } from '../../shared/types.js';
import { logger } from '../../utils/logger.js';
import { ensureDockActiveAndIcon } from '../utils/dock.js';
import { WebSocketClient } from '../websocket/WebSocketClient.js';
import { AIQuestionHistoryWindow } from './AIQuestionHistoryWindow.js';
import { AIQuestionWindow } from './AIQuestionWindow.js';
import { ControlBarWindow } from './ControlBarWindow.js';
import { InterviewerWindow } from './InterviewerWindow.js';
import { MainContentWindow } from './MainContentWindow.js';

export class WindowManager {
  private controlBarWindow: ControlBarWindow;
  private mainContentWindow!: MainContentWindow; // 在initialize中初始化
  private aiQuestionWindow!: AIQuestionWindow; // 在initialize中初始化
  private webSocketClient: WebSocketClient;
  private isDevelopment: boolean;
  private appState: AppState;
  private aiQuestionHistoryWindow!: AIQuestionHistoryWindow; // 在initialize中初始化
  private interviewerWindow!: InterviewerWindow; // 在initialize中初始化
  private windowStatesBeforeHide: {
    isMainContentVisible: boolean;
    isAIQuestionVisible: boolean;
    isAIQuestionHistoryVisible: boolean;
    isInterviewerVisible: boolean;
  } = {
    isMainContentVisible: false,
    isAIQuestionVisible: false,
    isAIQuestionHistoryVisible: false,
    isInterviewerVisible: false,
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

      // 2. 创建子窗口，以control-bar作为父窗口
      const controlBarBrowserWindow = this.controlBarWindow.getBrowserWindow();
      this.mainContentWindow = new MainContentWindow(this.isDevelopment, controlBarBrowserWindow);
      this.aiQuestionWindow = new AIQuestionWindow(this.isDevelopment, controlBarBrowserWindow);
      this.aiQuestionHistoryWindow = new AIQuestionHistoryWindow(
        this.isDevelopment,
        controlBarBrowserWindow,
      );
      this.interviewerWindow = new InterviewerWindow(this.isDevelopment, controlBarBrowserWindow);

      // 3. 创建网页窗口（初始隐藏）
      await this.mainContentWindow.create();

      // 4. 创建AI问答窗口（初始隐藏）
      await this.aiQuestionWindow.create();

      // 5. 创建AI问答历史窗口（初始隐藏）
      await this.aiQuestionHistoryWindow.create();

      // 6. 创建Interviewer窗口（初始隐藏）
      await this.interviewerWindow.create();

      // 7. 设置控制条窗口关闭回调，隐藏所有子窗口
      this.controlBarWindow.setOnCloseCallback(() => {
        this.hideAllChildWindows();
      });

      // 8. 设置窗口事件监听
      this.setupWindowEvents();

      // 9. 连接 WebSocket 客户端
      this.webSocketClient.connect();
      logger.info('WebSocket 客户端连接已启动');

      // 10. 显示浮动窗口（control-bar）
      this.showFloatingWindows();

      // 11. 监听屏幕分辨率变化
      this.setupScreenEvents();
    } catch (error) {
      logger.error({ error }, '窗口管理器初始化失败');
      throw error;
    }
  }

  /**
   * 设置屏幕事件监听
   */
  private setupScreenEvents(): void {
    // 监听显示器变化事件
    screen.on('display-added', () => {
      this.updateAIWindowSize();
    });

    screen.on('display-removed', () => {
      this.updateAIWindowSize();
    });

    screen.on('display-metrics-changed', () => {
      this.updateAIWindowSize();
    });
  }

  /**
   * 更新AI窗口尺寸
   */
  private updateAIWindowSize(): void {
    if (this.appState.isAIQuestionVisible) {
      this.aiQuestionWindow.updateWindowSize();
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

    // 监听 AI 问答窗口事件用于联动历史窗口和interviewer窗口定位
    const aiWindow = this.aiQuestionWindow.getBrowserWindow();
    if (aiWindow) {
      const relayoutSideWindows = () => {
        if (this.isAIQuestionHistoryVisible()) {
          const historyBounds = this.computeHistoryBoundsNextToAI();
          if (historyBounds) {
            this.aiQuestionHistoryWindow.setBounds(historyBounds);
          }
        }
        if (this.isInterviewerVisible()) {
          const interviewerBounds = this.computeInterviewerBoundsNextToAI();
          if (interviewerBounds) {
            this.interviewerWindow.setBounds(interviewerBounds);
          }
        }
      };

      aiWindow.on('move', relayoutSideWindows);
      aiWindow.on('moved', relayoutSideWindows as any);
      aiWindow.on('resize', relayoutSideWindows);
      aiWindow.on('resized', relayoutSideWindows as any);
      aiWindow.on('show', relayoutSideWindows);
    }
  }

  /**
   * 确保焦点在主焦点窗口上（现在是 control-bar）
   */
  public ensureMainFocus(): void {
    this.controlBarWindow.ensureFocus();
  }

  /**
   * 显示浮动窗口（从圆形图标模式切换回正常模式）
   */
  public showFloatingWindows(): void {
    // 从圆形图标模式切换回正常模式
    this.controlBarWindow.switchToNormalMode();
    this.controlBarWindow.show();
    if (process.platform === 'darwin') ensureDockActiveAndIcon('wm:showFloatingWindows');
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

    if (this.windowStatesBeforeHide.isInterviewerVisible) {
      this.showInterviewerNextToAI();
    }

    // 初始时确保焦点在 control-bar
    setTimeout(() => this.ensureMainFocus(), 100);
  }

  /**
   * 隐藏浮动窗口（切换到圆形图标模式）
   */
  public hideFloatingWindows(): void {
    // 保存所有窗口当前状态
    this.windowStatesBeforeHide = {
      isMainContentVisible: this.appState.isMainContentVisible,
      isAIQuestionVisible: this.appState.isAIQuestionVisible,
      isAIQuestionHistoryVisible: this.isAIQuestionHistoryVisible(),
      isInterviewerVisible: this.isInterviewerVisible(),
    };

    // 隐藏所有子窗口
    this.hideAllChildWindows();

    // control-bar 切换到圆形图标模式，而不是隐藏
    this.controlBarWindow.switchToCircleMode();
    if (process.platform === 'darwin') ensureDockActiveAndIcon('wm:hideFloatingWindows->circle');
    this.appState.isControlBarVisible = true; // 圆形图标模式依然是可见状态
    this.appState.isCloseButtonVisible = false;

    // 确保 control-bar 焦点
    setTimeout(() => this.ensureMainFocus(), 100);
  }

  /**
   * 切换浮动窗口显示状态
   */
  public toggleFloatingWindows(): void {
    // 检查是否为圆形图标模式
    const controlBarBrowserWindow = this.controlBarWindow.getBrowserWindow();
    if (controlBarBrowserWindow) {
      const bounds = controlBarBrowserWindow.getBounds();
      const isCircleMode = bounds.width <= 90; // 圆形图标的尺寸判断（70px + 余量）

      if (isCircleMode) {
        this.showFloatingWindows(); // 从圆形图标模式切换回正常模式
      } else {
        this.hideFloatingWindows(); // 切换到圆形图标模式
      }
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
   * 获取AI问答窗口实例
   */
  public getAIQuestionWindow(): AIQuestionWindow {
    return this.aiQuestionWindow;
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
    const spacing = Math.floor(rightSpace * 0.05); // 5% 的 rightSpace 作为间距
    let width = Math.floor(rightSpace * 0.9);
    width = Math.max(minWidth, Math.min(width, maxWidth, rightSpace - spacing));
    const x = aiBounds.x + aiBounds.width + spacing;
    const y = aiBounds.y;
    const height = aiBounds.height;
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

  // === Interviewer窗口相关 ===
  public isInterviewerVisible(): boolean {
    const w = this.interviewerWindow.getBrowserWindow();
    return !!(w && w.isVisible());
  }

  private computeInterviewerBoundsNextToAI(): Electron.Rectangle | null {
    const aiWin = this.aiQuestionWindow.getBrowserWindow();
    if (!aiWin) return null;
    const aiBounds = aiWin.getBounds();
    const display = screen.getDisplayMatching(aiBounds) || screen.getPrimaryDisplay();
    const workArea = display.workArea;
    const leftSpace = aiBounds.x - workArea.x;
    const minWidth = 260;
    const maxWidth = Math.max(420, Math.floor(workArea.width * 0.5));
    const spacing = Math.floor(leftSpace * 0.05); // 5% 的 leftSpace 作为间距
    let width = Math.floor(leftSpace * 0.9);
    width = Math.max(minWidth, Math.min(width, maxWidth, leftSpace - spacing));
    const x = Math.max(workArea.x, aiBounds.x - spacing - width);
    const y = aiBounds.y;
    const height = aiBounds.height;
    return { x, y, width, height };
  }

  public showInterviewerNextToAI(): void {
    const bounds = this.computeInterviewerBoundsNextToAI();
    if (!bounds) return;
    this.interviewerWindow.setBounds(bounds);
    this.interviewerWindow.show();
  }

  public hideInterviewer(): void {
    this.interviewerWindow.hide();
  }

  public toggleInterviewerNextToAI(): void {
    if (this.isInterviewerVisible()) {
      this.hideInterviewer();
    } else {
      this.showInterviewerNextToAI();
    }
  }

  /**
   * 获取 WebSocket 客户端实例
   */
  public getWebSocketClient(): WebSocketClient {
    return this.webSocketClient;
  }

  /**
   * 隐藏所有子窗口（保持状态）
   */
  public hideAllChildWindows(): void {
    // 保存所有窗口当前状态
    this.windowStatesBeforeHide = {
      isMainContentVisible: this.appState.isMainContentVisible,
      isAIQuestionVisible: this.appState.isAIQuestionVisible,
      isAIQuestionHistoryVisible: this.isAIQuestionHistoryVisible(),
      isInterviewerVisible: this.isInterviewerVisible(),
    };

    // 隐藏所有子窗口
    // 基于实际可见状态隐藏主内容窗口，避免状态不同步导致未隐藏
    if (this.mainContentWindow.isVisible()) {
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

    if (this.isInterviewerVisible()) {
      this.interviewerWindow.hide();
    }
  }

  /**
   * 销毁窗口管理器
   */
  public destroy(): void {
    // 断开 WebSocket 连接
    this.webSocketClient.disconnect();

    this.controlBarWindow.destroy();
    this.mainContentWindow.destroy();
    this.aiQuestionWindow.destroy();
    this.aiQuestionHistoryWindow.destroy();
    this.interviewerWindow.destroy();
  }
}
