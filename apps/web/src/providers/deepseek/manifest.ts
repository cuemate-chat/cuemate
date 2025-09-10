import Icon from '../../assets/llm/deepseek_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'deepseek',
  name: 'DeepSeek',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  icon_url: 'assets/llm/deepseek_icon_svg',
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
    { 
      key: 'base_url', 
      label: 'API URL', 
      type: 'text', 
      placeholder: '默认 https://api.deepseek.com/v1（可选，代理 Base URL）',
      defaultValue: 'https://api.deepseek.com/v1'
    },
    { 
      key: 'api_key', 
      label: 'API Key', 
      required: true, 
      type: 'password',
      placeholder: '格式：sk-开头的API Key，需在DeepSeek官网获取'
    },
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
