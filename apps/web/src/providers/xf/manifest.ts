import Icon from '../../assets/llm/xf_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'xf',
  name: '讯飞星火',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  icon_url: 'assets/llm/xf_icon_svg',
  jump_link: 'https://cuemate.chat/guide/models/providers/xf.html',
  modelNamePlaceholder: '如 x1 / 4.0Ultra / max-32k / generalv3.5',
  baseModels: [
    {
      name: 'x1',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.5',
          default_value: '0.5',
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
          value: '32768',
          default_value: '32768',
          extra: {
            min: 512,
            max: 32768,
            step: 256,
          },
        },
      ],
    },
    {
      name: 'X1-Preview',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.5',
          default_value: '0.5',
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
          value: '65535',
          default_value: '65535',
          extra: {
            min: 512,
            max: 65535,
            step: 512,
          },
        },
      ],
    },
    {
      name: '4.0Ultra',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.5',
          default_value: '0.5',
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
          value: '32768',
          default_value: '32768',
          extra: {
            min: 512,
            max: 32768,
            step: 256,
          },
        },
      ],
    },
    {
      name: 'max-32k',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.5',
          default_value: '0.5',
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
          value: '32768',
          default_value: '32768',
          extra: {
            min: 512,
            max: 32768,
            step: 256,
          },
        },
      ],
    },
    {
      name: 'generalv3.5',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.5',
          default_value: '0.5',
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
          value: '8192',
          default_value: '8192',
          extra: {
            min: 512,
            max: 8192,
            step: 256,
          },
        },
      ],
    },
    {
      name: 'pro-128k',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.5',
          default_value: '0.5',
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
          value: '131072',
          default_value: '131072',
          extra: {
            min: 512,
            max: 131072,
            step: 512,
          },
        },
      ],
    },
    {
      name: 'generalv3',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.5',
          default_value: '0.5',
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
          value: '8192',
          default_value: '8192',
          extra: {
            min: 512,
            max: 8192,
            step: 256,
          },
        },
      ],
    },
    {
      name: 'lite',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.5',
          default_value: '0.5',
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
            min: 512,
            max: 4096,
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
      placeholder: 'X1 系列用 https://spark-api-open.xf-yun.com/v2，其他模型用 /v1',
      defaultValue: 'https://spark-api-open.xf-yun.com/v1',
    },
    {
      key: 'api_key',
      label: 'API Key',
      required: true,
      type: 'password',
      placeholder: '推荐使用 APIPassword（控制台 http 接口认证信息），或使用 APIKey:APISecret 格式',
    },
  ],
};

export default manifest;
