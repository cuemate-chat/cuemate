import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MicrophoneIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import { getAsrProviders, getUserAsrConfig, updateUserAsrConfig, updateUserAsrProvider, validateUserAsrConfig } from '../api/asr';
import { storage } from '../api/http';
import { message } from '../components/Message';

interface AsrProvider {
  id: string;
  name: string;
  display_name: string;
  provider_type: 'deepgram' | 'openai_whisper' | 'vosk';
  description?: string;
  default_config: Record<string, any>;
  required_fields: string[];
  is_enabled: boolean;
}

interface AsrConfig {
  userId: string;
  selectedProviderId: string;
  selectedProvider: AsrProvider;
  currentConfig: Record<string, any>;
  availableProviders: AsrProvider[];
}

export default function AsrSettings() {
  const [asrConfig, setAsrConfig] = useState<AsrConfig | null>(null);
  const [asrProviders, setAsrProviders] = useState<AsrProvider[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [providerConfigs, setProviderConfigs] = useState<Record<string, any>>({});
  const [validationResults, setValidationResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAsrConfig();
  }, []);

  const loadAsrConfig = async () => {
    setLoading(true);
    try {
      const user = storage.getUser();
      if (!user?.id) {
        message.error('用户信息不存在');
        return;
      }

      // 获取所有可用的ASR提供商
      const providers = await getAsrProviders();
      setAsrProviders(providers);

      // 获取用户的ASR配置
      const userConfig = await getUserAsrConfig(user.id);
      setAsrConfig(userConfig);
      setSelectedProviderId(userConfig.selectedProviderId);

      // 初始化各个提供商的配置
      const configs: Record<string, any> = {};
      for (const provider of providers) {
        if (provider.id === userConfig.selectedProviderId) {
          configs[provider.id] = userConfig.currentConfig;
        } else {
          configs[provider.id] = { ...provider.default_config };
        }
      }
      setProviderConfigs(configs);

      // 验证所有提供商的配置
      await validateAllConfigs(user.id, providers);
    } catch (error: any) {
      message.error(error.message || '加载ASR配置失败');
    } finally {
      setLoading(false);
    }
  };

  const validateAllConfigs = async (userId: string, providers: AsrProvider[]) => {
    const results: Record<string, any> = {};
    
    for (const provider of providers) {
      try {
        const validation = await validateUserAsrConfig(userId, provider.id);
        results[provider.id] = validation;
      } catch (error) {
        results[provider.id] = { valid: false, missingFields: [], message: '验证失败' };
      }
    }
    
    setValidationResults(results);
  };

  const handleProviderChange = async (providerId: string) => {
    try {
      const user = storage.getUser();
      if (!user?.id) return;

      await updateUserAsrProvider(user.id, providerId);
      setSelectedProviderId(providerId);
      message.success('ASR提供商已更新');
      
      // 重新加载配置
      await loadAsrConfig();
    } catch (error: any) {
      message.error(error.message || '更新ASR提供商失败');
    }
  };

  const handleConfigChange = (providerId: string, field: string, value: any) => {
    setProviderConfigs(prev => ({
      ...prev,
      [providerId]: {
        ...prev[providerId],
        [field]: value
      }
    }));
  };

  const handleSaveConfig = async (providerId: string) => {
    try {
      const user = storage.getUser();
      if (!user?.id) return;

      const config = providerConfigs[providerId];
      await updateUserAsrConfig(user.id, providerId, config);
      message.success('配置已保存');

      // 重新验证
      const validation = await validateUserAsrConfig(user.id, providerId);
      setValidationResults(prev => ({
        ...prev,
        [providerId]: validation
      }));
    } catch (error: any) {
      message.error(error.message || '保存配置失败');
    }
  };

  const getProviderIcon = (type: string) => {
    switch (type) {
      case 'deepgram':
        return '🎙️';
      case 'openai_whisper':
        return '🤖';
      case 'vosk':
        return '🖥️';
      default:
        return '🔊';
    }
  };

  const getValidationIcon = (validation: any) => {
    if (!validation) return null;
    return validation.valid 
      ? <CheckCircleIcon className="w-5 h-5 text-green-500" />
      : <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">加载语音设置...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-3 mb-2">
          <MicrophoneIcon className="w-6 h-6 text-slate-700" />
          <h1 className="text-2xl font-semibold text-slate-900">语音识别设置</h1>
        </div>
        <p className="text-slate-600">配置和管理语音识别服务提供商</p>
      </header>

      {/* 当前选择的提供商 */}
      <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <header className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-slate-900 font-semibold">当前语音识别提供商</h2>
        </header>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {asrConfig?.selectedProvider && (
                <>
                  <span className="text-2xl">{getProviderIcon(asrConfig.selectedProvider.provider_type)}</span>
                  <div>
                    <h3 className="font-medium text-slate-900">{asrConfig.selectedProvider.display_name}</h3>
                    <p className="text-sm text-slate-600">{asrConfig.selectedProvider.description}</p>
                  </div>
                </>
              )}
            </div>
            {asrConfig?.selectedProviderId && (
              <div className="flex items-center gap-2">
                {getValidationIcon(validationResults[asrConfig.selectedProviderId])}
                <span className={`text-sm ${
                  validationResults[asrConfig.selectedProviderId]?.valid 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {validationResults[asrConfig.selectedProviderId]?.valid ? '配置有效' : '需要配置'}
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 提供商列表和配置 */}
      <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <header className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-slate-900 font-semibold">语音识别提供商</h2>
        </header>
        <div className="divide-y divide-slate-200">
          {asrProviders.map((provider) => (
            <AsrProviderCard
              key={provider.id}
              provider={provider}
              isSelected={provider.id === selectedProviderId}
              config={providerConfigs[provider.id] || {}}
              validation={validationResults[provider.id]}
              onSelect={() => handleProviderChange(provider.id)}
              onConfigChange={(field, value) => handleConfigChange(provider.id, field, value)}
              onSave={() => handleSaveConfig(provider.id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function AsrProviderCard({
  provider,
  isSelected,
  config,
  validation,
  onSelect,
  onConfigChange,
  onSave
}: {
  provider: AsrProvider;
  isSelected: boolean;
  config: Record<string, any>;
  validation: any;
  onSelect: () => void;
  onConfigChange: (field: string, value: any) => void;
  onSave: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave();
    } finally {
      setSaving(false);
    }
  };

  const getProviderIcon = (type: string) => {
    switch (type) {
      case 'deepgram':
        return '🎙️';
      case 'openai_whisper':
        return '🤖';
      case 'vosk':
        return '🖥️';
      default:
        return '🔊';
    }
  };

  const getFieldLabel = (field: string): string => {
    const labels: Record<string, string> = {
      apiKey: 'API Key',
      model_path: '模型路径',
      localModelPath: '本地模型路径'
    };
    return labels[field] || field;
  };

  const getFieldPlaceholder = (field: string): string => {
    switch (field) {
      case 'apiKey':
        return provider.provider_type === 'deepgram' 
          ? '输入 Deepgram API Key' 
          : provider.provider_type === 'openai_whisper' 
          ? '输入 OpenAI API Key (sk-...)' 
          : '输入 API Key';
      case 'model_path':
      case 'localModelPath':
        return '输入模型文件或文件夹路径，如 ./models/vosk';
      default:
        return `输入 ${field}`;
    }
  };

  return (
    <div className={`p-6 ${isSelected ? 'bg-blue-50' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-2xl">{getProviderIcon(provider.provider_type)}</span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-slate-900">{provider.display_name}</h3>
              {isSelected && (
                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">当前选择</span>
              )}
            </div>
            <p className="text-sm text-slate-600">{provider.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {validation && (
            <div className="flex items-center gap-1">
              {validation.valid 
                ? <CheckCircleIcon className="w-4 h-4 text-green-500" />
                : <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
              }
              <span className={`text-xs ${validation.valid ? 'text-green-600' : 'text-red-600'}`}>
                {validation.valid ? '已配置' : '需要配置'}
              </span>
            </div>
          )}
          <button
            onClick={onSelect}
            disabled={isSelected}
            className={`px-4 py-2 text-sm rounded-lg ${
              isSelected 
                ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-500'
            }`}
          >
            {isSelected ? '已选择' : '选择'}
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {expanded ? '收起' : '配置'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="space-y-4">
            {provider.required_fields.map((field) => (
              <div key={field}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {getFieldLabel(field)} <span className="text-red-500">*</span>
                </label>
                <input
                  type={field.toLowerCase().includes('key') || field.toLowerCase().includes('password') ? 'password' : 'text'}
                  value={config[field] || ''}
                  onChange={(e) => onConfigChange(field, e.target.value)}
                  placeholder={getFieldPlaceholder(field)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            ))}

            {/* 显示验证信息 */}
            {validation && !validation.valid && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{validation.message}</p>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500 disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存配置'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}