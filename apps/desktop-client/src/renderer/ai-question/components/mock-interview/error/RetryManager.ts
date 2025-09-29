/**
 * 重试机制管理器
 * 提供智能重试策略和重试状态管理
 */

export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
  jitter: boolean;
  timeout?: number;
}

export interface RetryOptions {
  retryIf?: (error: Error) => boolean;
  onRetry?: (attempt: number, error: Error) => void;
  onSuccess?: (result: any, attempt: number) => void;
  onFinalFailure?: (error: Error, attempts: number) => void;
}

export interface RetryState {
  attempts: number;
  lastAttempt: number;
  nextRetryAt: number;
  isRetrying: boolean;
  totalDelay: number;
}

export class RetryManager {
  private retryStates = new Map<string, RetryState>();
  private retryTimers = new Map<string, NodeJS.Timeout>();

  // 默认重试配置
  static readonly DEFAULT_CONFIG: RetryConfig = {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
    jitter: true,
    timeout: 30000
  };

  // 预定义的重试配置
  static readonly CONFIGS = {
    // 网络请求重试
    NETWORK: {
      maxAttempts: 5,
      initialDelay: 1000,
      maxDelay: 30000,
      backoffFactor: 2,
      jitter: true,
      timeout: 60000
    } as RetryConfig,

    // 音频服务重试
    AUDIO: {
      maxAttempts: 3,
      initialDelay: 2000,
      maxDelay: 8000,
      backoffFactor: 2,
      jitter: false,
      timeout: 20000
    } as RetryConfig,

    // 快速重试
    FAST: {
      maxAttempts: 2,
      initialDelay: 500,
      maxDelay: 2000,
      backoffFactor: 2,
      jitter: true,
      timeout: 10000
    } as RetryConfig,

    // 长时间重试
    PERSISTENT: {
      maxAttempts: 10,
      initialDelay: 2000,
      maxDelay: 60000,
      backoffFactor: 1.5,
      jitter: true,
      timeout: 300000
    } as RetryConfig
  };

  constructor() {}

  // 执行带重试的异步操作
  async retry<T>(
    key: string,
    operation: () => Promise<T>,
    config: RetryConfig = RetryManager.DEFAULT_CONFIG,
    options: RetryOptions = {}
  ): Promise<T> {
    const state = this.getOrCreateRetryState(key);

    // 如果已经在重试中，抛出错误
    if (state.isRetrying) {
      throw new Error(`Operation ${key} is already retrying`);
    }

    state.isRetrying = true;
    let lastError: Error;

    try {
      for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
        state.attempts = attempt;
        state.lastAttempt = Date.now();

        try {
          // 设置超时
          const result = await this.withTimeout(operation(), config.timeout);

          // 成功回调
          options.onSuccess?.(result, attempt);

          // 重置状态
          this.resetRetryState(key);

          return result;
        } catch (error) {
          lastError = error as Error;

          // 检查是否应该重试
          if (attempt === config.maxAttempts ||
              (options.retryIf && !options.retryIf(lastError))) {
            break;
          }

          // 重试回调
          options.onRetry?.(attempt, lastError);

          // 计算延迟
          const delay = this.calculateDelay(attempt, config);
          state.nextRetryAt = Date.now() + delay;
          state.totalDelay += delay;

          // 等待重试
          await this.delay(delay);
        }
      }

      // 最终失败
      options.onFinalFailure?.(lastError!, state.attempts);
      throw lastError!;
    } finally {
      state.isRetrying = false;
    }
  }

  // 执行带重试的同步操作
  async retrySync<T>(
    key: string,
    operation: () => T,
    config: RetryConfig = RetryManager.DEFAULT_CONFIG,
    options: RetryOptions = {}
  ): Promise<T> {
    return this.retry(
      key,
      () => Promise.resolve(operation()),
      config,
      options
    );
  }

  // 取消重试
  cancelRetry(key: string): void {
    const timer = this.retryTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.retryTimers.delete(key);
    }

    const state = this.retryStates.get(key);
    if (state) {
      state.isRetrying = false;
    }
  }

  // 重置重试状态
  resetRetryState(key: string): void {
    this.retryStates.delete(key);
    this.cancelRetry(key);
  }

  // 获取重试状态
  getRetryState(key: string): RetryState | null {
    return this.retryStates.get(key) || null;
  }

  // 检查是否可以重试
  canRetry(key: string, config: RetryConfig = RetryManager.DEFAULT_CONFIG): boolean {
    const state = this.retryStates.get(key);
    if (!state) return true;

    return state.attempts < config.maxAttempts && !state.isRetrying;
  }

  // 获取下次重试时间
  getNextRetryTime(key: string): number | null {
    const state = this.retryStates.get(key);
    return state?.nextRetryAt || null;
  }

  // 获取距离下次重试的时间
  getTimeUntilNextRetry(key: string): number | null {
    const nextRetryTime = this.getNextRetryTime(key);
    if (!nextRetryTime) return null;

    return Math.max(0, nextRetryTime - Date.now());
  }

  // 获取所有重试状态
  getAllRetryStates(): Map<string, RetryState> {
    return new Map(this.retryStates);
  }

  // 清除所有重试状态
  clearAllRetryStates(): void {
    // 取消所有定时器
    this.retryTimers.forEach(timer => clearTimeout(timer));
    this.retryTimers.clear();

    // 清除所有状态
    this.retryStates.clear();
  }

  // 创建重试包装器
  createRetryWrapper<T extends any[], R>(
    key: string,
    fn: (...args: T) => Promise<R>,
    config: RetryConfig = RetryManager.DEFAULT_CONFIG,
    options: RetryOptions = {}
  ): (...args: T) => Promise<R> {
    return (...args: T) => {
      return this.retry(
        key,
        () => fn(...args),
        config,
        options
      );
    };
  }

  // 检查错误是否可重试
  static isRetryableError(error: Error): boolean {
    const retryableErrors = [
      'network',
      'timeout',
      'connection',
      'fetch',
      'websocket',
      'temporary',
      'unavailable'
    ];

    const message = error.message.toLowerCase();
    return retryableErrors.some(keyword => message.includes(keyword));
  }

  // 检查HTTP状态码是否可重试
  static isRetryableHttpStatus(status: number): boolean {
    // 可重试的HTTP状态码
    const retryableStatuses = [
      408, // Request Timeout
      429, // Too Many Requests
      500, // Internal Server Error
      502, // Bad Gateway
      503, // Service Unavailable
      504, // Gateway Timeout
    ];

    return retryableStatuses.includes(status);
  }

  // 私有方法

  private getOrCreateRetryState(key: string): RetryState {
    if (!this.retryStates.has(key)) {
      this.retryStates.set(key, {
        attempts: 0,
        lastAttempt: 0,
        nextRetryAt: 0,
        isRetrying: false,
        totalDelay: 0
      });
    }
    return this.retryStates.get(key)!;
  }

  private calculateDelay(attempt: number, config: RetryConfig): number {
    // 指数退避
    let delay = config.initialDelay * Math.pow(config.backoffFactor, attempt - 1);

    // 限制最大延迟
    delay = Math.min(delay, config.maxDelay);

    // 添加抖动
    if (config.jitter) {
      const jitterRange = delay * 0.1; // 10%的抖动
      delay += (Math.random() * 2 - 1) * jitterRange;
    }

    return Math.max(0, Math.round(delay));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs?: number
  ): Promise<T> {
    if (!timeoutMs) return promise;

    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Operation timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      })
    ]);
  }

  // 销毁管理器
  destroy(): void {
    this.clearAllRetryStates();
  }
}