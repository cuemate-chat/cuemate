import Icon from '../../assets/llm/aliyun_bai_lian_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'aliyun-bailian',
  name: '阿里云百炼',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  icon_url: 'assets/llm/aliyun_bai_lian_icon_svg',
  modelNamePlaceholder: '如 qwen3-max / qwen-plus / qwen-flash',
  baseModels: [
    {
      name: 'qwen3-max',
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
          value: '65536',
          default_value: '65536',
          extra: {
            min: 256,
            max: 65536,
            step: 256,
          },
        },
      ],
    },
    {
      name: 'qwen-plus',
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
      name: 'qwen-flash',
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
          value: '16384',
          default_value: '16384',
          extra: {
            min: 256,
            max: 16384,
            step: 256,
          },
        },
      ],
    },
    {
      name: 'qwen-max',
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
          value: '8192',
          default_value: '8192',
          extra: {
            min: 256,
            max: 8192,
            step: 128,
          },
        },
      ],
    },
    {
      name: 'qwen-turbo',
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
          value: '8192',
          default_value: '8192',
          extra: {
            min: 256,
            max: 8192,
            step: 128,
          },
        },
      ],
    },
    {
      name: 'qwen3-235b-a22b',
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
          value: '8192',
          default_value: '8192',
          extra: {
            min: 256,
            max: 8192,
            step: 128,
          },
        },
      ],
    },
    {
      name: 'qwen3-32b',
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
          value: '8192',
          default_value: '8192',
          extra: {
            min: 256,
            max: 8192,
            step: 128,
          },
        },
      ],
    },
    {
      name: 'qwen3-30b-a3b',
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
          value: '8192',
          default_value: '8192',
          extra: {
            min: 256,
            max: 8192,
            step: 128,
          },
        },
      ],
    },
    {
      name: 'qwen3-14b',
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
          value: '8192',
          default_value: '8192',
          extra: {
            min: 256,
            max: 8192,
            step: 128,
          },
        },
      ],
    },
    {
      name: 'qwen3-8b',
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
          value: '8192',
          default_value: '8192',
          extra: {
            min: 256,
            max: 8192,
            step: 128,
          },
        },
      ],
    },
    {
      name: 'qwen3-4b',
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
          value: '8192',
          default_value: '8192',
          extra: {
            min: 256,
            max: 8192,
            step: 128,
          },
        },
      ],
    },
    {
      name: 'qwen3-1.7b',
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
          value: '8192',
          default_value: '8192',
          extra: {
            min: 256,
            max: 8192,
            step: 128,
          },
        },
      ],
    },
    {
      name: 'qwen3-0.6b',
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
          value: '8192',
          default_value: '8192',
          extra: {
            min: 256,
            max: 8192,
            step: 128,
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
      placeholder: '默认 https://dashscope.aliyuncs.com/compatible-mode/v1（可选，代理 Base URL）',
      defaultValue: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    },
    {
      key: 'api_key',
      label: 'API Key',
      required: true,
      type: 'password',
      placeholder: '格式：sk-开头的32位字符，需在阿里云百炼平台获取',
    },
  ],
};

export default manifest;
