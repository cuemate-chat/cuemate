import { request } from './http';

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
  currentConfig: Record<string, any>;
  availableProviders: AsrProvider[];
}

/**
 * 获取用户的ASR配置
 */
export async function getUserAsrConfig(userId: string): Promise<AsrConfig> {
  const res = await request(`/asr/users/${userId}/config`);
  if (!res.success) {
    throw new Error(res.error || '获取ASR配置失败');
  }
  return res.data;
}

/**
 * 获取所有可用的ASR提供商
 */
export async function getAsrProviders(): Promise<AsrProvider[]> {
  const res = await request('/asr/providers');
  if (!res.success) {
    throw new Error(res.error || '获取ASR提供商失败');
  }
  return res.data;
}

/**
 * 更新用户选择的ASR提供商
 */
export async function updateUserAsrProvider(userId: string, providerId: string): Promise<void> {
  const res = await request(`/asr/users/${userId}/provider`, {
    method: 'PUT',
    body: JSON.stringify({ providerId })
  });
  if (!res.success) {
    throw new Error(res.error || '更新ASR提供商失败');
  }
}

/**
 * 更新用户的ASR提供商配置
 */
export async function updateUserAsrConfig(
  userId: string, 
  providerId: string, 
  config: Record<string, any>
): Promise<void> {
  const res = await request(`/asr/users/${userId}/config/${providerId}`, {
    method: 'PUT',
    body: JSON.stringify(config)
  });
  if (!res.success) {
    throw new Error(res.error || '更新ASR配置失败');
  }
}

/**
 * 验证用户的ASR配置
 */
export async function validateUserAsrConfig(
  userId: string, 
  providerId: string
): Promise<{
  valid: boolean;
  missingFields: string[];
  message: string;
}> {
  const res = await request(`/asr/users/${userId}/validate/${providerId}`);
  if (!res.success) {
    throw new Error(res.error || '验证ASR配置失败');
  }
  return res.data;
}