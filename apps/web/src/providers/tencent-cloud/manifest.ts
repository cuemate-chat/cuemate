import Icon from '../../assets/llm/tencent_cloud_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'tencent-cloud',
  name: '腾讯云',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  icon_url: 'assets/llm/tencent_cloud_icon_svg',
  modelNamePlaceholder: '如 deepseek-v3.1 / deepseek-r1-0528 / deepseek-v3-0324',
  baseModels: [
    {
      name: 'deepseek-v3.1',
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
      name: 'deepseek-v3.1-terminus',
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
      name: 'deepseek-v3.2-exp',
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
      name: 'deepseek-r1-0528',
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
          value: '16000',
          default_value: '16000',
          extra: {
            min: 256,
            max: 16000,
            step: 128,
          },
        },
      ],
    },
    {
      name: 'deepseek-r1',
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
          value: '16000',
          default_value: '16000',
          extra: {
            min: 256,
            max: 16000,
            step: 128,
          },
        },
      ],
    },
    {
      name: 'deepseek-v3-0324',
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
          value: '16000',
          default_value: '16000',
          extra: {
            min: 256,
            max: 16000,
            step: 128,
          },
        },
      ],
    },
    {
      name: 'deepseek-v3',
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
          value: '16000',
          default_value: '16000',
          extra: {
            min: 256,
            max: 16000,
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
      placeholder: '默认 https://api.lkeap.cloud.tencent.com/v1（OpenAI兼容格式）',
      defaultValue: 'https://api.lkeap.cloud.tencent.com/v1',
    },
    {
      key: 'api_key',
      label: 'API Key',
      required: true,
      type: 'password',
      placeholder: '格式：sk-开头的API Key，需在知识引擎原子能力控制台获取',
    },
  ],
};

export default manifest;
