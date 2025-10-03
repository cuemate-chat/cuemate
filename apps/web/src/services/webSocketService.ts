interface WebSocketMessage {
  type: string;
  data?: any;
  client?: 'web' | 'desktop';
}

type MessageHandler = (message: WebSocketMessage) => void;

export class WebSocketService {
  private ws: WebSocket | null = null;
  private messageHandlers = new Map<string, MessageHandler[]>();
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private wsUrl = 'ws://127.0.0.1:3001';

  /**
   * 连接到 web-api WebSocket 服务器
   */
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.wsUrl);

        this.ws.onopen = () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;

          // 注册为 web 客户端
          this.send({
            type: 'REGISTER',
            client: 'web',
          });

          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('WebSocket: 消息解析失败', error);
          }
        };

        this.ws.onclose = (event) => {
          this.isConnected = false;

          if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.handleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket: 连接错误', error);
          this.isConnected = false;
          reject(error);
        };
      } catch (error) {
        console.error('WebSocket: 连接初始化失败', error);
        reject(error);
      }
    });
  }

  /**
   * 处理收到的消息
   */
  private handleMessage(message: WebSocketMessage): void {
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          console.error(`WebSocket: 处理消息 ${message.type} 失败`, error);
        }
      });
    }
  }

  /**
   * 发送消息
   */
  public send(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('WebSocket: 消息发送失败', error);
      }
    } else {
      console.warn('WebSocket: 连接未就绪，无法发送消息', { readyState: this.ws?.readyState });
    }
  }

  /**
   * 添加消息处理器
   */
  public onMessage(type: string, handler: MessageHandler): void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type)!.push(handler);
  }

  /**
   * 移除消息处理器
   */
  public offMessage(type: string, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * 处理重连
   */
  private handleReconnect(): void {
    this.reconnectAttempts++;
    setTimeout(() => {
      this.connect().catch((error) => {
        console.error('WebSocket: 重连失败', error);
      });
    }, this.reconnectDelay);
  }

  /**
   * 断开连接
   */
  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.messageHandlers.clear();
  }

  /**
   * 检查连接状态
   */
  public getConnectionState(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }
}

// 创建单例实例
export const webSocketService = new WebSocketService();
