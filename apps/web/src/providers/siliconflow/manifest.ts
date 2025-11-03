import Icon from '../../assets/llm/siliconCloud_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'siliconflow',
  name: 'SILICONFLOW',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  icon_url: 'assets/llm/siliconCloud_icon_svg',
  modelNamePlaceholder: '如 deepseek-ai/DeepSeek-R1 / Qwen/Qwen2.5-72B-Instruct',
  baseModels: [
    {
      name: 'deepseek-ai/DeepSeek-R1',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.7',
          default_value: '0.7',
          extra: {
            min: 0,
            max: 1,
            step: 0.1,
          },
        },
        {
          label: '输出最大tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '32768',
          default_value: '32768',
          extra: {
            min: 256,
            max: 32768,
            step: 256,
          },
        },
      ],
    },
    {
      name: 'deepseek-ai/DeepSeek-V3',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.7',
          default_value: '0.7',
          extra: {
            min: 0,
            max: 1,
            step: 0.1,
          },
        },
        {
          label: '输出最大tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '32768',
          default_value: '32768',
          extra: {
            min: 256,
            max: 32768,
            step: 256,
          },
        },
      ],
    },
    {
      name: 'deepseek-ai/DeepSeek-V3.2-Exp',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.7',
          default_value: '0.7',
          extra: {
            min: 0,
            max: 1,
            step: 0.1,
          },
        },
        {
          label: '输出最大tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '64000',
          default_value: '64000',
          extra: {
            min: 256,
            max: 64000,
            step: 256,
          },
        },
      ],
    },
    {
      name: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.7',
          default_value: '0.7',
          extra: {
            min: 0,
            max: 1,
            step: 0.1,
          },
        },
        {
          label: '输出最大tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '32768',
          default_value: '32768',
          extra: {
            min: 256,
            max: 32768,
            step: 256,
          },
        },
      ],
    },
    {
      name: 'Qwen/Qwen2.5-72B-Instruct',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.7',
          default_value: '0.7',
          extra: {
            min: 0,
            max: 1,
            step: 0.1,
          },
        },
        {
          label: '输出最大tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '32768',
          default_value: '32768',
          extra: {
            min: 256,
            max: 32768,
            step: 256,
          },
        },
      ],
    },
    {
      name: 'Qwen/Qwen2.5-32B-Instruct',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.7',
          default_value: '0.7',
          extra: {
            min: 0,
            max: 1,
            step: 0.1,
          },
        },
        {
          label: '输出最大tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '32768',
          default_value: '32768',
          extra: {
            min: 256,
            max: 32768,
            step: 256,
          },
        },
      ],
    },
    {
      name: 'Qwen/Qwen2.5-7B-Instruct',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.7',
          default_value: '0.7',
          extra: {
            min: 0,
            max: 1,
            step: 0.1,
          },
        },
        {
          label: '输出最大tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '32768',
          default_value: '32768',
          extra: {
            min: 256,
            max: 32768,
            step: 256,
          },
        },
      ],
    },
    {
      name: 'Qwen/Qwen2.5-Coder-7B-Instruct',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.7',
          default_value: '0.7',
          extra: {
            min: 0,
            max: 1,
            step: 0.1,
          },
        },
        {
          label: '输出最大tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '32768',
          default_value: '32768',
          extra: {
            min: 256,
            max: 32768,
            step: 256,
          },
        },
      ],
    },
    {
      name: 'Qwen/QwQ-32B',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.7',
          default_value: '0.7',
          extra: {
            min: 0,
            max: 1,
            step: 0.1,
          },
        },
        {
          label: '输出最大tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '32768',
          default_value: '32768',
          extra: {
            min: 256,
            max: 32768,
            step: 256,
          },
        },
      ],
    },
    {
      name: 'meta-llama/Llama-3.3-70B-Instruct',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.7',
          default_value: '0.7',
          extra: {
            min: 0,
            max: 1,
            step: 0.1,
          },
        },
        {
          label: '输出最大tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '32768',
          default_value: '32768',
          extra: {
            min: 256,
            max: 32768,
            step: 256,
          },
        },
      ],
    },
    {
      name: 'THUDM/glm-4-9b-chat',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.7',
          default_value: '0.7',
          extra: {
            min: 0,
            max: 1,
            step: 0.1,
          },
        },
        {
          label: '输出最大tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '32768',
          default_value: '32768',
          extra: {
            min: 256,
            max: 32768,
            step: 256,
          },
        },
      ],
    },
    {
      name: 'internlm/internlm2_5-7b-chat',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.7',
          default_value: '0.7',
          extra: {
            min: 0,
            max: 1,
            step: 0.1,
          },
        },
        {
          label: '输出最大tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '32768',
          default_value: '32768',
          extra: {
            min: 256,
            max: 32768,
            step: 256,
          },
        },
      ],
    },
  ],
  credentialFields: [
    {
      key: 'base_url',
      label: 'API URL',
      type: 'text',
      placeholder: 'https://api.siliconflow.cn/v1',
      defaultValue: 'https://api.siliconflow.cn/v1',
    },
    {
      key: 'api_key',
      label: 'API Key',
      required: true,
      type: 'password',
      placeholder: '格式：sk-开头的API Key，需在SiliconFlow平台获取',
    },
  ],
};

export default manifest;
