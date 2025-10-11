import Icon from '../../assets/llm/ollama_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'ollama',
  name: 'Ollama',
  scope: 'private',
  kind: 'llm',
  icon: Icon,
  icon_url: 'assets/llm/ollama_icon_svg',
  modelNamePlaceholder: '如 deepseek-r1:7b / qwen2.5:7b-instruct',
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
      name: 'deepseek-r1:8b',
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
      name: 'llama3:8b',
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
      name: 'llama3:70b',
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
      name: 'llama2:70b',
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
      name: 'llama2-chinese:13b',
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
      name: 'qwen:0.5b',
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
      name: 'qwen:1.8b',
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
      name: 'qwen:4b',
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
      name: 'qwen:7b',
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
      name: 'qwen:14b',
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
      name: 'qwen:32b',
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
      name: 'qwen:72b',
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
      name: 'qwen:110b',
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
      name: 'qwen2.5:0.5b-instruct',
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
      name: 'qwen2.5:1.5b-instruct',
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
      name: 'qwen2.5:3b-instruct',
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
      name: 'qwen2.5:5b-instruct',
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
      name: 'qwen2.5:7b-instruct',
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
      name: 'qwen2.5:14b-instruct',
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
      name: 'qwen2.5:32b-instruct',
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
      name: 'qwen2.5:72b-instruct',
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
      name: 'qwen2.2:72b-instruct',
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
      name: 'phi3',
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
      required: true,
      type: 'text',
      placeholder: '默认 http://localhost:11434（Ollama本地API地址）',
      defaultValue: 'http://localhost:11434',
    },
  ]
};

export default manifest;
