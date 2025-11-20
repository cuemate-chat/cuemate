import WebSocket from 'ws';
import { logger } from '../../utils/logger.js';

/**
 * ASR WebSocket 服务 - 在主进程中处理 WebSocket 连接
 * 解决 V8 Memory Sandbox 导致渲染进程无法发送 ArrayBuffer 的问题
 */
export class ASRWebSocketService {
  private connections: Map<string, WebSocket> = new Map();
  private messageCallbacks: Map<string, (message: string) => void> = new Map();

  /**
   * 创建新的 WebSocket 连接
   * 关键修复：在连接建立时立即设置 message 监听器，避免消息丢失
   */
  public connect(sessionId: string, url: string, onMessage?: (message: string) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        logger.info({ sessionId, url }, '[ASR WebSocket] 创建连接');

        // 创建 WebSocket 连接，禁用压缩以提高性能
        const ws = new WebSocket(url, {
          perMessageDeflate: false, // 禁用消息压缩，避免 CPU 开销
          maxPayload: 100 * 1024 * 1024, // 最大消息大小 100MB
        });
        this.connections.set(sessionId, ws);

        logger.info({
          sessionId,
          perMessageDeflate: false,
          maxPayload: 100 * 1024 * 1024
        }, '[ASR WebSocket] WebSocket 配置');

        // 如果提供了消息回调，立即保存并设置监听器
        if (onMessage) {
          this.messageCallbacks.set(sessionId, onMessage);
          logger.info({ sessionId }, '[ASR WebSocket] 消息监听器已在连接时设置');
          ws.on('message', (data: WebSocket.RawData) => {
            try {
              const message = data.toString();
              logger.debug({ sessionId, messagePreview: message.substring(0, 100) }, '[ASR WebSocket] 收到消息');
              onMessage(message);
            } catch (error) {
              logger.error({ sessionId, error }, '[ASR WebSocket] 处理消息失败');
            }
          });
        }

        ws.on('open', () => {
          logger.info({ sessionId }, '[ASR WebSocket] 连接已打开');
          resolve();
        });

        ws.on('error', (error) => {
          logger.error({ sessionId, error }, '[ASR WebSocket] 连接错误');
          this.connections.delete(sessionId);
          this.messageCallbacks.delete(sessionId);
          reject(error);
        });

        ws.on('close', () => {
          logger.info({ sessionId }, '[ASR WebSocket] 连接已关闭');
          this.connections.delete(sessionId);
          this.messageCallbacks.delete(sessionId);
        });
      } catch (error) {
        logger.error({ sessionId, error }, '[ASR WebSocket] 创建连接失败');
        reject(error);
      }
    });
  }

  /**
   * 发送配置消息 (JSON)
   */
  public sendConfig(sessionId: string, config: any): void {
    const ws = this.connections.get(sessionId);
    if (!ws) {
      logger.error({ sessionId }, '[ASR WebSocket] 连接不存在，无法发送配置');
      return;
    }

    if (ws.readyState !== WebSocket.OPEN) {
      logger.error({ sessionId, readyState: ws.readyState }, '[ASR WebSocket] 连接未打开，无法发送配置');
      return;
    }

    // 使用回调函数捕获异步发送错误
    const configStr = JSON.stringify(config);
    ws.send(configStr, (error) => {
      if (error) {
        logger.error({
          sessionId,
          error,
          config,
          errorMessage: error.message,
          errorStack: error.stack
        }, '[ASR WebSocket] 发送配置失败');
      } else {
        logger.info({ sessionId, config }, '[ASR WebSocket] 配置已发送');
      }
    });
  }

  /**
   * 发送音频数据 (ArrayBuffer)
   * 关键：在主进程中 ArrayBuffer 可以正常发送，不受 V8 Sandbox 限制
   */
  public sendAudioData(sessionId: string, audioData: ArrayBuffer): void {
    logger.debug({ sessionId, byteLength: audioData?.byteLength, type: typeof audioData }, '[ASR WebSocket] sendAudioData 被调用');

    const ws = this.connections.get(sessionId);
    if (!ws) {
      logger.error({ sessionId, availableSessions: Array.from(this.connections.keys()) }, '[ASR WebSocket] 连接不存在，无法发送音频数据');
      return;
    }

    if (ws.readyState !== WebSocket.OPEN) {
      logger.error({ sessionId, readyState: ws.readyState, readyStateMapping: {
        0: 'CONNECTING',
        1: 'OPEN',
        2: 'CLOSING',
        3: 'CLOSED'
      }[ws.readyState] }, '[ASR WebSocket] 连接未打开，无法发送音频数据');
      return;
    }

    // 验证 audioData 是否有效
    if (!audioData) {
      logger.error({ sessionId }, '[ASR WebSocket] audioData 为空或 undefined');
      return;
    }

    if (!(audioData instanceof ArrayBuffer)) {
      logger.error({ sessionId, actualType: Object.prototype.toString.call(audioData) }, '[ASR WebSocket] audioData 不是 ArrayBuffer 类型');
      return;
    }

    if (audioData.byteLength === 0) {
      logger.error({ sessionId }, '[ASR WebSocket] audioData 长度为 0');
      return;
    }

    // 检查缓冲区状态并发送
    const bufferedAmount = ws.bufferedAmount;

    // 检查 audioData 是否是真正的 ArrayBuffer
    const isRealArrayBuffer = audioData instanceof ArrayBuffer;
    const constructorName = audioData.constructor.name;
    const dataView = new DataView(audioData);
    const first4Bytes = dataView.byteLength >= 4 ?
      `${dataView.getUint8(0)} ${dataView.getUint8(1)} ${dataView.getUint8(2)} ${dataView.getUint8(3)}` :
      'empty';

    logger.debug({
      sessionId,
      bufferedAmount,
      byteLength: audioData.byteLength,
      readyState: ws.readyState,
      isRealArrayBuffer,
      constructorName,
      first4Bytes
    }, '[ASR WebSocket] 准备发送音频数据');

    ws.send(audioData, (error) => {
      if (error) {
        logger.error({
          sessionId,
          error,
          byteLength: audioData.byteLength,
          bufferedAmountBefore: bufferedAmount,
          bufferedAmountAfter: ws.bufferedAmount,
          errorMessage: error.message,
          errorStack: error.stack,
          errorName: error.name,
          errorCode: (error as any).code
        }, '[ASR WebSocket] 发送音频数据失败');
      }
    });
  }

  /**
   * 监听消息（已废弃，消息监听器在 connect 时设置）
   * 保留此方法仅为了向后兼容
   */
  public onMessage(sessionId: string, callback: (data: string) => void): void {
    logger.warn({ sessionId }, '[ASR WebSocket] onMessage 方法已废弃，消息监听器应在 connect 时设置');
    const ws = this.connections.get(sessionId);
    if (!ws) {
      logger.error({ sessionId }, '[ASR WebSocket] 连接不存在，无法监听消息');
      return;
    }

    // 如果之前没有设置监听器，现在设置
    if (!this.messageCallbacks.has(sessionId)) {
      this.messageCallbacks.set(sessionId, callback);
      ws.on('message', (data: WebSocket.RawData) => {
        try {
          const message = data.toString();
          callback(message);
        } catch (error) {
          logger.error({ sessionId, error }, '[ASR WebSocket] 处理消息失败');
        }
      });
    }
  }

  /**
   * 关闭连接
   */
  public close(sessionId: string): void {
    const ws = this.connections.get(sessionId);
    if (!ws) {
      logger.warn({ sessionId }, '[ASR WebSocket] 连接不存在，无需关闭');
      return;
    }

    try {
      ws.close();
      this.connections.delete(sessionId);
      logger.info({ sessionId }, '[ASR WebSocket] 连接已关闭');
    } catch (error) {
      logger.error({ sessionId, error }, '[ASR WebSocket] 关闭连接失败');
    }
  }

  /**
   * 关闭所有连接
   */
  public closeAll(): void {
    logger.info({ count: this.connections.size }, '[ASR WebSocket] 关闭所有连接');
    for (const [sessionId, ws] of this.connections.entries()) {
      try {
        ws.close();
      } catch (error) {
        logger.error({ sessionId, error }, '[ASR WebSocket] 关闭连接失败');
      }
    }
    this.connections.clear();
  }

  /**
   * 获取连接状态
   */
  public getReadyState(sessionId: string): number | null {
    const ws = this.connections.get(sessionId);
    return ws ? ws.readyState : null;
  }
}

// 导出单例
export const asrWebSocketService = new ASRWebSocketService();
