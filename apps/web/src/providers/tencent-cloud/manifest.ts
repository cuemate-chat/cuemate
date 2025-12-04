import Icon from '../../assets/llm/tencent_cloud_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'tencent-cloud',
  name: '腾讯云',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  iconUrl: 'assets/llm/tencent_cloud_icon_svg',
  jumpLink: 'https://cuemate.chat/guide/models/providers/tencent-cloud.html',
  modelNamePlaceholder: '如 deepseek-v3.1 / deepseek-r1-0528 / deepseek-v3-0324',
  baseModels: [
    {
      name: 'deepseek-v3.1',
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
            min: 256,
            max: 32000,
            step: 256,
          },
        },
      ],
    },
    {
      name: 'deepseek-v3.1-terminus',
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
            min: 256,
            max: 32000,
            step: 256,
          },
        },
      ],
    },
    {
      name: 'deepseek-v3.2-exp',
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
            min: 256,
            max: 64000,
            step: 256,
          },
        },
      ],
    },
    {
      name: 'deepseek-r1-0528',
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
            min: 256,
            max: 16000,
            step: 128,
          },
        },
      ],
    },
    {
      name: 'deepseek-r1',
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
            min: 256,
            max: 16000,
            step: 128,
          },
        },
      ],
    },
    {
      name: 'deepseek-v3-0324',
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
            min: 256,
            max: 16000,
            step: 128,
          },
        },
      ],
    },
    {
      name: 'deepseek-v3',
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
      placeholder: '默认 https://api.lkeap.cloud.tencent.com/v1（OpenAI 兼容格式）',
      defaultValue: 'https://api.lkeap.cloud.tencent.com/v1',
    },
    {
      key: 'api_key',
      label: 'API Key',
      required: true,
      type: 'password',
      placeholder: '格式：sk-开头的 API Key，需在知识引擎原子能力控制台获取',
    },
  ],
};

export default manifest;
