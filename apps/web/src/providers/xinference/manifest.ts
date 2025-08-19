import Icon from '../../assets/llm/xinference_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'xinference',
  name: 'Xorbits Inference',
  scope: 'private',
  kind: 'llm',
  icon: Icon,
  modelNamePlaceholder: '如 qwen2.5-7b-instruct / llama2-chat',
  baseModels: [
    'deepseek-coder',
    'deepseek-coder-instruct',
    'deepseek-vl-chat',
    'gpt-3.5-turbo',
    'gpt-4',
    'gpt-4-vision-preview',
    'gpt4all',
    'llama2',
    'llama2-chat',
    'llama2-chat-32k',
    'qwen',
    'qwen-chat',
    'qwen-chat-32k',
    'qwen-code',
    'qwen-code-chat',
    'qwen2.5-72b-instruct',
    'qwen2.5-32b-instruct',
    'qwen2.5-14b-instruct',
    'qwen2.5-7b-instruct',
    'qwen2.5-1.5b-instruct',
    'qwen2.5-0.5b-instruct',
    'qwen2.5-3b-instruct',
    'minicpm-llama3-v-2_5',
  ],
  credentialFields: [
    {
      key: 'base_url',
      label: 'API URL',
      type: 'text',
      required: true,
      placeholder: '默认 http://localhost:9997/v1（Xinference本地服务API地址）',
      defaultValue: 'http://localhost:9997/v1',
    },
    { 
      key: 'api_key', 
      label: 'API Key', 
      type: 'password', 
      required: true,
      placeholder: '格式：Xinference服务的API密钥（可选，若未设置可为空）'
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
