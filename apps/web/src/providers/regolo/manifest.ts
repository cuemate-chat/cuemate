import Icon from '../../assets/llm/regolo_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'regolo',
  name: 'Regolo',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  modelNamePlaceholder: '如 Phi-4 / Llama-3.3-70B-Instruct',
  baseModels: [
    'Phi-4',
    'DeepSeek-R1-Distill-Qwen-32B',
    'DeepSeek-R1-Distill-Qwen-14B',
    'DeepSeek-R1-Distill-Qwen-7B',
    'DeepSeek-R1-Distill-Llama-8B',
    'maestrale-chat-v0.4-beta',
    'Llama-3.3-70B-Instruct',
    'Llama-3.1-70B-Instruct',
    'Llama-3.1-8B-Instruct',
    'DeepSeek-Coder-6.7B-Instruct',
    'Qwen2.5-72B-Instruct',
  ],
  credentialFields: [
    { 
      key: 'base_url', 
      label: 'API URL', 
      type: 'text', 
      placeholder: '默认 https://api.regolo.ai/v1（可选，代理 Base URL）',
      defaultValue: 'https://api.regolo.ai/v1'
    },
    { 
      key: 'api_key', 
      label: 'API Key', 
      required: true, 
      type: 'password',
      placeholder: '格式：Regolo平台的API Key，需在官网注册获取'
    },
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
