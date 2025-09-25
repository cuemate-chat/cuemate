/**
 * WebSocket 桥接工具
 * 用于web页面与desktop端通信
 */

class WebSocketBridge {
  private ws: WebSocket | null = null;
  private wsUrl = 'ws://127.0.0.1:3001';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private isConnecting = false;
  private messageQueue: any[] = [];

  constructor() {
    this.connect();
  }

  /**
   * 连接到 WebSocket 服务器
   */
  private connect(): void {
    if (this.isConnecting) return;

    this.isConnecting = true;

    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;

        // 注册为 web 客户端
        this.send({
          type: 'REGISTER',
          client: 'web',
        });

        // 发送队列中的消息
        this.flushMessageQueue();
      };

      this.ws.onmessage = (event) => {
        try {
          JSON.parse(event.data);
        } catch (error) {
          console.error('WebSocket 消息解析失败:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.warn('WebSocket 连接关闭:', event.code, event.reason);
        this.isConnecting = false;
        this.handleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket 连接错误:', error);
        this.isConnecting = false;
      };
    } catch (error) {
      console.error('WebSocket 连接初始化失败:', error);
      this.isConnecting = false;
      this.handleReconnect();
    }
  }

  /**
   * 处理重连逻辑
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`${this.reconnectDelay / 1000}秒后尝试重连 (第 ${this.reconnectAttempts} 次)`);

      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay);
    } else {
      console.error('WebSocket 重连次数超过限制，停止重连');
    }
  }

  /**
   * 发送消息到 WebSocket 服务器
   */
  public send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        console.debug('WebSocket 消息发送成功:', message);
      } catch (error) {
        console.error('WebSocket 消息发送失败:', error);
      }
    } else {
      // 连接未准备好，将消息加入队列
      console.warn('WebSocket 未连接，消息加入队列:', message);
      this.messageQueue.push(message);
    }
  }

  /**
   * 发送队列中的消息
   */
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }

  /**
   * 打开外部链接
   */
  public openExternal(url: string): void {
    this.send({
      type: 'OPEN_EXTERNAL',
      url: url,
    });
  }

  /**
   * 通知登录成功
   */
  public notifyLoginSuccess(user: any): void {
    this.send({
      type: 'LOGIN_SUCCESS',
      user: user,
    });
  }

  /**
   * 通知登出
   */
  public notifyLogout(): void {
    this.send({
      type: 'LOGOUT',
    });
  }

  /**
   * 检查连接状态
   */
  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * 断开连接
   */
  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// 创建全局实例
let websocketBridge: WebSocketBridge | null = null;

/**
 * 获取 WebSocket 桥接实例
 */
export function getWebSocketBridge(): WebSocketBridge {
  if (!websocketBridge) {
    websocketBridge = new WebSocketBridge();
  }
  return websocketBridge;
}

/**
 * 检查是否在 Electron 环境中
 */
export function isElectron(): boolean {
  return typeof window !== 'undefined' && (window as any).process?.versions?.electron;
}
