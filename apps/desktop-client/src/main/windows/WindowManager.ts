import { ControlBarWindow } from './ControlBarWindow.js';
import { CloseButtonWindow } from './CloseButtonWindow.js';
import { MainContentWindow } from './MainContentWindow.js';
import type { AppState } from '../../shared/types.js';

export class WindowManager {
  private controlBarWindow: ControlBarWindow;
  private closeButtonWindow: CloseButtonWindow;
  private mainContentWindow: MainContentWindow;
  private isDevelopment: boolean;
  private appState: AppState;

  constructor(isDevelopment: boolean = false) {
    this.isDevelopment = isDevelopment;
    
    // 初始化应用状态
    this.appState = {
      isControlBarVisible: true,
      isCloseButtonVisible: false,
      isMainContentVisible: false,
    };

    // 创建窗口实例 - control-bar 现在作为主焦点窗口
    this.controlBarWindow = new ControlBarWindow(this.isDevelopment);
    this.closeButtonWindow = new CloseButtonWindow(this.isDevelopment);
    this.mainContentWindow = new MainContentWindow(this.isDevelopment);
  }

  /**
   * 初始化窗口管理器
   */
  public async initialize(): Promise<void> {
    console.log('🏗️ 开始初始化窗口管理器');

    try {
      // 1. 创建控制条窗口（现在作为主焦点窗口）
      await this.controlBarWindow.create();
      console.log('✅ control-bar 控制条窗口已创建（作为主焦点窗口）');

      // 2. 创建关闭按钮窗口（初始隐藏）
      await this.closeButtonWindow.create();
      console.log('✅ close-button 关闭按钮窗口已创建');

      // 3. 创建主内容窗口（初始隐藏）
      await this.mainContentWindow.create();
      console.log('✅ main-content 主内容窗口已创建');

      // 5. 设置窗口位置关系
      this.updateCloseButtonPosition();

      // 6. 设置窗口事件监听
      this.setupWindowEvents();

      // 4. 显示浮动窗口（control-bar 和 close-button）
      this.showFloatingWindows();

      console.log('🎯 窗口管理器初始化完成');
    } catch (error) {
      console.error('❌ 窗口管理器初始化失败:', error);
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
        console.log('🎯 control-bar 获得焦点（作为主焦点窗口，这是正常的）');
      });

      controlBarWindow.on('move', () => {
        // 当控制条移动时，更新关闭按钮位置
        this.updateCloseButtonPosition();
      });
    }

    // 监听关闭按钮窗口事件
    const closeButtonWindow = this.closeButtonWindow.getBrowserWindow();
    if (closeButtonWindow) {
      closeButtonWindow.on('focus', () => {
        console.log('🔍 close-button 获得焦点，立即恢复到主焦点');
        setTimeout(() => this.ensureMainFocus(), 0);
      });
    }

    // 监听主内容窗口事件
    const mainContentWindow = this.mainContentWindow.getBrowserWindow();
    if (mainContentWindow) {
      mainContentWindow.on('focus', () => {
        console.log('🔍 main-content 获得焦点，立即恢复到主焦点');
        setTimeout(() => this.ensureMainFocus(), 100); // 稍微延迟，允许用户交互
      });

      mainContentWindow.on('close', (event) => {
        // 阻止窗口关闭，改为隐藏
        event.preventDefault();
        this.hideMainContent();
      });
    }
  }

  /**
   * 更新关闭按钮位置（跟随控制条）
   */
  private updateCloseButtonPosition(): void {
    const controlBarWindow = this.controlBarWindow.getBrowserWindow();
    const closeButtonWindow = this.closeButtonWindow.getBrowserWindow();

    if (controlBarWindow && closeButtonWindow) {
      const controlBarBounds = controlBarWindow.getBounds();
      const closeButtonBounds = closeButtonWindow.getBounds();

      // 计算关闭按钮位置（控制条右侧）
      const newX = controlBarBounds.x + controlBarBounds.width;
      const newY = controlBarBounds.y + Math.floor((controlBarBounds.height - closeButtonBounds.height) / 2);

      closeButtonWindow.setPosition(newX, newY);
    }
  }

  /**
   * 确保焦点在主焦点窗口上（现在是 control-bar）
   */
  public ensureMainFocus(): void {
    this.controlBarWindow.ensureFocus();
    console.log('🎯 焦点已恢复到 control-bar 主焦点窗口');
  }

  /**
   * 显示浮动窗口
   */
  public showFloatingWindows(): void {
    console.log('👀 显示浮动窗口');
    
    this.controlBarWindow.show();
    this.appState.isControlBarVisible = true;
    
    // 确保焦点在锚点
    setTimeout(() => this.ensureMainFocus(), 100);
  }

  /**
   * 隐藏浮动窗口
   */
  public hideFloatingWindows(): void {
    console.log('👁️ 隐藏浮动窗口');
    
    this.controlBarWindow.hide();
    this.closeButtonWindow.hide();
    
    this.appState.isControlBarVisible = false;
    this.appState.isCloseButtonVisible = false;
    
    // 确保焦点在锚点
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
   * 显示关闭按钮
   */
  public showCloseButton(): void {
    if (!this.appState.isCloseButtonVisible) {
      this.updateCloseButtonPosition();
      this.closeButtonWindow.show();
      this.appState.isCloseButtonVisible = true;
      console.log('🔴 关闭按钮已显示');
    }
  }

  /**
   * 隐藏关闭按钮
   */
  public hideCloseButton(): void {
    if (this.appState.isCloseButtonVisible) {
      this.closeButtonWindow.hide();
      this.appState.isCloseButtonVisible = false;
      console.log('⚪ 关闭按钮已隐藏');
    }
  }

  /**
   * 显示主内容窗口
   */
  public showMainContent(): void {
    this.mainContentWindow.show();
    this.appState.isMainContentVisible = true;
    console.log('📱 主内容窗口已显示');
    
    // 延迟恢复焦点，给用户操作时间
    setTimeout(() => this.ensureMainFocus(), 300);
  }

  /**
   * 隐藏主内容窗口
   */
  public hideMainContent(): void {
    this.mainContentWindow.hide();
    this.appState.isMainContentVisible = false;
    console.log('📱 主内容窗口已隐藏');
    
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
    console.log('🔗 打开外部链接:', url);
  }

  /**
   * 获取应用状态
   */
  public getAppState(): AppState {
    return { ...this.appState };
  }

  /**
   * 销毁窗口管理器
   */
  public destroy(): void {
    console.log('🗑️ 销毁窗口管理器');
    
    this.controlBarWindow.destroy();
    this.closeButtonWindow.destroy();
    this.mainContentWindow.destroy();
  }
}