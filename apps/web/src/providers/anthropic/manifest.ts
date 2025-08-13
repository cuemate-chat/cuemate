import Icon from '../../assets/llm/anthropic_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'anthropic',
  name: 'Anthropic',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  modelNamePlaceholder: '如 claude-3-7-sonnet',
  credentialFields: [
    { key: 'base_url', label: 'API URL', type: 'text', placeholder: '可选，代理 Base URL' },
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
      label: '最大输出 Token',
      param_key: 'max_tokens',
      ui_type: 'input',
      value: '2000',
      default_value: '2000',
    },
  ],
};

export default manifest;
