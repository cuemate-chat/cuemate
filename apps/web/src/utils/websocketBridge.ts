/**
 * WebSocket 桥接工具
 * 用于 web 页面与 desktop 端通信
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
        } catch {
          // 消息解析失败，忽略
        }
      };

      this.ws.onclose = (event) => {
        console.warn('WebSocket 连接关闭:', event.code, event.reason);
        this.isConnecting = false;
        this.handleReconnect();
      };

      this.ws.onerror = () => {
        this.isConnecting = false;
      };
    } catch {
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
      console.debug(`${this.reconnectDelay / 1000}秒后尝试重连 (第 ${this.reconnectAttempts} 次)`);

      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay);
    }
  }

  /**
   * 发送消息到 WebSocket 服务器
   */
  public send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch {
        // 消息发送失败，忽略
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
   * 请求更新到指定版本
   */
  public updateVersion(version: string): void {
    this.send({
      type: 'UPDATE_VERSION',
      version: version,
    });
  }

  /**
   * 监听更新进度
   */
  public onUpdateProgress(callback: (data: any) => void): void {
    if (!this.ws) return;

    const originalOnMessage = this.ws.onmessage;
    const ws = this.ws; // 保存引用以供闭包使用

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // 处理更新进度消息
        if (data.type === 'UPDATE_PROGRESS') {
          callback(data);
        }

        // 调用原始的 onmessage 处理器
        if (originalOnMessage) {
          originalOnMessage.call(ws, event);
        }
      } catch {
        // 消息解析失败，忽略
      }
    };
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
