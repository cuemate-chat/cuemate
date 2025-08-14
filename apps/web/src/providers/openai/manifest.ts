import Icon from '../../assets/llm/openai_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'openai',
  name: 'OpenAI',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  modelNamePlaceholder: '如 gpt-5',
  baseModels: ['gpt-5'],
  credentialFields: [
    {
      key: 'base_url',
      label: 'API URL',
      type: 'text',
      placeholder: '默认 https://api.openai.com/v1（可选，代理 Base URL）',
    },
    { key: 'api_key', label: 'API Key', required: true, type: 'password' },
  ],
  defaultParams: [
    {
      label: '温度',
      param_key: 'temperature',
      ui_type: 'slider',
      value: '0.7',
      default_value: '0.7',
      extra: { min: 0, max: 1, step: 0.1 },
    },
    {
      label: '输出最大 tokens',
      param_key: 'max_tokens',
      ui_type: 'slider',
      value: '800',
      default_value: '800',
      extra: { min: 256, max: 8192, step: 128 },
    },
  ],
};

export default manifest;
