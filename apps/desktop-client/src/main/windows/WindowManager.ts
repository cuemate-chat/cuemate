import type { BrowserWindow } from 'electron';
import type { AppState } from '../../shared/types.js';
import { logger } from '../../utils/logger.js';
import { ControlBarWindow } from './ControlBarWindow.js';
import { MainContentWindow } from './MainContentWindow.js';
import { WebSocketClient } from '../websocket/WebSocketClient.js';

export class WindowManager {
  private controlBarWindow: ControlBarWindow;
  private mainContentWindow: MainContentWindow;
  private webSocketClient: WebSocketClient;
  private isDevelopment: boolean;
  private appState: AppState;

  constructor(isDevelopment: boolean = false) {
    this.isDevelopment = isDevelopment;

    // 初始化应用状态
    this.appState = {
      isControlBarVisible: true,
      isCloseButtonVisible: false, // 关闭按钮状态由组件内部管理
      isMainContentVisible: false,
    };

    // 创建窗口实例 - control-bar 现在作为主焦点窗口，关闭按钮已集成
    this.controlBarWindow = new ControlBarWindow(this.isDevelopment);
    this.mainContentWindow = new MainContentWindow(this.isDevelopment);
    
    // 创建 WebSocket 客户端
    this.webSocketClient = new WebSocketClient(this);
  }

  /**
   * 初始化窗口管理器
   */
  public async initialize(): Promise<void> {
    logger.info('开始初始化窗口管理器');

    try {
      // 1. 创建控制条窗口（现在作为主焦点窗口）
      await this.controlBarWindow.create();
      logger.info('control-bar 控制条窗口已创建（作为主焦点窗口）');

      // 2. 创建主内容窗口（初始隐藏）
      await this.mainContentWindow.create();
      logger.info('main-content 主内容窗口已创建');

      // 3. 设置窗口事件监听
      this.setupWindowEvents();

      // 4. 显示浮动窗口（control-bar）
      this.showFloatingWindows();

      logger.info('窗口管理器初始化完成');
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
      controlBarWindow.on('focus', () => {
        logger.info('control-bar 获得焦点（作为主焦点窗口，这是正常的）');
      });

      // 关闭按钮已集成到控制条窗口中，不需要单独处理移动事件
    }

    // 关闭按钮已集成到控制条窗口中，不需要单独监听事件

    // 监听主内容窗口事件
    const mainContentWindow = this.mainContentWindow.getBrowserWindow();
    if (mainContentWindow) {
      // 允许 main-content 在交互期间获得焦点（以便键盘输入）。
      // 当 main-content 失去焦点或被隐藏/关闭后，再恢复到 control-bar。
      mainContentWindow.on('focus', () => {
        logger.info('main-content 获得焦点（允许输入，不立刻切回 control-bar）');
      });

      mainContentWindow.on('blur', () => {
        logger.info('main-content 失去焦点，恢复 control-bar 焦点');
        setTimeout(() => this.ensureMainFocus(), 0);
      });

      mainContentWindow.on('hide', () => {
        logger.info('main-content 被隐藏，恢复 control-bar 焦点');
        setTimeout(() => this.ensureMainFocus(), 0);
      });

      mainContentWindow.on('close', (event) => {
        // 阻止窗口关闭，改为隐藏
        event.preventDefault();
        this.hideMainContent();
      });
    }
  }

  /**
   * 确保焦点在主焦点窗口上（现在是 control-bar）
   */
  public ensureMainFocus(): void {
    this.controlBarWindow.ensureFocus();
    logger.info('焦点已恢复到 control-bar 主焦点窗口');
  }

  /**
   * 显示浮动窗口
   */
  public showFloatingWindows(): void {
    logger.info('显示浮动窗口');

    this.controlBarWindow.show();
    this.appState.isControlBarVisible = true;
    this.appState.isCloseButtonVisible = true; // 统一状态管理

    // 初始时确保焦点在 control-bar
    setTimeout(() => this.ensureMainFocus(), 100);
  }

  /**
   * 隐藏浮动窗口
   */
  public hideFloatingWindows(): void {
    logger.info('隐藏浮动窗口');

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
    logger.info('显示关闭按钮');
  }

  /**
   * 隐藏关闭按钮 - 由控制条组件内部管理
   */
  public hideCloseButton(): void {
    this.appState.isCloseButtonVisible = false;
    logger.info('隐藏关闭按钮');
  }

  /**
   * 显示主内容窗口
   */
  public showMainContent(): void {
    this.mainContentWindow.show();
    this.appState.isMainContentVisible = true;
    logger.info('主内容窗口已显示');
    // 不立即切回 control-bar，允许用户在 main-content 输入
  }

  /**
   * 隐藏主内容窗口
   */
  public hideMainContent(): void {
    this.mainContentWindow.hide();
    this.appState.isMainContentVisible = false;
    logger.info('主内容窗口已隐藏');

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
    logger.info({ url }, '🔗 打开外部链接');
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
  }
}
