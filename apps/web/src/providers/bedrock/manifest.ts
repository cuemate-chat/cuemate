import Icon from '../../assets/llm/bedrock_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'aws-bedrock',
  name: 'Amazon Bedrock',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  modelNamePlaceholder:
    '如 anthropic.claude-instant-v1 / meta.llama3-70b-instruct / mistral.mistral-7b-instruct-v0.2',
  baseModels: [
    'anthropic.claude-3-7-sonnet',
    'anthropic.claude-instant-v1',
    'mistral.mistral-7b-instruct-v0.2',
    'mistral.mistral-large-2402-v1.0',
    'meta.llama3-70b-instruct-v1:0',
    'meta.llama3-8b-instruct-v1:0',
    'amazon.titan-text-express-v1',
    'amazon.titan-text-lite-v1',
  ],
  credentialFields: [
    { key: 'base_url', label: 'API URL', type: 'text', placeholder: '可选，代理 Base URL' },
    { key: 'api_key', label: 'API Key', type: 'password', required: false },
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
      value: '1024',
      default_value: '1024',
      extra: { min: 256, max: 8192, step: 128 },
    },
  ],
};

export default manifest;
