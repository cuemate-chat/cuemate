import { shell } from 'electron';
import WebSocket from 'ws';
import { logger } from '../../utils/logger.js';
import { getVoiceState } from '../../utils/voiceState.js';
import { PiperTTS } from '../audio/PiperTTS.js';
import type { WindowManager } from '../windows/WindowManager.js';

interface WebSocketMessage {
  type: string;
  data?: any;
  url?: string;
  user?: any;
  clientId?: string;
  clientType?: string;
  mode?: 'mock-interview' | 'interview-training';
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
          logger.error({ error }, 'WebSocket 消息解析失败');
        }
      });

      this.ws.on('close', (code, reason) => {
        logger.warn({ code, reason: reason.toString() }, 'WebSocket 连接关闭');
        this.handleReconnect();
      });

      this.ws.on('error', (error) => {
        logger.error({ error }, 'WebSocket 连接错误');
      });
    } catch (error) {
      logger.error({ error }, 'WebSocket 连接初始化失败');
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
          logger.error({ error }, '上报 ASR 设备失败');
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
          logger.warn('当前正在面试中，忽略打开窗口请求');
          break;
        }

        const appState = this.windowManager.getAppState();

        // 检查窗口是否处于隐藏状态
        if (!appState.isControlBarVisible) {
          // 在隐藏状态下，准备面试窗口状态，等待恢复时显示
          const mode = message.mode || 'mock-interview';
          this.windowManager.switchToMode(mode);
          this.windowManager.prepareInterviewWindowsWhileHidden();
          logger.info({ mode }, '窗口处于隐藏状态，已准备面试窗口，等待恢复显示');
          break;
        }

        // 检查窗口是否已经打开
        const isInterviewerVisible = this.windowManager.isInterviewerVisible();
        const isAIQuestionVisible = appState.isAIQuestionVisible;

        if (isInterviewerVisible && isAIQuestionVisible) {
          logger.warn('面试窗口已经打开，忽略重复请求');
          break;
        }

        // 打开面试窗口（三个窗口）
        const mode = message.mode || 'mock-interview';
        this.windowManager.switchToMode(mode);
        this.windowManager.showAIQuestion();
        this.windowManager.showAIQuestionHistoryNextToAI();
        this.windowManager.showInterviewerNextToAI();

        logger.info({ mode }, '已打开面试窗口');
        break;
      }

      default:
        logger.warn({ messageType: message.type }, 'WebSocket: 未知消息类型');
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
        logger.error({ error }, 'WebSocket 消息发送失败');
      }
    } else {
      logger.warn('WebSocket 未连接，无法发送消息');
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
      logger.error('WebSocket 重连次数超过限制，停止重连');
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
