import Icon from '../../assets/llm/deepseek_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'deepseek',
  name: 'DeepSeek',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  iconUrl: 'assets/llm/deepseek_icon_svg',
  jumpLink: 'https://cuemate.chat/guide/models/providers/deepseek.html',
  modelNamePlaceholder: '如 deepseek-reasoner / deepseek-chat',
  baseModels: [
    {
      name: 'deepseek-chat',
      defaultParams: [
        {
          label: '温度',
          paramKey: 'temperature',
          uiType: 'slider',
          value: '0.7',
          defaultValue: '0.7',
          extra: {
            min: 0,
            max: 2,
            step: 0.1,
          },
        },
        {
          label: '输出最大 tokens',
          paramKey: 'max_tokens',
          uiType: 'slider',
          value: '8000',
          defaultValue: '8000',
          extra: {
            min: 256,
            max: 8000,
            step: 128,
          },
        },
      ],
    },
    {
      name: 'deepseek-reasoner',
      defaultParams: [
        {
          label: '温度',
          paramKey: 'temperature',
          uiType: 'slider',
          value: '0.7',
          defaultValue: '0.7',
          extra: {
            min: 0,
            max: 2,
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
            min: 256,
            max: 64000,
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
      placeholder: '默认 https://api.deepseek.com/v1（可选，代理 Base URL）',
      defaultValue: 'https://api.deepseek.com/v1',
    },
    {
      key: 'api_key',
      label: 'API Key',
      required: true,
      type: 'password',
      placeholder: '格式：sk-开头的 API Key，需在 DeepSeek 官网获取',
    },
  ],
};

export default manifest;
