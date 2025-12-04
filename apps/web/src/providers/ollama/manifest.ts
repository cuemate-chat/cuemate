import Icon from '../../assets/llm/ollama_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'ollama',
  name: 'Ollama',
  scope: 'private',
  kind: 'llm',
  icon: Icon,
  iconUrl: 'assets/llm/ollama_icon_svg',
  jumpLink: 'https://cuemate.chat/guide/models/providers/ollama.html',
  modelNamePlaceholder: '如 deepseek-r1:8b / qwen3:8b / gemma3:12b / qwen3-coder:30b',
  baseModels: [
    {
      name: 'gpt-oss:120b-cloud',
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
      name: 'gpt-oss:20b-cloud',
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
      name: 'deepseek-v3.1:671b-cloud',
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
          value: '32768',
          defaultValue: '32768',
          extra: { min: 256, max: 32768, step: 128 },
        },
      ],
    },
    {
      name: 'qwen3-coder:480b-cloud',
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
      name: 'qwen3-vl:235b-cloud',
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
      name: 'minimax-m2:cloud',
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
      name: 'glm-4.6:cloud',
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
      name: 'gpt-oss:120b',
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
      name: 'gpt-oss:20b',
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
      name: 'gemma3:27b',
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
      name: 'gemma3:12b',
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
      name: 'gemma3:4b',
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
      name: 'gemma3:1b',
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
      name: 'deepseek-r1:8b',
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
      name: 'qwen3-coder:30b',
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
      name: 'qwen3-vl:30b',
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
      name: 'qwen3-vl:8b',
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
      name: 'qwen3-vl:4b',
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
      name: 'qwen3:30b',
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
      name: 'qwen3:8b',
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
      name: 'qwen3:4b',
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
  ],
  credentialFields: [
    {
      key: 'base_url',
      label: 'API URL',
      required: true,
      type: 'text',
      placeholder: '如 https://ollama.com 或 http://localhost:11434',
      defaultValue: 'https://ollama.com',
    },
    {
      key: 'api_key',
      label: 'API Key',
      type: 'password',
      required: false,
      placeholder: '可选，部分部署需要认证',
    },
  ],
};

export default manifest;
