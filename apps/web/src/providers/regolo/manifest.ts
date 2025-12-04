import Icon from '../../assets/llm/regolo_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'regolo',
  name: 'Regolo',
  scope: 'private',
  kind: 'llm',
  icon: Icon,
  iconUrl: 'assets/llm/regolo_icon_svg',
  jumpLink: 'https://cuemate.chat/guide/models/providers/regolo.html',
  modelNamePlaceholder: '如 deepseek-r1-70b / Llama-3.3-70B-Instruct',
  baseModels: [
    {
      name: 'deepseek-r1-70b',
      defaultParams: [
        {
          label: '温度',
          paramKey: 'temperature',
          uiType: 'slider',
          value: '0.7',
          defaultValue: '0.7',
          extra: { min: 0, max: 2, step: 0.1 },
        },
        {
          label: '输出最大 tokens',
          paramKey: 'max_tokens',
          uiType: 'slider',
          value: '8192',
          defaultValue: '8192',
          extra: { min: 256, max: 65536, step: 256 },
        },
      ],
    },
    {
      name: 'llama-guard3-8b',
      defaultParams: [
        {
          label: '温度',
          paramKey: 'temperature',
          uiType: 'slider',
          value: '0.7',
          defaultValue: '0.7',
          extra: { min: 0, max: 2, step: 0.1 },
        },
        {
          label: '输出最大 tokens',
          paramKey: 'max_tokens',
          uiType: 'slider',
          value: '8192',
          defaultValue: '8192',
          extra: { min: 256, max: 8192, step: 128 },
        },
      ],
    },
    {
      name: 'qwen3-30b',
      defaultParams: [
        {
          label: '温度',
          paramKey: 'temperature',
          uiType: 'slider',
          value: '0.7',
          defaultValue: '0.7',
          extra: { min: 0, max: 2, step: 0.1 },
        },
        {
          label: '输出最大 tokens',
          paramKey: 'max_tokens',
          uiType: 'slider',
          value: '8192',
          defaultValue: '8192',
          extra: { min: 256, max: 32768, step: 256 },
        },
      ],
    },
    {
      name: 'qwen3-coder-30b',
      defaultParams: [
        {
          label: '温度',
          paramKey: 'temperature',
          uiType: 'slider',
          value: '0.7',
          defaultValue: '0.7',
          extra: { min: 0, max: 2, step: 0.1 },
        },
        {
          label: '输出最大 tokens',
          paramKey: 'max_tokens',
          uiType: 'slider',
          value: '8192',
          defaultValue: '8192',
          extra: { min: 256, max: 262144, step: 512 },
        },
      ],
    },
    {
      name: 'mistral-small3.2',
      defaultParams: [
        {
          label: '温度',
          paramKey: 'temperature',
          uiType: 'slider',
          value: '0.7',
          defaultValue: '0.7',
          extra: { min: 0, max: 1, step: 0.1 },
        },
        {
          label: '输出最大 tokens',
          paramKey: 'max_tokens',
          uiType: 'slider',
          value: '8192',
          defaultValue: '8192',
          extra: { min: 256, max: 32768, step: 256 },
        },
      ],
    },
    {
      name: 'gpt-oss-120b',
      defaultParams: [
        {
          label: '温度',
          paramKey: 'temperature',
          uiType: 'slider',
          value: '0.7',
          defaultValue: '0.7',
          extra: { min: 0, max: 2, step: 0.1 },
        },
        {
          label: '输出最大 tokens',
          paramKey: 'max_tokens',
          uiType: 'slider',
          value: '8192',
          defaultValue: '8192',
          extra: { min: 256, max: 8192, step: 128 },
        },
      ],
    },
    {
      name: 'Llama-3.3-70B-Instruct',
      defaultParams: [
        {
          label: '温度',
          paramKey: 'temperature',
          uiType: 'slider',
          value: '0.7',
          defaultValue: '0.7',
          extra: { min: 0, max: 2, step: 0.1 },
        },
        {
          label: '输出最大 tokens',
          paramKey: 'max_tokens',
          uiType: 'slider',
          value: '8192',
          defaultValue: '8192',
          extra: { min: 256, max: 8192, step: 128 },
        },
      ],
    },
    {
      name: 'Llama-3.1-8B-Instruct',
      defaultParams: [
        {
          label: '温度',
          paramKey: 'temperature',
          uiType: 'slider',
          value: '0.7',
          defaultValue: '0.7',
          extra: { min: 0, max: 2, step: 0.1 },
        },
        {
          label: '输出最大 tokens',
          paramKey: 'max_tokens',
          uiType: 'slider',
          value: '8192',
          defaultValue: '8192',
          extra: { min: 256, max: 8192, step: 128 },
        },
      ],
    },
    {
      name: 'maestrale-chat-v0.4-beta',
      defaultParams: [
        {
          label: '温度',
          paramKey: 'temperature',
          uiType: 'slider',
          value: '0.7',
          defaultValue: '0.7',
          extra: { min: 0, max: 1, step: 0.1 },
        },
        {
          label: '输出最大 tokens',
          paramKey: 'max_tokens',
          uiType: 'slider',
          value: '8192',
          defaultValue: '8192',
          extra: { min: 256, max: 8192, step: 128 },
        },
      ],
    },
    {
      name: 'Qwen3-8B',
      defaultParams: [
        {
          label: '温度',
          paramKey: 'temperature',
          uiType: 'slider',
          value: '0.7',
          defaultValue: '0.7',
          extra: { min: 0, max: 2, step: 0.1 },
        },
        {
          label: '输出最大 tokens',
          paramKey: 'max_tokens',
          uiType: 'slider',
          value: '8192',
          defaultValue: '8192',
          extra: { min: 256, max: 32768, step: 256 },
        },
      ],
    },
    {
      name: 'gemma-3-27b-it',
      defaultParams: [
        {
          label: '温度',
          paramKey: 'temperature',
          uiType: 'slider',
          value: '0.7',
          defaultValue: '0.7',
          extra: { min: 0, max: 2, step: 0.1 },
        },
        {
          label: '输出最大 tokens',
          paramKey: 'max_tokens',
          uiType: 'slider',
          value: '8192',
          defaultValue: '8192',
          extra: { min: 256, max: 131072, step: 256 },
        },
      ],
    },
  ],
  credentialFields: [
    {
      key: 'base_url',
      label: 'API URL',
      type: 'text',
      placeholder: '默认 https://api.regolo.ai/v1（可选，代理 Base URL）',
      defaultValue: 'https://api.regolo.ai/v1',
    },
    {
      key: 'api_key',
      label: 'API Key',
      required: true,
      type: 'password',
      placeholder: '格式：Regolo 平台的 API Key，需在官网注册获取',
    },
  ],
};

export default manifest;
