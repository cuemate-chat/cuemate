import Icon from '../../assets/llm/openai_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'openai',
  name: 'OpenAI',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  icon_url: 'assets/llm/openai_icon_svg',
  modelNamePlaceholder: '如 gpt-5, gpt-4o, gpt-3.5-turbo 等',
  baseModels: [
    'gpt-5',
    'gpt-5-mini',
    'gpt-5-nano',
    'gpt-4.1',
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-4',
    'gpt-3.5-turbo',
    'text-embedding-3-small',
    'text-embedding-3-large',
    'dall-e-3',
    'dall-e-2',
    'whisper-1',
    'tts-1',
    'tts-1-hd',
  ],
  credentialFields: [
    {
      key: 'base_url',
      label: 'API URL',
      type: 'text',
      placeholder: '默认 https://api.openai.com/v1（可选，代理 Base URL）',
      defaultValue: 'https://api.openai.com/v1',
    },
    { 
      key: 'api_key', 
      label: 'API Key', 
      required: true, 
      type: 'password',
      placeholder: '格式：sk-开头的48位字符的API Key'
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
