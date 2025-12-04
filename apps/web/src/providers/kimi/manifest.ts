import Icon from '../../assets/llm/kimi_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'kimi',
  name: 'Kimi',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  iconUrl: 'assets/llm/kimi_icon_svg',
  jumpLink: 'https://cuemate.chat/guide/models/providers/kimi.html',
  modelNamePlaceholder: '如 moonshot-v1-128k / moonshot-v1-32k / moonshot-v1-8k',
  baseModels: [
    {
      name: 'moonshot-v1-128k',
      defaultParams: [
        {
          label: '温度',
          paramKey: 'temperature',
          uiType: 'slider',
          value: '0.3',
          defaultValue: '0.3',
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
            min: 256,
            max: 65536,
            step: 256,
          },
        },
      ],
    },
    {
      name: 'moonshot-v1-32k',
      defaultParams: [
        {
          label: '温度',
          paramKey: 'temperature',
          uiType: 'slider',
          value: '0.3',
          defaultValue: '0.3',
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
          value: '16384',
          defaultValue: '16384',
          extra: {
            min: 256,
            max: 16384,
            step: 128,
          },
        },
      ],
    },
    {
      name: 'moonshot-v1-8k',
      defaultParams: [
        {
          label: '温度',
          paramKey: 'temperature',
          uiType: 'slider',
          value: '0.3',
          defaultValue: '0.3',
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
            min: 256,
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
      placeholder: '默认 https://api.moonshot.cn/v1（可选，代理 Base URL）',
      defaultValue: 'https://api.moonshot.cn/v1',
    },
    {
      key: 'api_key',
      label: 'API Key',
      required: true,
      type: 'password',
      placeholder: '格式：sk-开头的 API Key，需在 Kimi 开放平台获取',
    },
  ],
};

export default manifest;
