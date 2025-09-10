import Icon from '../../assets/llm/bedrock_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'aws-bedrock',
  name: 'Amazon Bedrock',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  icon_url: 'assets/llm/bedrock_icon_svg',
  modelNamePlaceholder:
    '如 anthropic.claude-instant-v1 / meta.llama3-70b-instruct / mistral.mistral-7b-instruct-v0.2',
  baseModels: [
    'anthropic.claude-3-5-sonnet-20241022-v2:0',
    'anthropic.claude-3-5-sonnet-20240620-v1:0',
    'anthropic.claude-3-5-haiku-20241022-v1:0',
    'anthropic.claude-3-opus-20240229-v1:0',
    'anthropic.claude-3-sonnet-20240229-v1:0',
    'anthropic.claude-3-haiku-20240307-v1:0',
    'anthropic.claude-instant-v1',
    'meta.llama3-2-90b-instruct-v1:0',
    'meta.llama3-2-11b-instruct-v1:0',
    'meta.llama3-2-3b-instruct-v1:0',
    'meta.llama3-2-1b-instruct-v1:0',
    'meta.llama3-1-405b-instruct-v1:0',
    'meta.llama3-1-70b-instruct-v1:0',
    'meta.llama3-1-8b-instruct-v1:0',
    'mistral.mistral-large-2407-v1:0',
    'mistral.mistral-large-2402-v1:0',
    'mistral.mistral-7b-instruct-v0:2',
    'amazon.titan-text-premier-v1:0',
    'amazon.titan-text-express-v1',
    'amazon.titan-text-lite-v1',
  ],
  credentialFields: [
    { 
      key: 'base_url', 
      label: 'API URL', 
      type: 'text', 
      placeholder: '默认 https://bedrock-runtime.us-east-1.amazonaws.com（AWS Bedrock API地址）',
      defaultValue: 'https://bedrock-runtime.us-east-1.amazonaws.com'
    },
    { 
      key: 'api_key', 
      label: 'API Key', 
      type: 'password', 
      required: false,
      placeholder: '格式：AWS访问密钥（可选，优先使用IAM角色）'
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
      value: '1024',
      default_value: '1024',
      extra: { min: 256, max: 8192, step: 128 },
    },
  ],
};

export default manifest;
