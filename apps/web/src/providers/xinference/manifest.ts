import Icon from '../../assets/llm/xinference_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'xinference',
  name: 'Xorbits Inference',
  scope: 'private',
  kind: 'llm',
  icon: Icon,
  icon_url: 'assets/llm/xinference_icon_svg',
  modelNamePlaceholder: '如 qwen2.5-7b-instruct / llama2-chat',
  baseModels: [
    {
      name: 'deepseek-coder',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.7',
          default_value: '0.7',
          extra: { min: 0, max: 2, step: 0.1 },
        },
        {
          label: '输出最大tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '8192',
          default_value: '8192',
          extra: { min: 256, max: 8192, step: 128 },
        },
      ],
    },
    {
      name: 'deepseek-coder-instruct',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.7',
          default_value: '0.7',
          extra: { min: 0, max: 2, step: 0.1 },
        },
        {
          label: '输出最大tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '8192',
          default_value: '8192',
          extra: { min: 256, max: 8192, step: 128 },
        },
      ],
    },
    {
      name: 'deepseek-vl-chat',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.7',
          default_value: '0.7',
          extra: { min: 0, max: 2, step: 0.1 },
        },
        {
          label: '输出最大tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '4096',
          default_value: '4096',
          extra: { min: 256, max: 4096, step: 128 },
        },
      ],
    },
    {
      name: 'gpt-3.5-turbo',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.7',
          default_value: '0.7',
          extra: { min: 0, max: 2, step: 0.1 },
        },
        {
          label: '输出最大tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '4096',
          default_value: '4096',
          extra: { min: 256, max: 4096, step: 128 },
        },
      ],
    },
    {
      name: 'gpt-4',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.7',
          default_value: '0.7',
          extra: { min: 0, max: 2, step: 0.1 },
        },
        {
          label: '输出最大tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '8192',
          default_value: '8192',
          extra: { min: 256, max: 8192, step: 128 },
        },
      ],
    },
    {
      name: 'gpt-4-vision-preview',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.7',
          default_value: '0.7',
          extra: { min: 0, max: 2, step: 0.1 },
        },
        {
          label: '输出最大tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '4096',
          default_value: '4096',
          extra: { min: 256, max: 4096, step: 128 },
        },
      ],
    },
    {
      name: 'gpt4all',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.7',
          default_value: '0.7',
          extra: { min: 0, max: 2, step: 0.1 },
        },
        {
          label: '输出最大tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '2048',
          default_value: '2048',
          extra: { min: 256, max: 2048, step: 128 },
        },
      ],
    },
    {
      name: 'llama2',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.7',
          default_value: '0.7',
          extra: { min: 0, max: 2, step: 0.1 },
        },
        {
          label: '输出最大tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '4096',
          default_value: '4096',
          extra: { min: 256, max: 4096, step: 128 },
        },
      ],
    },
    {
      name: 'llama2-chat',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.7',
          default_value: '0.7',
          extra: { min: 0, max: 2, step: 0.1 },
        },
        {
          label: '输出最大tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '4096',
          default_value: '4096',
          extra: { min: 256, max: 4096, step: 128 },
        },
      ],
    },
    {
      name: 'llama2-chat-32k',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.7',
          default_value: '0.7',
          extra: { min: 0, max: 2, step: 0.1 },
        },
        {
          label: '输出最大tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '8192',
          default_value: '8192',
          extra: { min: 256, max: 8192, step: 128 },
        },
      ],
    },
    {
      name: 'qwen',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.7',
          default_value: '0.7',
          extra: { min: 0, max: 1, step: 0.1 },
        },
        {
          label: '输出最大tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '8192',
          default_value: '8192',
          extra: { min: 256, max: 8192, step: 128 },
        },
      ],
    },
    {
      name: 'qwen-chat',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.7',
          default_value: '0.7',
          extra: { min: 0, max: 1, step: 0.1 },
        },
        {
          label: '输出最大tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '8192',
          default_value: '8192',
          extra: { min: 256, max: 8192, step: 128 },
        },
      ],
    },
    {
      name: 'qwen-chat-32k',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.7',
          default_value: '0.7',
          extra: { min: 0, max: 1, step: 0.1 },
        },
        {
          label: '输出最大tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '8192',
          default_value: '8192',
          extra: { min: 256, max: 8192, step: 128 },
        },
      ],
    },
    {
      name: 'qwen-code',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.7',
          default_value: '0.7',
          extra: { min: 0, max: 1, step: 0.1 },
        },
        {
          label: '输出最大tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '8192',
          default_value: '8192',
          extra: { min: 256, max: 8192, step: 128 },
        },
      ],
    },
    {
      name: 'qwen-code-chat',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.7',
          default_value: '0.7',
          extra: { min: 0, max: 1, step: 0.1 },
        },
        {
          label: '输出最大tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '8192',
          default_value: '8192',
          extra: { min: 256, max: 8192, step: 128 },
        },
      ],
    },
    {
      name: 'qwen2.5-72b-instruct',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.7',
          default_value: '0.7',
          extra: { min: 0, max: 1, step: 0.1 },
        },
        {
          label: '输出最大tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '8192',
          default_value: '8192',
          extra: { min: 256, max: 8192, step: 128 },
        },
      ],
    },
    {
      name: 'qwen2.5-32b-instruct',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.7',
          default_value: '0.7',
          extra: { min: 0, max: 1, step: 0.1 },
        },
        {
          label: '输出最大tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '8192',
          default_value: '8192',
          extra: { min: 256, max: 8192, step: 128 },
        },
      ],
    },
    {
      name: 'qwen2.5-14b-instruct',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.7',
          default_value: '0.7',
          extra: { min: 0, max: 1, step: 0.1 },
        },
        {
          label: '输出最大tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '8192',
          default_value: '8192',
          extra: { min: 256, max: 8192, step: 128 },
        },
      ],
    },
    {
      name: 'qwen2.5-7b-instruct',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.7',
          default_value: '0.7',
          extra: { min: 0, max: 1, step: 0.1 },
        },
        {
          label: '输出最大tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '8192',
          default_value: '8192',
          extra: { min: 256, max: 8192, step: 128 },
        },
      ],
    },
    {
      name: 'qwen2.5-1.5b-instruct',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.7',
          default_value: '0.7',
          extra: { min: 0, max: 1, step: 0.1 },
        },
        {
          label: '输出最大tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '8192',
          default_value: '8192',
          extra: { min: 256, max: 8192, step: 128 },
        },
      ],
    },
    {
      name: 'qwen2.5-0.5b-instruct',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.7',
          default_value: '0.7',
          extra: { min: 0, max: 1, step: 0.1 },
        },
        {
          label: '输出最大tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '8192',
          default_value: '8192',
          extra: { min: 256, max: 8192, step: 128 },
        },
      ],
    },
    {
      name: 'qwen2.5-3b-instruct',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.7',
          default_value: '0.7',
          extra: { min: 0, max: 1, step: 0.1 },
        },
        {
          label: '输出最大tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '8192',
          default_value: '8192',
          extra: { min: 256, max: 8192, step: 128 },
        },
      ],
    },
    {
      name: 'minicpm-llama3-v-2_5',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.7',
          default_value: '0.7',
          extra: { min: 0, max: 2, step: 0.1 },
        },
        {
          label: '输出最大tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '4096',
          default_value: '4096',
          extra: { min: 256, max: 4096, step: 128 },
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
  ]
};

export default manifest;
