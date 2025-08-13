import Icon from '../../assets/llm/aliyun_bai_lian_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'aliyun-bailian',
  name: '阿里云百炼',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  modelNamePlaceholder: '如 qwen-max / qwen-plus / qwen2.5-7b-instruct',
  baseModels: [
    'qwen3-0.6b',
    'qwen3-1.7b',
    'qwen3-4b',
    'qwen3-8b',
    'qwen3-14b',
    'qwen3-32b',
    'qwen3-30b-a3b',
    'qwen3-235b-a22b',
    'qwen-turbo',
    'qwen-plus',
    'qwen-max',
  ],
  credentialFieldsPerModel: {
    default: [
      {
        key: 'base_url',
        label: 'API URL',
        type: 'text',
        placeholder: '可选，OpenAI 兼容 Base URL',
      },
      { key: 'api_key', label: 'API Key', required: true, type: 'password' },
    ],
  },
  credentialFields: [
    { key: 'base_url', label: 'API URL', type: 'text', placeholder: '可选，OpenAI 兼容 Base URL' },
    { key: 'api_key', label: 'API Key', required: true, type: 'password' },
  ],
  defaultParams: [
    {
      label: '温度',
      param_key: 'temperature',
      ui_type: 'slider',
      value: '0.7',
      default_value: '0.7',
      required: true,
      extra: { min: 0, max: 1, step: 0.1 },
    },
    {
      label: '输出最大Token数',
      param_key: 'max_tokens',
      ui_type: 'input',
      value: '800',
      default_value: '800',
      required: true,
    },
    {
      label: '是否流式回音',
      param_key: 'stream',
      ui_type: 'switch',
      value: 'true',
      default_value: 'true',
      required: true,
    },
  ],
};

export default manifest;
