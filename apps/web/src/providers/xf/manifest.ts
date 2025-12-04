import Icon from '../../assets/llm/xf_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'xf',
  name: '讯飞星火',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  iconUrl: 'assets/llm/xf_icon_svg',
  jumpLink: 'https://cuemate.chat/guide/models/providers/xf.html',
  modelNamePlaceholder: '如 x1 / 4.0Ultra / max-32k / generalv3.5',
  baseModels: [
    {
      name: 'x1',
      defaultParams: [
        {
          label: '温度',
          paramKey: 'temperature',
          uiType: 'slider',
          value: '0.5',
          defaultValue: '0.5',
          extra: {
            min: 0,
            max: 1,
            step: 0.1,
          },
        },
        {
          label: '输出最大 tokens',
          paramKey: 'max_tokens',
          uiType: 'slider',
          value: '32768',
          defaultValue: '32768',
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
      defaultParams: [
        {
          label: '温度',
          paramKey: 'temperature',
          uiType: 'slider',
          value: '0.5',
          defaultValue: '0.5',
          extra: {
            min: 0,
            max: 1,
            step: 0.1,
          },
        },
        {
          label: '输出最大 tokens',
          paramKey: 'max_tokens',
          uiType: 'slider',
          value: '65535',
          defaultValue: '65535',
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
      defaultParams: [
        {
          label: '温度',
          paramKey: 'temperature',
          uiType: 'slider',
          value: '0.5',
          defaultValue: '0.5',
          extra: {
            min: 0,
            max: 1,
            step: 0.1,
          },
        },
        {
          label: '输出最大 tokens',
          paramKey: 'max_tokens',
          uiType: 'slider',
          value: '32768',
          defaultValue: '32768',
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
      defaultParams: [
        {
          label: '温度',
          paramKey: 'temperature',
          uiType: 'slider',
          value: '0.5',
          defaultValue: '0.5',
          extra: {
            min: 0,
            max: 1,
            step: 0.1,
          },
        },
        {
          label: '输出最大 tokens',
          paramKey: 'max_tokens',
          uiType: 'slider',
          value: '32768',
          defaultValue: '32768',
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
      defaultParams: [
        {
          label: '温度',
          paramKey: 'temperature',
          uiType: 'slider',
          value: '0.5',
          defaultValue: '0.5',
          extra: {
            min: 0,
            max: 1,
            step: 0.1,
          },
        },
        {
          label: '输出最大 tokens',
          paramKey: 'max_tokens',
          uiType: 'slider',
          value: '8192',
          defaultValue: '8192',
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
      defaultParams: [
        {
          label: '温度',
          paramKey: 'temperature',
          uiType: 'slider',
          value: '0.5',
          defaultValue: '0.5',
          extra: {
            min: 0,
            max: 1,
            step: 0.1,
          },
        },
        {
          label: '输出最大 tokens',
          paramKey: 'max_tokens',
          uiType: 'slider',
          value: '131072',
          defaultValue: '131072',
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
      defaultParams: [
        {
          label: '温度',
          paramKey: 'temperature',
          uiType: 'slider',
          value: '0.5',
          defaultValue: '0.5',
          extra: {
            min: 0,
            max: 1,
            step: 0.1,
          },
        },
        {
          label: '输出最大 tokens',
          paramKey: 'max_tokens',
          uiType: 'slider',
          value: '8192',
          defaultValue: '8192',
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
      defaultParams: [
        {
          label: '温度',
          paramKey: 'temperature',
          uiType: 'slider',
          value: '0.5',
          defaultValue: '0.5',
          extra: {
            min: 0,
            max: 1,
            step: 0.1,
          },
        },
        {
          label: '输出最大 tokens',
          paramKey: 'max_tokens',
          uiType: 'slider',
          value: '4096',
          defaultValue: '4096',
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
