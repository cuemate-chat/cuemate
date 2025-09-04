import WebSocket from 'ws';
import { shell } from 'electron';
import { logger } from '../../utils/logger.js';
import type { WindowManager } from '../windows/WindowManager.js';

interface WebSocketMessage {
  type: string;
  data?: any;
  url?: string;
  user?: any;
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
      logger.info(`尝试连接到 WebSocket 服务器: ${this.wsUrl}`);
      this.ws = new WebSocket(this.wsUrl);

      this.ws.on('open', () => {
        logger.info('WebSocket 连接成功');
        this.reconnectAttempts = 0;
        
        // 注册为 desktop 客户端
        this.send({
          type: 'REGISTER',
          client: 'desktop'
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
  private handleMessage(message: WebSocketMessage): void {
    logger.info({ message }, '收到 WebSocket 消息');

    switch (message.type) {
      case 'OPEN_EXTERNAL':
        if (message.url) {
          shell.openExternal(message.url);
          logger.info({ url: message.url }, 'WebSocket: 打开外部链接');
        }
        break;

      case 'LOGIN_SUCCESS':
        // 通知 control-bar 登录成功
        const controlBarWindow = this.windowManager.getControlBarWindow();
        if (controlBarWindow && !controlBarWindow.isDestroyed()) {
          controlBarWindow.webContents.send('websocket-login-success', {
            isLoggedIn: true,
            user: message.user
          });
        }
        logger.info('WebSocket: 用户登录成功，已通知 control-bar');
        break;

      case 'LOGOUT':
        // 通知 control-bar 登出
        const controlBarWindowLogout = this.windowManager.getControlBarWindow();
        if (controlBarWindowLogout && !controlBarWindowLogout.isDestroyed()) {
          controlBarWindowLogout.webContents.send('websocket-logout', {
            isLoggedIn: false
          });
        }
        logger.info('WebSocket: 用户登出，已通知 control-bar');
        break;

      case 'START_RECORDING':
        // 处理录音请求 (将来实现)
        logger.info('WebSocket: 收到录音请求');
        // TODO: 实现录音功能
        break;

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
        logger.debug({ message }, 'WebSocket 消息发送成功');
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
      logger.info(`${this.reconnectDelay / 1000}秒后尝试重连 (第 ${this.reconnectAttempts} 次)`);
      
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
      logger.info('WebSocket 连接已断开');
    }
  }

  /**
   * 检查连接状态
   */
  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}