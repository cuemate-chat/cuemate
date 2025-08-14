import Icon from '../../assets/llm/xf_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'iflytek',
  name: '讯飞星火',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  modelNamePlaceholder: '如 generalv3.5 / generalv3 / generalv2',
  baseModels: ['generalv3.5', 'generalv3', 'generalv2'],
  credentialFields: [
    { key: 'base_url', label: 'API URL', type: 'text' },
    { key: 'api_key', label: 'API Key', required: true, type: 'password' },
  ],
  defaultParams: [
    {
      label: '温度',
      param_key: 'temperature',
      ui_type: 'slider',
      value: '0.5',
      default_value: '0.5',
      extra: { min: 0, max: 1, step: 0.1 },
    },
    {
      label: '输出最大 tokens',
      param_key: 'max_tokens',
      ui_type: 'slider',
      value: '4096',
      default_value: '4096',
      extra: { min: 512, max: 8192, step: 256 },
    },
  ],
};

export default manifest;
