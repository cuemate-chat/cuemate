import Icon from '../../assets/llm/kimi_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'kimi',
  name: 'Kimi',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  modelNamePlaceholder: '如 moonshot-v1-8k / moonshot-v1-32k',
  baseModels: ['moonshot-v1-8k', 'moonshot-v1-32k'],
  credentialFields: [
    {
      key: 'base_url',
      label: 'API URL',
      type: 'text',
      placeholder: '默认 https://api.moonshot.cn/v1',
    },
    { key: 'api_key', label: 'API Key', required: true, type: 'password' },
  ],
  defaultParams: [
    {
      label: '温度',
      param_key: 'temperature',
      ui_type: 'slider',
      value: '0.3',
      default_value: '0.3',
      extra: { min: 0, max: 1, step: 0.1 },
    },
    {
      label: '输出最大 tokens',
      param_key: 'max_tokens',
      ui_type: 'slider',
      value: '1024',
      default_value: '1024',
      extra: { min: 256, max: 8192, step: 128 },
    },
  ],
};

export default manifest;
