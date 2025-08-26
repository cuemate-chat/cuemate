export interface AsrProvider {
  id: string;
  name: string;
  display_name: string;
  provider_type: 'deepgram' | 'openai_whisper' | 'vosk';
  description?: string;
  default_config: Record<string, any>;
  required_fields: string[];
  is_enabled: boolean;
}

export interface AsrConfig {
  userId: string;
  selectedProviderId: string;
  selectedProvider: AsrProvider;
  currentProviderConfig: Record<string, any>;
  availableProviders: AsrProvider[];
}

export class HttpAsrConfigManager {
  private webApiBaseUrl: string;
  private cachedConfigs: Map<string, { config: AsrConfig; expiry: number }> = new Map();
  private readonly cacheTimeoutMs = 30 * 1000; // 30秒缓存
  private logger: any;

  constructor(
    webApiBaseUrl: string = process.env.WEB_API_URL || 'http://localhost:3000',
    logger: any,
  ) {
    this.webApiBaseUrl = webApiBaseUrl;
    this.logger = logger;
  }

  private invalidateCache(userId?: string): void {
    if (userId) {
      this.cachedConfigs.delete(userId);
    } else {
      this.cachedConfigs.clear();
    }
  }

  async getConfig(userId: string): Promise<AsrConfig> {
    const now = Date.now();

    // 使用缓存的配置（如果未过期）
    const cached = this.cachedConfigs.get(userId);
    if (cached && now < cached.expiry) {
      return cached.config;
    }

    try {
      const response = await fetch(`${this.webApiBaseUrl}/api/asr/users/${userId}/config`);
      if (!response.ok) {
        throw new Error(`获取用户ASR配置失败: ${response.status}`);
      }

      const result = (await response.json()) as {
        success: boolean;
        data?: AsrConfig;
        error?: string;
      };
      if (!result.success) {
        throw new Error(result.error || '获取用户ASR配置失败');
      }

      const config: AsrConfig = result.data!;

      // 缓存配置
      this.cachedConfigs.set(userId, {
        config,
        expiry: now + this.cacheTimeoutMs,
      });

      return config;
    } catch (error: any) {
      this.logger.error({ err: error as any, userId }, '获取用户ASR配置失败');
      throw error;
    }
  }

  async updateUserProvider(userId: string, providerId: string): Promise<void> {
    try {
      const response = await fetch(`${this.webApiBaseUrl}/api/asr/users/${userId}/provider`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ providerId }),
      });

      if (!response.ok) {
        throw new Error(`更新用户ASR提供商失败: ${response.status}`);
      }

      const result = (await response.json()) as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || '更新用户ASR提供商失败');
      }

      this.invalidateCache(userId);
      this.logger.info({ userId, providerId }, '用户ASR提供商已更新');
    } catch (error: any) {
      this.logger.error({ err: error as any, userId, providerId }, '更新用户ASR提供商失败');
      throw error;
    }
  }

  async updateUserProviderConfig(
    userId: string,
    providerId: string,
    config: Record<string, any>,
  ): Promise<void> {
    try {
      const response = await fetch(
        `${this.webApiBaseUrl}/api/asr/users/${userId}/config/${providerId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(config),
        },
      );

      if (!response.ok) {
        throw new Error(`更新用户ASR提供商配置失败: ${response.status}`);
      }

      const result = (await response.json()) as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || '更新用户ASR提供商配置失败');
      }

      this.invalidateCache(userId);
      this.logger.info({ userId, providerId }, '用户ASR提供商配置已更新');
    } catch (error: any) {
      this.logger.error({ err: error as any, userId, providerId }, '更新用户ASR提供商配置失败');
      throw error;
    }
  }

  async getAvailableProviders(): Promise<AsrProvider[]> {
    try {
      const response = await fetch(`${this.webApiBaseUrl}/api/asr/providers`);
      if (!response.ok) {
        throw new Error(`获取ASR提供商失败: ${response.status}`);
      }

      const result = (await response.json()) as {
        success: boolean;
        data?: AsrProvider[];
        error?: string;
      };
      if (!result.success) {
        throw new Error(result.error || '获取ASR提供商失败');
      }

      return result.data!;
    } catch (error: any) {
      this.logger.error({ err: error as any }, '获取可用ASR提供商失败');
      throw error;
    }
  }

  async getProvider(providerId: string): Promise<AsrProvider | null> {
    const providers = await this.getAvailableProviders();
    return providers.find((p) => p.id === providerId) || null;
  }

  async validateUserConfig(
    userId: string,
    providerId: string,
  ): Promise<{
    valid: boolean;
    missingFields: string[];
    message: string;
  }> {
    try {
      const response = await fetch(
        `${this.webApiBaseUrl}/api/asr/users/${userId}/validate/${providerId}`,
      );
      if (!response.ok) {
        throw new Error(`验证用户ASR配置失败: ${response.status}`);
      }

      const result = (await response.json()) as {
        success: boolean;
        data?: { valid: boolean; missingFields: string[]; message: string };
        error?: string;
      };
      if (!result.success) {
        throw new Error(result.error || '验证用户ASR配置失败');
      }

      return result.data!;
    } catch (error: any) {
      return {
        valid: false,
        missingFields: [],
        message: `验证失败: ${error.message}`,
      };
    }
  }
}
