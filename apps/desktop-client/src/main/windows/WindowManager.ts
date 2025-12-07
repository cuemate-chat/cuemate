import type { BrowserWindow, Tray } from 'electron';
import { screen } from 'electron';
import type { AppState } from '../../shared/types.js';
import { createLogger } from '../../utils/logger.js';

const log = createLogger('WindowManager');
import { ScreenshotWatcher } from '../utils/screenshotWatcher.js';
import { WebSocketClient } from '../websocket/WebSocketClient.js';
import { AIQuestionHistoryWindow } from './AIQuestionHistoryWindow.js';
import { AIQuestionWindow } from './AIQuestionWindow.js';
import { ControlBarWindow } from './ControlBarWindow.js';
import { InterviewerWindow } from './InterviewerWindow.js';
import { MainContentWindow } from './MainContentWindow.js';
import { TrayMenuWindow } from './TrayMenuWindow.js';

export class WindowManager {
  private controlBarWindow: ControlBarWindow;
  private mainContentWindow!: MainContentWindow; // 在 initialize 中初始化
  private aiQuestionWindow!: AIQuestionWindow; // 在 initialize 中初始化
  private webSocketClient: WebSocketClient;
  private isDevelopment: boolean;
  private appState: AppState;
  private aiQuestionHistoryWindow!: AIQuestionHistoryWindow; // 在 initialize 中初始化
  private interviewerWindow!: InterviewerWindow; // 在 initialize 中初始化
  private trayMenuWindow!: TrayMenuWindow; // 托盘菜单窗口
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
  };
  private hasEverBeenHidden: boolean = false;

  private aiWindowHeightPercentage: number = 75; // 默认 75%
  private screenshotWatcher: ScreenshotWatcher | null = null;

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
      // 1. 创建主内容窗口（作为主窗口）
      this.mainContentWindow = new MainContentWindow(this.isDevelopment, null);
      await this.mainContentWindow.create();

      // 2. 创建控制条窗口
      await this.controlBarWindow.create();

      // 3. 创建子窗口，以 control-bar 作为父窗口
      const controlBarBrowserWindow = this.controlBarWindow.getBrowserWindow();
      this.aiQuestionWindow = new AIQuestionWindow(this.isDevelopment, controlBarBrowserWindow);
      this.aiQuestionHistoryWindow = new AIQuestionHistoryWindow(
        this.isDevelopment,
        controlBarBrowserWindow,
      );
      this.interviewerWindow = new InterviewerWindow(this.isDevelopment, controlBarBrowserWindow);

      // 4. 创建 AI 问答窗口（初始隐藏）
      await this.aiQuestionWindow.create();

      // 5. 创建 AI 问答历史窗口（初始隐藏）
      await this.aiQuestionHistoryWindow.create();

      // 6. 创建 Interviewer 窗口（初始隐藏）
      await this.interviewerWindow.create();

      // 6.5 创建托盘菜单窗口（初始隐藏，不设置 parent 避免影响 ControlBar 窗口状态）
      this.trayMenuWindow = new TrayMenuWindow(this.isDevelopment, null);
      await this.trayMenuWindow.create();

      // 7. 设置控制条窗口关闭回调，隐藏所有子窗口
      this.controlBarWindow.setOnCloseCallback(() => {
        this.hideAllChildWindows();
      });

      // 8. 设置窗口事件监听
      this.setupWindowEvents();

      // 9. 连接 WebSocket 客户端
      this.webSocketClient.connect();

      // 10. 显示浮动窗口（control-bar）
      this.showFloatingWindows();

      // 11. 监听屏幕分辨率变化
      this.setupScreenEvents();

      // 12. 启动截图/录屏监控：检测到立即隐藏子窗口；结束后恢复
      this.screenshotWatcher = new ScreenshotWatcher();
      this.screenshotWatcher.onChange((capturing) => {
        try {
          if (capturing) {
            // 统一走已有的保存+隐藏逻辑：包含 control-bar、main-content 以及所有子窗口
            this.hideFloatingWindows();
          } else {
            // 截图结束，按保存的状态一次性恢复
            this.showFloatingWindows();
          }
        } catch {}
      });
      this.screenshotWatcher.start();
    } catch (error) {
      log.error('initialize', '窗口管理器初始化失败', {}, error);
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
   * 更新 AI 窗口尺寸
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

    // 监听 AI 问答窗口事件用于联动历史窗口和 interviewer 窗口定位
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
   * 显示浮动窗口（恢复隐藏前的状态）
   */
  public showFloatingWindows(): void {
    // 显示控制条窗口
    this.controlBarWindow.show();
    this.appState.isControlBarVisible = true;
    this.appState.isCloseButtonVisible = true;

    // 广播应用可见性变化
    const { broadcastAppVisibilityChanged } = require('../ipc/handlers.js');
    broadcastAppVisibilityChanged(true);

    // 通知菜单更新
    try {
      const { ipcMain } = require('electron');
      ipcMain.emit('update-tray-menu');
    } catch {}

    // 如果从未隐藏过，恢复到当前实际状态；否则恢复到隐藏前的状态
    if (!this.hasEverBeenHidden) {
      // 第一次显示，恢复当前实际状态
      if (this.appState.isMainContentVisible) {
        this.mainContentWindow.show();
      }
      if (this.appState.isAIQuestionVisible) {
        this.aiQuestionWindow.show();
      }
      if (this.isAIQuestionHistoryVisible()) {
        this.showAIQuestionHistoryNextToAI();
      }
      if (this.isInterviewerVisible()) {
        this.showInterviewerNextToAI();
      }
    } else {
      // 恢复隐藏前的状态
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
    }

    // 初始时确保焦点在 control-bar
    setTimeout(() => this.ensureMainFocus(), 100);
  }

  /**
   * 隐藏浮动窗口（保存当前状态）
   */
  public hideFloatingWindows(): void {
    // 保存所有窗口当前的实际可见状态
    this.windowStatesBeforeHide = {
      isMainContentVisible: this.mainContentWindow.isVisible(),
      isAIQuestionVisible: this.aiQuestionWindow.isVisible(),
      isAIQuestionHistoryVisible: this.isAIQuestionHistoryVisible(),
      isInterviewerVisible: this.isInterviewerVisible(),
    };
    this.hasEverBeenHidden = true;

    // 隐藏所有子窗口
    this.hideAllChildWindows();

    // 隐藏 main-content 窗口
    if (this.mainContentWindow.isVisible()) {
      this.mainContentWindow.hide();
      this.appState.isMainContentVisible = false;
    }

    // 隐藏控制条窗口
    this.controlBarWindow.hide();
    this.appState.isControlBarVisible = false;
    this.appState.isCloseButtonVisible = false;

    // 广播应用可见性变化
    const { broadcastAppVisibilityChanged } = require('../ipc/handlers.js');
    broadcastAppVisibilityChanged(false);

    // 通知菜单更新
    try {
      const { ipcMain } = require('electron');
      ipcMain.emit('update-tray-menu');
    } catch {}
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
   * 获取 AI 问答窗口实例
   */
  public getAIQuestionWindow(): AIQuestionWindow {
    return this.aiQuestionWindow;
  }

  /**
   * 获取主内容窗口实例
   */
  public getMainContentWindow(): MainContentWindow {
    return this.mainContentWindow;
  }

  /**
   * 显示 AI 问答窗口
   */
  public showAIQuestion(): void {
    this.aiQuestionWindow.show();
    this.appState.isAIQuestionVisible = true;
  }

  /**
   * 隐藏 AI 问答窗口
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
   * 切换 AI 问答窗口显示状态
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

  // === Interviewer 窗口相关 ===
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
   * 设置 AI 窗口高度百分比
   */
  public setAIWindowHeightPercentage(percentage: number): void {
    this.aiWindowHeightPercentage = percentage;
    this.aiQuestionWindow.setHeightPercentage(percentage);

    // 同步更新其他窗口
    if (this.isAIQuestionHistoryVisible()) {
      this.showAIQuestionHistoryNextToAI();
    }
    if (this.isInterviewerVisible()) {
      this.showInterviewerNextToAI();
    }
  }

  /**
   * 获取 AI 窗口高度百分比
   */
  public getAIWindowHeightPercentage(): number {
    return this.aiWindowHeightPercentage;
  }

  /**
   * 切换 AI 窗口模式
   */
  public switchToMode(
    mode: 'voice-qa' | 'mock-interview' | 'interview-training',
    jobId?: string,
  ): void {
    // 向 AI Question 窗口发送模式切换事件
    if (this.aiQuestionWindow.getBrowserWindow()) {
      this.aiQuestionWindow.getBrowserWindow()!.webContents.send('mode-change', mode, jobId);
    }

    // 向 AI Question History 窗口发送模式切换事件
    if (this.aiQuestionHistoryWindow.getBrowserWindow()) {
      this.aiQuestionHistoryWindow.getBrowserWindow()!.webContents.send('mode-change', mode, jobId);
    }

    // 向 Interviewer 窗口发送模式切换事件
    if (this.interviewerWindow.getBrowserWindow()) {
      this.interviewerWindow.getBrowserWindow()!.webContents.send('mode-change', mode, jobId);
    }
  }

  /**
   * 设置"提问 AI"按钮的禁用状态
   */
  public setAskAIButtonDisabled(disabled: boolean): void {
    // 向 control-bar 窗口发送按钮禁用状态事件
    if (this.controlBarWindow.getBrowserWindow()) {
      this.controlBarWindow
        .getBrowserWindow()!
        .webContents.send('ask-ai-button-disabled', disabled);
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
   * 在隐藏状态下准备打开面试窗口
   * 不直接显示窗口，而是更新状态，等待恢复时显示
   */
  public prepareInterviewWindowsWhileHidden(): void {
    // 更新隐藏前状态，标记这些窗口应该在恢复时显示
    this.windowStatesBeforeHide.isAIQuestionVisible = true;
    this.windowStatesBeforeHide.isAIQuestionHistoryVisible = true;
    this.windowStatesBeforeHide.isInterviewerVisible = true;
    this.hasEverBeenHidden = true;
  }

  /**
   * 销毁窗口管理器
   */

  /**
   * 切换点击穿透模式 - 供快捷键调用
   */
  public toggleClickThroughMode(): void {
    try {
      const toggleFn = (global as any).toggleClickThroughMode;
      if (typeof toggleFn === 'function') {
        toggleFn();
      } else {
        log.error('toggleClickThroughMode', 'toggleClickThroughMode 函数未找到');
      }
    } catch (error) {
      log.error('toggleClickThroughMode', '调用点击穿透切换函数失败', {}, error);
    }
  }

  public destroy(): void {
    // 停止截图监听器
    if (this.screenshotWatcher) {
      this.screenshotWatcher.stop();
    }

    // 断开 WebSocket 连接
    this.webSocketClient.disconnect();

    this.controlBarWindow.destroy();
    this.mainContentWindow.destroy();
    this.aiQuestionWindow.destroy();
    this.aiQuestionHistoryWindow.destroy();
    this.interviewerWindow.destroy();
    this.trayMenuWindow.destroy();
  }

  /**
   * 显示托盘菜单窗口
   */
  public showTrayMenu(tray: Tray | null): void {
    if (!this.trayMenuWindow) return;
    this.trayMenuWindow.showNearTray(tray);
  }

  /**
   * 隐藏托盘菜单窗口
   */
  public hideTrayMenu(): void {
    if (!this.trayMenuWindow) return;
    this.trayMenuWindow.hide();
  }

  /**
   * 切换托盘菜单窗口显示状态
   */
  public toggleTrayMenu(tray: Tray | null): void {
    if (!this.trayMenuWindow) return;
    if (this.trayMenuWindow.isVisible()) {
      this.trayMenuWindow.hide();
    } else {
      this.trayMenuWindow.showNearTray(tray);
    }
  }

  /**
   * 通知托盘菜单设置已变更
   */
  public notifyTrayMenuSettingsChanged(): void {
    if (this.trayMenuWindow) {
      this.trayMenuWindow.notifySettingsChanged();
    }
  }
}
