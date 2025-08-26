import { HttpAsrConfigManager } from '../config/http-config.js';
import { BaseAsrProvider } from './base.js';
import { DeepgramProvider, type DeepgramConfig } from './deepgram.js';
import { VoskProvider, type VoskConfig } from './vosk.js';
import { WhisperProvider, type WhisperConfig } from './whisper.js';

export class AsrProviderFactory {
  private providerInstances: Map<string, BaseAsrProvider> = new Map();
  private logger: any;
  private configManager: HttpAsrConfigManager;

  constructor(logger: any, configManager: HttpAsrConfigManager) {
    this.logger = logger;
    this.configManager = configManager;
  }

  async createProvider(userId: string, providerId?: string): Promise<BaseAsrProvider> {
    const config = await this.configManager.getConfig(userId);
    const targetProviderId = providerId || config.selectedProviderId;

    // 检查是否已有实例
    const instanceKey = `${userId}-${targetProviderId}`;
    const existingInstance = this.providerInstances.get(instanceKey);
    if (existingInstance) {
      return existingInstance;
    }

    // 获取提供商信息
    const provider = await this.configManager.getProvider(targetProviderId);
    if (!provider) {
      throw new Error(`ASR提供商不存在: ${targetProviderId}`);
    }

    // 验证用户配置
    const validation = await this.configManager.validateUserConfig(userId, targetProviderId);
    if (!validation.valid) {
      throw new Error(`用户配置无效: ${validation.message}`);
    }

    let instance: BaseAsrProvider;

    // 根据提供商类型创建实例
    switch (provider.provider_type) {
      case 'deepgram':
        instance = new DeepgramProvider(
          config.currentProviderConfig as DeepgramConfig,
          this.logger,
        );
        break;

      case 'openai_whisper':
        instance = new WhisperProvider(config.currentProviderConfig as WhisperConfig, this.logger);
        break;

      case 'vosk':
        instance = new VoskProvider(config.currentProviderConfig as VoskConfig, this.logger);
        break;

      default:
        throw new Error(`不支持的ASR提供商类型: ${provider.provider_type}`);
    }

    // 初始化提供商
    try {
      await instance.initialize();
      this.logger.info({ targetProviderId, userId }, 'ASR提供商已创建');
    } catch (error: any) {
      this.logger.error({ err: error as any, targetProviderId }, '初始化ASR提供商失败');
      throw error;
    }

    // 缓存实例
    this.providerInstances.set(instanceKey, instance);

    // 设置清理监听器
    instance.on('error', () => {
      this.providerInstances.delete(instanceKey);
    });

    return instance;
  }

  async getOrCreateProvider(userId: string, providerId?: string): Promise<BaseAsrProvider> {
    try {
      return await this.createProvider(userId, providerId);
    } catch (error: any) {
      this.logger.error({ err: error as any, userId, providerId }, '创建ASR提供商失败');
      throw error;
    }
  }

  async switchProvider(userId: string, newProviderId: string): Promise<BaseAsrProvider> {
    // 断开旧提供商连接
    const oldInstanceKey = Object.keys(this.providerInstances).find((key) =>
      key.startsWith(`${userId}-`),
    );
    if (oldInstanceKey) {
      const oldInstance = this.providerInstances.get(oldInstanceKey);
      if (oldInstance) {
        await oldInstance.disconnect();
        this.providerInstances.delete(oldInstanceKey);
      }
    }

    // 更新用户配置
    await this.configManager.updateUserProvider(userId, newProviderId);

    // 创建新提供商
    return await this.createProvider(userId, newProviderId);
  }

  async getUserProvider(userId: string): Promise<BaseAsrProvider | null> {
    const instanceKey = Array.from(this.providerInstances.keys()).find((key) =>
      key.startsWith(`${userId}-`),
    );
    return instanceKey ? this.providerInstances.get(instanceKey) || null : null;
  }

  async disconnectUserProvider(userId: string): Promise<void> {
    const instanceKey = Array.from(this.providerInstances.keys()).find((key) =>
      key.startsWith(`${userId}-`),
    );
    if (instanceKey) {
      const instance = this.providerInstances.get(instanceKey);
      if (instance) {
        await instance.disconnect();
        this.providerInstances.delete(instanceKey);
      }
    }
  }

  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.providerInstances.values()).map((instance) =>
      instance.disconnect(),
    );

    await Promise.all(disconnectPromises);
    this.providerInstances.clear();
    this.logger.info('所有ASR提供商连接已断开');
  }

  getActiveProviders(): { userId: string; providerName: string; status: any }[] {
    return Array.from(this.providerInstances.entries()).map(([key, instance]) => {
      const [userId, providerName] = key.split('-');
      return {
        userId,
        providerName,
        status: instance.getConnectionStatus(),
      };
    });
  }

  async healthCheck(): Promise<{
    overall: boolean;
    providers: Array<{
      userId: string;
      providerName: string;
      healthy: boolean;
      message: string;
      details?: any;
    }>;
  }> {
    const results = await Promise.all(
      Array.from(this.providerInstances.entries()).map(async ([key, instance]) => {
        const [userId, providerName] = key.split('-');
        const health = await instance.healthCheck();
        return {
          userId,
          providerName,
          healthy: health.healthy,
          message: health.message,
          details: health.details,
        };
      }),
    );

    return {
      overall: results.every((r) => r.healthy),
      providers: results,
    };
  }
}
