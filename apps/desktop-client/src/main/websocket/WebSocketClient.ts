import { shell } from 'electron';
import WebSocket from 'ws';
import { createLogger } from '../../utils/logger.js';
import { getVoiceState } from '../../utils/voiceState.js';
import { PiperTTS } from '../audio/PiperTTS.js';
import type { WindowManager } from '../windows/WindowManager.js';
import { setCachedAuth, clearCachedAuth } from '../ipc/handlers.js';

const log = createLogger('WebSocketClient');

interface WebSocketMessage {
  type: string;
  data?: any;
  url?: string;
  user?: any;
  clientId?: string;
  clientType?: string;
  mode?: 'mock-interview' | 'interview-training';
  jobId?: string;
  version?: string;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private windowManager: WindowManager;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private wsUrl = 'ws://127.0.0.1:3001';

  constructor(windowManager: WindowManager) {
    this.windowManager = windowManager;
  }

  /**
   * 连接到后端 WebSocket 服务器
   */
  public connect(): void {
    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.on('open', () => {
        this.reconnectAttempts = 0;

        // 注册为 desktop 客户端
        this.send({
          type: 'REGISTER',
          client: 'desktop',
        });
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          log.error('connect', 'WebSocket 消息解析失败', {}, error);
        }
      });

      this.ws.on('close', (code, reason) => {
        log.warn('connect', 'WebSocket 连接关闭', { code, reason: reason.toString() });
        this.handleReconnect();
      });

      this.ws.on('error', (error) => {
        log.error('connect', 'WebSocket 连接错误', {}, error);
      });
    } catch (error) {
      log.error('connect', 'WebSocket 连接初始化失败', {}, error);
      this.handleReconnect();
    }
  }

  /**
   * 处理收到的 WebSocket 消息
   */
  private async handleMessage(message: WebSocketMessage): Promise<void> {
    switch (message.type) {
      case 'CONNECTION_ACK':
        break;

      case 'REGISTER_ACK':
        break;

      case 'OPEN_EXTERNAL':
        if (message.url) {
          shell.openExternal(message.url);
        }
        break;

      case 'LOGIN_SUCCESS':
        // 设置用户语言偏好
        if (message.user && message.user.locale) {
          const userLocale = message.user.locale;
          if (userLocale === 'zh-CN' || userLocale === 'zh-TW' || userLocale === 'en-US') {
            PiperTTS.setUserLanguage(userLocale);
          }
        }

        // 刷新登录状态缓存（获取 token）
        try {
          const response = await fetch('http://127.0.0.1:3001/auth/login-status', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(5000),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.isLoggedIn && data.user && data.token) {
              setCachedAuth(data.user, data.token);
              log.info('handleMessage', '登录状态缓存已更新');
            }
          }
        } catch (error) {
          log.error('handleMessage', '刷新登录状态缓存失败', {}, error);
        }

        // 通知 control-bar 登录成功
        const controlBarWindow = this.windowManager.getControlBarWindow();
        if (controlBarWindow && !controlBarWindow.isDestroyed()) {
          controlBarWindow.webContents.send('websocket-login-success', {
            isLoggedIn: true,
            user: message.user,
          });
        }
        break;

      case 'LOGOUT':
        // 清空登录状态缓存
        try {
          clearCachedAuth();
          log.info('handleMessage', '登录状态缓存已清空');
        } catch (error) {
          log.error('handleMessage', '清空登录状态缓存失败', {}, error);
        }

        // 通知 control-bar 登出
        const controlBarWindowLogout = this.windowManager.getControlBarWindow();
        if (controlBarWindowLogout && !controlBarWindowLogout.isDestroyed()) {
          controlBarWindowLogout.webContents.send('websocket-logout', {
            isLoggedIn: false,
          });
        }
        break;

      case 'REQUEST_ASR_DEVICES': {
        // 枚举麦克风与扬声器设备并上报
        try {
          const enumerate = async (): Promise<{ microphones: any[]; speakers: any[] }> => {
            const microphones: any[] = [];
            try {
              const devices = await (global as any).navigator?.mediaDevices?.enumerateDevices?.();
              if (devices) {
                devices
                  .filter((d: any) => d.kind === 'audioinput')
                  .forEach((d: any) =>
                    microphones.push({ id: d.deviceId, name: d.label || '麦克风' }),
                  );
              }
            } catch {}

            let speakers: any[] = [];
            try {
              const { SystemAudioCapture } = await import('../audio/SystemAudioCapture.js');
              speakers = await (SystemAudioCapture as any).getAudioDevices();
            } catch {}

            return { microphones, speakers };
          };

          enumerate().then((data) => {
            this.send({ type: 'ASR_DEVICES', data });
          });
        } catch (error) {
          log.error('handleMessage', '上报 ASR 设备失败', {}, error);
        }
        break;
      }

      case 'OPEN_INTERVIEWER': {
        // 检查当前状态
        const currentState = getVoiceState();

        // 如果正在面试中，不做任何操作
        if (
          currentState.mode !== 'none' &&
          currentState.subState !== 'idle' &&
          (currentState.mode === 'mock-interview' || currentState.mode === 'interview-training')
        ) {
          log.warn('handleMessage', '当前正在面试中，忽略打开窗口请求');
          break;
        }

        const appState = this.windowManager.getAppState();
        const mode = message.mode || 'mock-interview';
        const jobId = message.jobId;

        // 检查窗口是否处于隐藏状态
        if (!appState.isControlBarVisible) {
          // 在隐藏状态下，准备面试窗口状态，等待恢复时显示
          this.windowManager.switchToMode(mode, jobId);
          this.windowManager.prepareInterviewWindowsWhileHidden();
          log.info('handleMessage', '窗口处于隐藏状态，已准备面试窗口，等待恢复显示', { mode, jobId });
          break;
        }

        // 检查窗口是否已经打开
        const isInterviewerVisible = this.windowManager.isInterviewerVisible();
        const isAIQuestionVisible = appState.isAIQuestionVisible;

        if (isInterviewerVisible && isAIQuestionVisible) {
          log.warn('handleMessage', '面试窗口已经打开，忽略重复请求');
          break;
        }

        // 打开面试窗口（三个窗口）
        this.windowManager.switchToMode(mode, jobId);
        this.windowManager.showAIQuestion();
        this.windowManager.showAIQuestionHistoryNextToAI();
        this.windowManager.showInterviewerNextToAI();

        log.info('handleMessage', '已打开面试窗口', { mode, jobId });
        break;
      }

      case 'UPDATE_VERSION': {
        if (!message.version) {
          log.warn('handleMessage', 'UPDATE_VERSION 消息缺少版本号');
          break;
        }

        const targetVersion = message.version;
        log.info('handleMessage', '收到版本更新请求', { version: targetVersion });

        // 动态导入 UpdateService
        import('../services/UpdateService.js').then(({ UpdateService }) => {
          const updateService = new UpdateService(this);
          updateService.startUpdate(targetVersion).catch((error) => {
            log.error('handleMessage', '版本更新失败', {}, error);
          });
        }).catch((error) => {
          log.error('handleMessage', '加载 UpdateService 失败', {}, error);
        });
        break;
      }

      default:
        log.warn('handleMessage', '未知消息类型', { messageType: message.type });
    }
  }

  /**
   * 发送消息到 WebSocket 服务器
   */
  public send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        log.error('send', 'WebSocket 消息发送失败', {}, error);
      }
    } else {
      log.warn('send', 'WebSocket 未连接，无法发送消息');
    }
  }

  /**
   * 处理重连逻辑
   */
  private handleReconnect(): void {
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;

      this.reconnectInterval = setTimeout(() => {
        this.connect();
      }, this.reconnectDelay);
    } else {
      log.error('handleReconnect', 'WebSocket 重连次数超过限制，停止重连');
    }
  }

  /**
   * 断开 WebSocket 连接
   */
  public disconnect(): void {
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
      this.reconnectInterval = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * 检查连接状态
   */
  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
