import Icon from '../../assets/llm/local_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'local',
  name: '本地模型',
  scope: 'private',
  kind: 'llm',
  icon: Icon,
  icon_url: 'assets/llm/local_icon_svg',
  modelNamePlaceholder: '如 llama3.1:8b（配合 Ollama/vLLM/xInference 等）',
  baseModels: [
    {
      name: 'deepseek-r1:1.5b',
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
      name: 'deepseek-r1:7b',
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
      name: 'deepseek-r1:14b',
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
      name: 'deepseek-r1:32b',
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
      name: 'llama3.3:70b',
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
      name: 'llama3.2:90b',
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
      name: 'llama3.2:11b',
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
      name: 'llama3.2:3b',
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
      name: 'llama3.2:1b',
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
      name: 'llama3.1:405b',
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
      name: 'llama3.1:70b',
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
      name: 'llama3.1:8b',
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
      name: 'qwen2.5:72b',
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
      name: 'qwen2.5:32b',
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
      name: 'qwen2.5:14b',
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
      name: 'qwen2.5:7b',
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
      name: 'qwen2.5:3b',
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
      name: 'qwen2.5:1.5b',
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
      name: 'qwen2.5:0.5b',
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
  ],
  credentialFields: [
    {
      key: 'base_url',
      label: 'API URL',
      type: 'text',
      required: true,
      placeholder: '默认 http://localhost:11434（本地模型服务API地址）',
      defaultValue: 'http://localhost:11434',
    },
  ]
};

export default manifest;
