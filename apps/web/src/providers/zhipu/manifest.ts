import Icon from '../../assets/llm/zhipuai_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'zhipu',
  name: '智谱 AI',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  modelNamePlaceholder: '如 glm-4 / glm-4v / glm-3-turbo',
  baseModels: ['glm-4', 'glm-4v', 'glm-3-turbo'],
  credentialFields: [
    {
      key: 'base_url',
      label: 'API URL',
      type: 'text',
      placeholder: '默认 https://open.bigmodel.cn/api/paas/v4',
    },
    { key: 'api_key', label: 'API Key', required: true, type: 'password' },
  ],
  defaultParams: [
    {
      label: '温度',
      param_key: 'temperature',
      ui_type: 'slider',
      value: '0.95',
      default_value: '0.95',
      extra: { min: 0, max: 1, step: 0.05 },
    },
    {
      label: '输出最大 tokens',
      param_key: 'max_tokens',
      ui_type: 'slider',
      value: '1024',
      default_value: '1024',
      extra: { min: 256, max: 4096, step: 128 },
    },
  ],
};

export default manifest;
