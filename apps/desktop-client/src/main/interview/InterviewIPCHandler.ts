/**
 * 面试系统主进程 IPC 处理器
 * 负责处理窗口间的消息转发和状态同步
 */

import { BrowserWindow, ipcMain, IpcMainEvent } from 'electron';
import { InterviewIPCEvents } from '../../renderer/ai-question/components/mock-interview/ipc/InterviewIPCService';
import { createLogger } from '../../utils/logger.js';

const log = createLogger('InterviewIPCHandler');

interface WindowReference {
  id: number;
  window: BrowserWindow;
  type: 'ai-question' | 'control-bar';
}

export class InterviewIPCHandler {
  private windows: Map<number, WindowReference> = new Map();
  private isInitialized = false;
  private currentInterviewState: any = null;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (this.isInitialized) return;

    try {
      // 注册所有面试相关的 IPC 处理器
      this.registerEventHandlers();
      this.isInitialized = true;
    } catch (error) {
      log.error('initialize', `Failed to initialize Interview IPC Handler: ${error}`);
    }
  }

  private registerEventHandlers(): void {
    // 通用事件转发处理器
    Object.values(InterviewIPCEvents).forEach((eventType) => {
      ipcMain.on(`interview:${eventType}`, (ipcEvent: IpcMainEvent, data: any) => {
        this.handleInterviewEvent(ipcEvent, eventType, data);
      });
    });

    // 窗口注册和注销
    ipcMain.on(
      'interview:register-window',
      (event: IpcMainEvent, windowType: 'ai-question' | 'control-bar') => {
        this.registerWindow(event, windowType);
      },
    );

    ipcMain.on('interview:unregister-window', (ipcEvent: IpcMainEvent) => {
      this.unregisterWindow(ipcEvent);
    });

    // 获取当前状态
    ipcMain.handle('interview:get-current-state', () => {
      return this.currentInterviewState;
    });

    // 设置当前状态
    ipcMain.on('interview:set-current-state', (_event: IpcMainEvent, state: any) => {
      this.currentInterviewState = { ...state, timestamp: Date.now() };
      this.broadcastToAllWindows(
        InterviewIPCEvents.PROVIDE_CURRENT_STATE,
        this.currentInterviewState,
      );
    });
  }

  private handleInterviewEvent(ipcEvent: IpcMainEvent, event: string, data: any): void {
    const senderWindow = this.getWindowByWebContentsId(ipcEvent.sender.id);

    if (!senderWindow) {
      log.warn('handleInterviewEvent', `Unknown sender for interview event: ${event}`);
      return;
    }

    // 根据事件类型处理不同的逻辑
    switch (event) {
      case InterviewIPCEvents.INTERVIEW_STARTED:
        this.handleInterviewStarted(senderWindow, data);
        break;

      case InterviewIPCEvents.INTERVIEW_ENDED:
        this.handleInterviewEnded(senderWindow, data);
        break;

      case InterviewIPCEvents.INTERVIEW_STATE_CHANGED:
        this.handleStateChanged(senderWindow, data);
        break;

      case InterviewIPCEvents.VOICE_STATE_CHANGED:
        this.handleVoiceStateChanged(senderWindow, data);
        break;

      case InterviewIPCEvents.SHOW_CONTROL_BAR:
        this.handleShowControlBar(senderWindow, data);
        break;

      case InterviewIPCEvents.HIDE_CONTROL_BAR:
        this.handleHideControlBar(senderWindow, data);
        break;

      case InterviewIPCEvents.REQUEST_CURRENT_STATE:
        this.handleRequestCurrentState(senderWindow);
        break;

      default:
        // 默认转发到其他窗口
        this.forwardToOtherWindows(senderWindow, event, data);
        break;
    }
  }

  private handleInterviewStarted(_sender: WindowReference, data: any): void {
    this.currentInterviewState = {
      ...this.currentInterviewState,
      isActive: true,
      interviewId: data.interviewId,
      config: data.config,
      startTime: data.timestamp,
    };

    // 通知所有窗口面试开始
    this.broadcastToAllWindows(InterviewIPCEvents.INTERVIEW_STARTED, data);

    // 显示控制栏
    this.showControlBarWindow();
  }

  private handleInterviewEnded(_sender: WindowReference, data: any): void {
    this.currentInterviewState = {
      ...this.currentInterviewState,
      isActive: false,
      endTime: data.timestamp,
      summary: data.summary,
    };

    // 通知所有窗口面试结束
    this.broadcastToAllWindows(InterviewIPCEvents.INTERVIEW_ENDED, data);

    // 隐藏控制栏
    this.hideControlBarWindow();
  }

  private handleStateChanged(sender: WindowReference, data: any): void {
    this.currentInterviewState = {
      ...this.currentInterviewState,
      ...data,
    };

    // 转发到其他窗口
    this.forwardToOtherWindows(sender, InterviewIPCEvents.INTERVIEW_STATE_CHANGED, data);
  }

  private handleVoiceStateChanged(sender: WindowReference, data: any): void {
    this.currentInterviewState = {
      ...this.currentInterviewState,
      voiceState: data,
    };

    // 转发到其他窗口
    this.forwardToOtherWindows(sender, InterviewIPCEvents.VOICE_STATE_CHANGED, data);
  }

  private handleShowControlBar(_sender: WindowReference, _data: any): void {
    this.showControlBarWindow();
  }

  private handleHideControlBar(_sender: WindowReference, _data: any): void {
    this.hideControlBarWindow();
  }

  private handleRequestCurrentState(sender: WindowReference): void {
    if (this.currentInterviewState) {
      this.sendToWindow(
        sender,
        InterviewIPCEvents.PROVIDE_CURRENT_STATE,
        this.currentInterviewState,
      );
    }
  }

  private showControlBarWindow(): void {
    const controlBarWindow = this.getWindowByType('control-bar');
    if (controlBarWindow?.window && !controlBarWindow.window.isDestroyed()) {
      controlBarWindow.window.show();
      controlBarWindow.window.focus();
    }
  }

  private hideControlBarWindow(): void {
    const controlBarWindow = this.getWindowByType('control-bar');
    if (controlBarWindow?.window && !controlBarWindow.window.isDestroyed()) {
      controlBarWindow.window.hide();
    }
  }

  // 窗口管理方法
  registerWindow(event: IpcMainEvent, windowType: 'ai-question' | 'control-bar'): void {
    const webContents = event.sender;
    const browserWindow = BrowserWindow.fromWebContents(webContents);

    if (!browserWindow) {
      log.error('registerWindow', 'Cannot register window: BrowserWindow not found');
      return;
    }

    const windowRef: WindowReference = {
      id: webContents.id,
      window: browserWindow,
      type: windowType,
    };

    this.windows.set(webContents.id, windowRef);

    // 监听窗口关闭事件
    browserWindow.on('closed', () => {
      this.windows.delete(webContents.id);
    });

    // 如果是新注册的窗口，发送当前状态
    if (this.currentInterviewState) {
      this.sendToWindow(
        windowRef,
        InterviewIPCEvents.PROVIDE_CURRENT_STATE,
        this.currentInterviewState,
      );
    }
  }

  unregisterWindow(event: IpcMainEvent): void {
    const webContentsId = event.sender.id;
    if (this.windows.has(webContentsId)) {
      this.windows.delete(webContentsId);
    }
  }

  private getWindowByWebContentsId(webContentsId: number): WindowReference | undefined {
    return this.windows.get(webContentsId);
  }

  private getWindowByType(type: 'ai-question' | 'control-bar'): WindowReference | undefined {
    for (const windowRef of this.windows.values()) {
      if (windowRef.type === type) {
        return windowRef;
      }
    }
    return undefined;
  }

  // 消息转发方法
  private sendToWindow(windowRef: WindowReference, event: string, data: any): void {
    if (windowRef.window.isDestroyed() || !windowRef.window.webContents) {
      return;
    }

    try {
      windowRef.window.webContents.send(`interview:${event}`, data);
    } catch (error) {
      log.error('sendToWindow', `Failed to send event ${event} to window ${windowRef.id}: ${error}`);
    }
  }

  private forwardToOtherWindows(sender: WindowReference, event: string, data: any): void {
    this.windows.forEach((windowRef) => {
      if (windowRef.id !== sender.id) {
        this.sendToWindow(windowRef, event, data);
      }
    });
  }

  private broadcastToAllWindows(event: string, data: any): void {
    this.windows.forEach((windowRef) => {
      this.sendToWindow(windowRef, event, data);
    });
  }

  // 公共方法
  getCurrentState(): any {
    return this.currentInterviewState;
  }

  getRegisteredWindows(): WindowReference[] {
    return Array.from(this.windows.values());
  }

  isInterviewActive(): boolean {
    return this.currentInterviewState?.isActive || false;
  }

  // 清理方法
  destroy(): void {
    // 移除所有 IPC 监听器
    Object.values(InterviewIPCEvents).forEach((event) => {
      ipcMain.removeAllListeners(`interview:${event}`);
    });

    ipcMain.removeAllListeners('interview:register-window');
    ipcMain.removeAllListeners('interview:unregister-window');
    ipcMain.removeAllListeners('interview:get-current-state');
    ipcMain.removeAllListeners('interview:set-current-state');

    this.windows.clear();
    this.currentInterviewState = null;
    this.isInitialized = false;
  }
}

// 单例实例
export const interviewIPCHandler = new InterviewIPCHandler();
