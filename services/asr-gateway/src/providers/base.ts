import { EventEmitter } from 'events';

export interface TranscriptResult {
  text: string;
  isFinal: boolean;
  confidence?: number;
  timestamp: number;
  duration?: number;
  words?: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
  providerName: string; // 添加提供商标识
}

export interface AsrProviderConfig {
  [key: string]: any;
}

export interface AsrProviderInfo {
  name: string;
  displayName: string;
  type: 'realtime' | 'batch' | 'both';
  supportsStreamingInput: boolean;
  supportsLanguageDetection: boolean;
  supportedLanguages: string[];
  maxAudioDurationMs?: number;
}

export abstract class BaseAsrProvider extends EventEmitter {
  protected config: AsrProviderConfig;
  protected isInitialized = false;
  protected isConnected = false;
  protected reconnectAttempts = 0;
  protected maxReconnectAttempts = 5;

  constructor(config: AsrProviderConfig) {
    super();
    this.config = config;
  }

  // 抽象方法 - 子类必须实现
  abstract getName(): string;
  abstract getInfo(): AsrProviderInfo;
  abstract initialize(): Promise<void>;
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract sendAudio(audioBuffer: ArrayBuffer | Buffer): Promise<void>;
  abstract isAvailable(): boolean;

  // 通用方法
  getConfig(): AsrProviderConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<AsrProviderConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('configUpdated', this.config);
  }

  getConnectionStatus(): {
    initialized: boolean;
    connected: boolean;
    reconnectAttempts: number;
  } {
    return {
      initialized: this.isInitialized,
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  protected async reconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    this.emit('reconnecting', {
      attempt: this.reconnectAttempts,
      delay,
      maxAttempts: this.maxReconnectAttempts
    });

    setTimeout(async () => {
      try {
        await this.connect();
        this.reconnectAttempts = 0;
      } catch (error) {
        this.emit('reconnectFailed', error);
        this.reconnect(); // 递归重试
      }
    }, delay);
  }

  protected emitTranscript(result: Omit<TranscriptResult, 'providerName'>): void {
    const transcriptResult: TranscriptResult = {
      ...result,
      providerName: this.getName()
    };
    this.emit('transcript', transcriptResult);
  }

  protected emitError(error: Error): void {
    this.emit('error', error);
  }

  protected emitConnected(): void {
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.emit('connected');
  }

  protected emitDisconnected(): void {
    this.isConnected = false;
    this.emit('disconnected');
  }

  // 验证配置的通用方法
  protected validateConfig(requiredFields: string[]): void {
    for (const field of requiredFields) {
      if (!this.config[field]) {
        throw new Error(`${this.getName()} 配置缺少必需字段: ${field}`);
      }
    }
  }

  // 健康检查
  async healthCheck(): Promise<{
    healthy: boolean;
    message: string;
    details?: any;
  }> {
    try {
      const available = this.isAvailable();
      const connected = this.isConnected;
      
      if (!available) {
        return {
          healthy: false,
          message: `${this.getName()} 不可用（配置或依赖问题）`
        };
      }

      if (!connected && this.getInfo().type !== 'batch') {
        return {
          healthy: false,
          message: `${this.getName()} 未连接`,
          details: { reconnectAttempts: this.reconnectAttempts }
        };
      }

      return {
        healthy: true,
        message: `${this.getName()} 运行正常`
      };
    } catch (error: any) {
      return {
        healthy: false,
        message: `${this.getName()} 健康检查失败: ${error.message}`,
        details: error
      };
    }
  }
}