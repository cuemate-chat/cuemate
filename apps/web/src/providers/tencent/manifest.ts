import Icon from '../../assets/llm/tencent_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'tencent',
  name: '腾讯混元',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  iconUrl: 'assets/llm/tencent_icon_svg',
  jumpLink: 'https://cuemate.chat/guide/models/providers/tencent.html',
  modelNamePlaceholder: '如 hunyuan-turbos-latest / hunyuan-t1-latest / hunyuan-lite',
  baseModels: [
    {
      name: 'hunyuan-t1-latest',
      defaultParams: [
        {
          label: '温度',
          paramKey: 'temperature',
          uiType: 'slider',
          value: '0.7',
          defaultValue: '0.7',
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
          value: '64000',
          defaultValue: '64000',
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
      defaultParams: [
        {
          label: '温度',
          paramKey: 'temperature',
          uiType: 'slider',
          value: '0.7',
          defaultValue: '0.7',
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
          value: '16000',
          defaultValue: '16000',
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
      defaultParams: [
        {
          label: '温度',
          paramKey: 'temperature',
          uiType: 'slider',
          value: '0.7',
          defaultValue: '0.7',
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
          value: '32000',
          defaultValue: '32000',
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
      defaultParams: [
        {
          label: '温度',
          paramKey: 'temperature',
          uiType: 'slider',
          value: '0.7',
          defaultValue: '0.7',
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
          value: '6000',
          defaultValue: '6000',
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
      defaultParams: [
        {
          label: '温度',
          paramKey: 'temperature',
          uiType: 'slider',
          value: '0.7',
          defaultValue: '0.7',
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
          value: '2000',
          defaultValue: '2000',
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
      defaultParams: [
        {
          label: '温度',
          paramKey: 'temperature',
          uiType: 'slider',
          value: '0.7',
          defaultValue: '0.7',
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
          value: '4000',
          defaultValue: '4000',
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
      defaultParams: [
        {
          label: '温度',
          paramKey: 'temperature',
          uiType: 'slider',
          value: '0.7',
          defaultValue: '0.7',
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
          value: '6000',
          defaultValue: '6000',
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
      defaultParams: [
        {
          label: '温度',
          paramKey: 'temperature',
          uiType: 'slider',
          value: '0.7',
          defaultValue: '0.7',
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
            min: 100,
            max: 4096,
            step: 50,
          },
        },
      ],
    },
    {
      name: 'hunyuan-code',
      defaultParams: [
        {
          label: '温度',
          paramKey: 'temperature',
          uiType: 'slider',
          value: '0.7',
          defaultValue: '0.7',
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
