import Icon from '../../assets/llm/xinference_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'xinference',
  name: 'Xorbits Inference',
  scope: 'private',
  kind: 'llm',
  icon: Icon,
  iconUrl: 'assets/llm/xinference_icon_svg',
  jumpLink: 'https://cuemate.chat/guide/models/providers/xinference.html',
  modelNamePlaceholder: '如 qwen2.5-7b-instruct / deepseek-r1-8b / llama-3.1-8b-instruct',
  baseModels: [
    {
      name: 'qwen2.5-72b-instruct',
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
          extra: { min: 256, max: 32768, step: 128 },
        },
      ],
    },
    {
      name: 'qwen2.5-32b-instruct',
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
          extra: { min: 256, max: 32768, step: 128 },
        },
      ],
    },
    {
      name: 'qwen2.5-14b-instruct',
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
          extra: { min: 256, max: 32768, step: 128 },
        },
      ],
    },
    {
      name: 'qwen2.5-7b-instruct',
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
          extra: { min: 256, max: 32768, step: 128 },
        },
      ],
    },
    {
      name: 'qwen2.5-coder-32b-instruct',
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
          extra: { min: 256, max: 32768, step: 128 },
        },
      ],
    },
    {
      name: 'qwen2.5-coder-7b-instruct',
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
          extra: { min: 256, max: 32768, step: 128 },
        },
      ],
    },
    {
      name: 'deepseek-r1-8b',
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
          extra: { min: 256, max: 65536, step: 128 },
        },
      ],
    },
    {
      name: 'llama-3.3-70b-instruct',
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
          extra: { min: 256, max: 131072, step: 128 },
        },
      ],
    },
    {
      name: 'llama-3.1-70b-instruct',
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
          extra: { min: 256, max: 131072, step: 128 },
        },
      ],
    },
    {
      name: 'llama-3.1-8b-instruct',
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
          extra: { min: 256, max: 131072, step: 128 },
        },
      ],
    },
    {
      name: 'mistral-7b-instruct-v0.3',
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
          extra: { min: 256, max: 32768, step: 128 },
        },
      ],
    },
    {
      name: 'gemma-2-27b-it',
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
      name: 'gemma-2-9b-it',
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
      name: 'glm-4-9b-chat',
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
          extra: { min: 256, max: 131072, step: 128 },
        },
      ],
    },
  ],
  credentialFields: [
    {
      key: 'base_url',
      label: 'API URL',
      type: 'text',
      required: true,
      placeholder: '默认 http://localhost:9997/v1（Xinference 本地服务 API 地址）',
      defaultValue: 'http://localhost:9997/v1',
    },
    {
      key: 'api_key',
      label: 'API Key',
      type: 'password',
      required: false,
      placeholder: '可选，Xinference 服务启动时配置了 --api-key 参数时填写'
    },
  ]
};

export default manifest;
