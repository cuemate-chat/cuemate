import WebSocket, { WebSocketServer } from 'ws';
import { logger } from '../utils/logger.js';

interface WebSocketMessage {
  type: string;
  client?: 'web' | 'desktop';
  data?: any;
  url?: string;
  user?: any;
  mode?: 'mock-interview' | 'interview-training';
}

interface RegisteredClient {
  ws: WebSocket;
  type: 'web' | 'desktop';
  id: string;
}

export class CueMateWebSocketServer {
  private wss: WebSocketServer | null = null;
  private clients = new Map<string, RegisteredClient>();

  constructor() {
    // 构造函数不再直接创建服务器，等待 attachToServer 调用
  }

  /**
   * 将 WebSocket 服务器附加到现有的 HTTP 服务器
   */
  public attachToServer(httpServer: any, port: number): void {
    this.wss = new WebSocketServer({ server: httpServer });
    this.setupServer();
    logger.debug(`WebSocket 服务器已附加到 HTTP 服务器，端口 ${port}`);
  }

  private setupServer(): void {
    if (!this.wss) return;

    this.wss.on('connection', (ws: WebSocket, request) => {
      const clientId = this.generateClientId();
      logger.warn({ clientId, origin: request.headers.origin }, 'WebSocket 客户端连接');

      ws.on('message', (data: WebSocket.Data) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());
          this.handleMessage(clientId, ws, message);
        } catch (error) {
          logger.error({ error, clientId }, 'WebSocket 消息解析失败');
        }
      });

      ws.on('close', (code, reason) => {
        logger.warn({ clientId, code, reason: reason.toString() }, 'WebSocket 客户端断开连接');
        this.clients.delete(clientId);
      });

      ws.on('error', (error) => {
        logger.error({ error, clientId }, 'WebSocket 客户端错误');
        this.clients.delete(clientId);
      });

      // 发送连接成功消息
      ws.send(
        JSON.stringify({
          type: 'CONNECTION_ACK',
          clientId: clientId,
        }),
      );
    });

    this.wss.on('error', (error) => {
      logger.error({ error }, 'WebSocket 服务器错误');
    });
  }

  private handleMessage(clientId: string, ws: WebSocket, message: WebSocketMessage): void {
    logger.debug({ clientId, messageType: message?.type }, '收到 WebSocket 消息');

    switch (message.type) {
      case 'REGISTER':
        this.handleRegister(clientId, ws, message);
        break;

      case 'OPEN_EXTERNAL':
        this.handleOpenExternal(message);
        break;

      case 'LOGIN_SUCCESS':
        this.handleLoginSuccess(message);
        break;

      case 'LOGOUT':
        this.handleLogout(message);
        break;

      case 'START_RECORDING':
        this.handleStartRecording(message);
        break;

      case 'RECORDING_RESULT':
        this.handleRecordingResult(message);
        break;

      case 'REQUEST_ASR_DEVICES':
        this.handleRequestAsrDevices(message);
        break;

      case 'ASR_DEVICES':
        this.handleAsrDevices(message);
        break;

      case 'OPEN_INTERVIEWER':
        this.handleOpenInterviewer(message);
        break;

      default:
        logger.warn({ messageType: message.type, clientId }, 'WebSocket: 未知消息类型');
    }
  }

  private handleRegister(clientId: string, ws: WebSocket, message: WebSocketMessage): void {
    if (!message.client) {
      logger.warn({ clientId }, 'WebSocket: 注册消息缺少客户端类型');
      return;
    }

    const client: RegisteredClient = {
      ws: ws,
      type: message.client,
      id: clientId,
    };

    this.clients.set(clientId, client);
    logger.debug({ clientId, clientType: message.client }, 'WebSocket: 客户端注册成功');

    // 发送注册成功确认
    ws.send(
      JSON.stringify({
        type: 'REGISTER_ACK',
        clientType: message.client,
      }),
    );
  }

  private handleOpenExternal(message: WebSocketMessage): void {
    if (!message.url) {
      logger.warn('WebSocket: OPEN_EXTERNAL 消息缺少 URL');
      return;
    }

    // 转发给 desktop 客户端
    const desktopClients = Array.from(this.clients.values()).filter(
      (client) => client.type === 'desktop',
    );

    if (desktopClients.length === 0) {
      logger.warn('WebSocket: 没有可用的 desktop 客户端来处理 OPEN_EXTERNAL');
      return;
    }

    desktopClients.forEach((client) => {
      try {
        client.ws.send(
          JSON.stringify({
            type: 'OPEN_EXTERNAL',
            url: message.url,
          }),
        );
        logger.debug(
          { url: message.url, clientId: client.id },
          'WebSocket: 已转发 OPEN_EXTERNAL 到 desktop',
        );
      } catch (error) {
        logger.error({ error, clientId: client.id }, 'WebSocket: 转发 OPEN_EXTERNAL 失败');
      }
    });
  }

  private handleLoginSuccess(message: WebSocketMessage): void {
    // 转发给 desktop 客户端
    const desktopClients = Array.from(this.clients.values()).filter(
      (client) => client.type === 'desktop',
    );

    desktopClients.forEach((client) => {
      try {
        client.ws.send(
          JSON.stringify({
            type: 'LOGIN_SUCCESS',
            user: message.user,
          }),
        );
        logger.debug(
          { user: message.user?.username, clientId: client.id },
          'WebSocket: 已转发 LOGIN_SUCCESS 到 desktop',
        );
      } catch (error) {
        logger.error({ error, clientId: client.id }, 'WebSocket: 转发 LOGIN_SUCCESS 失败');
      }
    });
  }

  private handleLogout(_message: WebSocketMessage): void {
    // 转发给 desktop 客户端
    const desktopClients = Array.from(this.clients.values()).filter(
      (client) => client.type === 'desktop',
    );

    desktopClients.forEach((client) => {
      try {
        client.ws.send(
          JSON.stringify({
            type: 'LOGOUT',
          }),
        );
        logger.debug({ clientId: client.id }, 'WebSocket: 已转发 LOGOUT 到 desktop');
      } catch (error) {
        logger.error({ error, clientId: client.id }, 'WebSocket: 转发 LOGOUT 失败');
      }
    });
  }

  private handleStartRecording(message: WebSocketMessage): void {
    // 转发给 desktop 客户端
    const desktopClients = Array.from(this.clients.values()).filter(
      (client) => client.type === 'desktop',
    );

    if (desktopClients.length === 0) {
      logger.warn('WebSocket: 没有可用的 desktop 客户端来处理录音请求');
      return;
    }

    desktopClients.forEach((client) => {
      try {
        client.ws.send(
          JSON.stringify({
            type: 'START_RECORDING',
            data: message.data,
          }),
        );
        logger.debug({ clientId: client.id }, 'WebSocket: 已转发 START_RECORDING 到 desktop');
      } catch (error) {
        logger.error({ error, clientId: client.id }, 'WebSocket: 转发 START_RECORDING 失败');
      }
    });
  }

  private handleRecordingResult(message: WebSocketMessage): void {
    // 转发给 web 客户端
    const webClients = Array.from(this.clients.values()).filter((client) => client.type === 'web');

    webClients.forEach((client) => {
      try {
        client.ws.send(
          JSON.stringify({
            type: 'RECORDING_RESULT',
            data: message.data,
          }),
        );
        logger.debug({ clientId: client.id }, 'WebSocket: 已转发 RECORDING_RESULT 到 web');
      } catch (error) {
        logger.error({ error, clientId: client.id }, 'WebSocket: 转发 RECORDING_RESULT 失败');
      }
    });
  }

  private handleRequestAsrDevices(_message: WebSocketMessage): void {
    // 转发给 desktop 客户端，请求其上报设备列表
    const desktopClients = Array.from(this.clients.values()).filter(
      (client) => client.type === 'desktop',
    );

    desktopClients.forEach((client) => {
      try {
        client.ws.send(
          JSON.stringify({
            type: 'REQUEST_ASR_DEVICES',
          }),
        );
        logger.debug({ clientId: client.id }, 'WebSocket: 已转发 REQUEST_ASR_DEVICES 到 desktop');
      } catch (error) {
        logger.error({ error, clientId: client.id }, 'WebSocket: 转发 REQUEST_ASR_DEVICES 失败');
      }
    });
  }

  private handleAsrDevices(message: WebSocketMessage): void {
    // desktop 上报设备列表，广播给所有 web 客户端
    const webClients = Array.from(this.clients.values()).filter((client) => client.type === 'web');

    webClients.forEach((client) => {
      try {
        client.ws.send(
          JSON.stringify({
            type: 'ASR_DEVICES',
            data: message.data,
          }),
        );
        logger.debug({ clientId: client.id }, 'WebSocket: 已广播 ASR_DEVICES 给 web');
      } catch (error) {
        logger.error({ error, clientId: client.id }, 'WebSocket: 广播 ASR_DEVICES 失败');
      }
    });
  }

  private handleOpenInterviewer(message: WebSocketMessage): void {
    // 转发给 desktop 客户端
    const desktopClients = Array.from(this.clients.values()).filter(
      (client) => client.type === 'desktop',
    );

    if (desktopClients.length === 0) {
      logger.warn('WebSocket: 没有可用的 desktop 客户端来处理 OPEN_INTERVIEWER');
      return;
    }

    desktopClients.forEach((client) => {
      try {
        client.ws.send(
          JSON.stringify({
            type: 'OPEN_INTERVIEWER',
            mode: message.mode || 'mock-interview',
          }),
        );
        logger.debug(
          { mode: message.mode, clientId: client.id },
          'WebSocket: 已转发 OPEN_INTERVIEWER 到 desktop',
        );
      } catch (error) {
        logger.error({ error, clientId: client.id }, 'WebSocket: 转发 OPEN_INTERVIEWER 失败');
      }
    });
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取连接的客户端数量
   */
  public getClientCounts(): { web: number; desktop: number; total: number } {
    const clients = Array.from(this.clients.values());
    const webCount = clients.filter((c) => c.type === 'web').length;
    const desktopCount = clients.filter((c) => c.type === 'desktop').length;

    return {
      web: webCount,
      desktop: desktopCount,
      total: clients.length,
    };
  }

  /**
   * 广播消息给所有客户端
   */
  public broadcast(data: any, clientType?: 'web' | 'desktop'): void {
    const clients = Array.from(this.clients.values()).filter(
      (client) => !clientType || client.type === clientType,
    );

    clients.forEach((client) => {
      try {
        client.ws.send(JSON.stringify(data));
      } catch (error) {
        logger.error({ error, clientId: client.id }, 'WebSocket: 广播消息失败');
      }
    });
  }

  /**
   * 关闭 WebSocket 服务器
   */
  public close(): void {
    if (this.wss) {
      this.wss.close();
      logger.warn('WebSocket 服务器已关闭');
    }
  }
}
