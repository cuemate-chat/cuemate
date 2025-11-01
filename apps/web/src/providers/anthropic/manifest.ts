import Icon from '../../assets/llm/anthropic_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'anthropic',
  name: 'Anthropic',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  icon_url: 'assets/llm/anthropic_icon_svg',
  modelNamePlaceholder: '如 claude-sonnet-4-5 / claude-3-5-sonnet-20241022',
  baseModels: [
    {
      name: 'claude-sonnet-4-5',
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
      name: 'claude-haiku-4-5',
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
      name: 'claude-opus-4-1',
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
          value: '32000',
          default_value: '32000',
          extra: {
            min: 256,
            max: 32000,
            step: 256,
          },
        },
      ],
    },
    {
      name: 'claude-sonnet-4',
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
      name: 'claude-3-7-sonnet',
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
      name: 'claude-3-5-sonnet-20241022',
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
            step: 256,
          },
        },
      ],
    },
    {
      name: 'claude-3-5-sonnet-20240620',
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
            step: 256,
          },
        },
      ],
    },
    {
      name: 'claude-3-5-haiku-20241022',
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
            step: 256,
          },
        },
      ],
    },
    {
      name: 'claude-3-opus-20240229',
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
          value: '4096',
          default_value: '4096',
          extra: {
            min: 256,
            max: 4096,
            step: 256,
          },
        },
      ],
    },
    {
      name: 'claude-3-sonnet-20240229',
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
          value: '4096',
          default_value: '4096',
          extra: {
            min: 256,
            max: 4096,
            step: 256,
          },
        },
      ],
    },
    {
      name: 'claude-3-haiku-20240307',
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
          value: '4096',
          default_value: '4096',
          extra: {
            min: 256,
            max: 4096,
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
      placeholder: '默认 https://api.anthropic.com/v1（可选，代理 Base URL）',
      defaultValue: 'https://api.anthropic.com/v1',
    },
    {
      key: 'api_key',
      label: 'API Key',
      required: true,
      type: 'password',
      placeholder: '格式：sk-ant-api03-开头的API密钥',
    },
  ],
};

export default manifest;
