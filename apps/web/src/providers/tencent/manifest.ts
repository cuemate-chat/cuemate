import Icon from '../../assets/llm/tencent_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'tencent',
  name: '腾讯混元',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  icon_url: 'assets/llm/tencent_icon_svg',
  modelNamePlaceholder: '如 hunyuan-turbos-latest / hunyuan-t1-latest / hunyuan-lite',
  baseModels: [
    {
      name: 'hunyuan-t1-latest',
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
          label: '输出最大 tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '64000',
          default_value: '64000',
          extra: {
            min: 100,
            max: 64000,
            step: 256,
          },
        },
      ],
    },
    {
      name: 'hunyuan-turbos-latest',
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
          label: '输出最大 tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '16000',
          default_value: '16000',
          extra: {
            min: 100,
            max: 16000,
            step: 128,
          },
        },
      ],
    },
    {
      name: 'hunyuan-a13b',
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
          label: '输出最大 tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '32000',
          default_value: '32000',
          extra: {
            min: 100,
            max: 32000,
            step: 256,
          },
        },
      ],
    },
    {
      name: 'hunyuan-standard-256K',
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
          label: '输出最大 tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '6000',
          default_value: '6000',
          extra: {
            min: 100,
            max: 6000,
            step: 50,
          },
        },
      ],
    },
    {
      name: 'hunyuan-standard',
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
          label: '输出最大 tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '2000',
          default_value: '2000',
          extra: {
            min: 100,
            max: 2000,
            step: 50,
          },
        },
      ],
    },
    {
      name: 'hunyuan-large',
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
          label: '输出最大 tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '4000',
          default_value: '4000',
          extra: {
            min: 100,
            max: 4000,
            step: 50,
          },
        },
      ],
    },
    {
      name: 'hunyuan-lite',
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
          label: '输出最大 tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '6000',
          default_value: '6000',
          extra: {
            min: 100,
            max: 6000,
            step: 50,
          },
        },
      ],
    },
    {
      name: 'hunyuan-functioncall',
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
          label: '输出最大 tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '4096',
          default_value: '4096',
          extra: {
            min: 100,
            max: 4096,
            step: 50,
          },
        },
      ],
    },
    {
      name: 'hunyuan-code',
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
          label: '输出最大 tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '4096',
          default_value: '4096',
          extra: {
            min: 100,
            max: 4096,
            step: 50,
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
      placeholder: '默认 https://api.hunyuan.cloud.tencent.com/v1（可选，代理 Base URL）',
      defaultValue: 'https://api.hunyuan.cloud.tencent.com/v1',
    },
    {
      key: 'api_key',
      label: 'API Key',
      required: true,
      type: 'password',
      placeholder: '格式：sk-开头的 API Key，需在腾讯混元控制台获取',
    },
  ],
};

export default manifest;
