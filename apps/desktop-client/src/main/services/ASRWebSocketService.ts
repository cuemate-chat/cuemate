import WebSocket from 'ws';
import { createLogger } from '../../utils/logger.js';

const log = createLogger('ASRWebSocketService');

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
        log.info('connect', '[ASR WebSocket] 创建连接', { sessionId, url });

        // 创建 WebSocket 连接，禁用压缩以提高性能
        const ws = new WebSocket(url, {
          perMessageDeflate: false, // 禁用消息压缩，避免 CPU 开销
          maxPayload: 100 * 1024 * 1024, // 最大消息大小 100MB
        });
        this.connections.set(sessionId, ws);

        log.info('connect', '[ASR WebSocket] WebSocket 配置', {
          sessionId,
          perMessageDeflate: false,
          maxPayload: 100 * 1024 * 1024
        });

        // 如果提供了消息回调，立即保存并设置监听器
        if (onMessage) {
          this.messageCallbacks.set(sessionId, onMessage);
          log.info('connect', '[ASR WebSocket] 消息监听器已在连接时设置', { sessionId });
          ws.on('message', (data: WebSocket.RawData) => {
            try {
              const message = data.toString();
              log.debug('connect', '[ASR WebSocket] 收到消息', { sessionId, messagePreview: message.substring(0, 100) });
              onMessage(message);
            } catch (error) {
              log.error('connect', '[ASR WebSocket] 处理消息失败', { sessionId }, error);
            }
          });
        }

        ws.on('open', () => {
          log.info('connect', '[ASR WebSocket] 连接已打开', { sessionId });
          resolve();
        });

        ws.on('error', (error) => {
          log.error('connect', '[ASR WebSocket] 连接错误', { sessionId }, error);
          this.connections.delete(sessionId);
          this.messageCallbacks.delete(sessionId);
          reject(error);
        });

        ws.on('close', () => {
          log.info('connect', '[ASR WebSocket] 连接已关闭', { sessionId });
          this.connections.delete(sessionId);
          this.messageCallbacks.delete(sessionId);
        });
      } catch (error) {
        log.error('connect', '[ASR WebSocket] 创建连接失败', { sessionId }, error);
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
      log.error('sendConfig', '[ASR WebSocket] 连接不存在，无法发送配置', { sessionId });
      return;
    }

    if (ws.readyState !== WebSocket.OPEN) {
      log.error('sendConfig', '[ASR WebSocket] 连接未打开，无法发送配置', { sessionId, readyState: ws.readyState });
      return;
    }

    // 使用回调函数捕获异步发送错误
    const configStr = JSON.stringify(config);
    ws.send(configStr, (error) => {
      if (error) {
        log.error('sendConfig', '[ASR WebSocket] 发送配置失败', {
          sessionId,
          config,
          errorMessage: error.message,
          errorStack: error.stack
        }, error);
      } else {
        log.info('sendConfig', '[ASR WebSocket] 配置已发送', { sessionId, config });
      }
    });
  }

  /**
   * 发送音频数据 (ArrayBuffer)
   * 关键：在主进程中 ArrayBuffer 可以正常发送，不受 V8 Sandbox 限制
   */
  public sendAudioData(sessionId: string, audioData: ArrayBuffer): void {
    log.debug('sendAudioData', '[ASR WebSocket] sendAudioData 被调用', { sessionId, byteLength: audioData?.byteLength, type: typeof audioData });

    const ws = this.connections.get(sessionId);
    if (!ws) {
      log.error('sendAudioData', '[ASR WebSocket] 连接不存在，无法发送音频数据', { sessionId, availableSessions: Array.from(this.connections.keys()) });
      return;
    }

    if (ws.readyState !== WebSocket.OPEN) {
      log.error('sendAudioData', '[ASR WebSocket] 连接未打开，无法发送音频数据', { sessionId, readyState: ws.readyState, readyStateMapping: {
        0: 'CONNECTING',
        1: 'OPEN',
        2: 'CLOSING',
        3: 'CLOSED'
      }[ws.readyState] });
      return;
    }

    // 验证 audioData 是否有效
    if (!audioData) {
      log.error('sendAudioData', '[ASR WebSocket] audioData 为空或 undefined', { sessionId });
      return;
    }

    if (!(audioData instanceof ArrayBuffer)) {
      log.error('sendAudioData', '[ASR WebSocket] audioData 不是 ArrayBuffer 类型', { sessionId, actualType: Object.prototype.toString.call(audioData) });
      return;
    }

    if (audioData.byteLength === 0) {
      log.error('sendAudioData', '[ASR WebSocket] audioData 长度为 0', { sessionId });
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

    log.debug('sendAudioData', '[ASR WebSocket] 准备发送音频数据', {
      sessionId,
      bufferedAmount,
      byteLength: audioData.byteLength,
      readyState: ws.readyState,
      isRealArrayBuffer,
      constructorName,
      first4Bytes
    });

    ws.send(audioData, (error) => {
      if (error) {
        log.error('sendAudioData', '[ASR WebSocket] 发送音频数据失败', {
          sessionId,
          byteLength: audioData.byteLength,
          bufferedAmountBefore: bufferedAmount,
          bufferedAmountAfter: ws.bufferedAmount,
          errorMessage: error.message,
          errorStack: error.stack,
          errorName: error.name,
          errorCode: (error as any).code
        }, error);
      }
    });
  }

  /**
   * 监听消息（已废弃，消息监听器在 connect 时设置）
   * 保留此方法仅为了向后兼容
   */
  public onMessage(sessionId: string, callback: (data: string) => void): void {
    log.warn('onMessage', '[ASR WebSocket] onMessage 方法已废弃，消息监听器应在 connect 时设置', { sessionId });
    const ws = this.connections.get(sessionId);
    if (!ws) {
      log.error('onMessage', '[ASR WebSocket] 连接不存在，无法监听消息', { sessionId });
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
          log.error('onMessage', '[ASR WebSocket] 处理消息失败', { sessionId }, error);
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
      log.warn('close', '[ASR WebSocket] 连接不存在，无需关闭', { sessionId });
      return;
    }

    try {
      ws.close();
      this.connections.delete(sessionId);
      log.info('close', '[ASR WebSocket] 连接已关闭', { sessionId });
    } catch (error) {
      log.error('close', '[ASR WebSocket] 关闭连接失败', { sessionId }, error);
    }
  }

  /**
   * 关闭所有连接
   */
  public closeAll(): void {
    log.info('closeAll', '[ASR WebSocket] 关闭所有连接', { count: this.connections.size });
    for (const [sessionId, ws] of this.connections.entries()) {
      try {
        ws.close();
      } catch (error) {
        log.error('closeAll', '[ASR WebSocket] 关闭连接失败', { sessionId }, error);
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
