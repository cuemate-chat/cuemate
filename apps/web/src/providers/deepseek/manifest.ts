import Icon from '../../assets/llm/deepseek_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'deepseek',
  name: 'DeepSeek',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  modelNamePlaceholder: '如 deepseek-reasoner / deepseek-chat 或 deepseek-r1:32b',
  baseModels: [
    'deepseek-reasoner',
    'deepseek-chat',
    'deepseek-coder',
    'deepseek-r1',
    'deepseek-r1:7b',
    'deepseek-r1:32b',
  ],
  credentialFields: [
    { key: 'base_url', label: 'API URL', type: 'text', placeholder: '可选，OpenAI 兼容 Base URL' },
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
      value: '800',
      default_value: '800',
      extra: { min: 256, max: 8192, step: 128 },
    },
  ],
};

export default manifest;
