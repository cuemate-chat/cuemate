import Icon from '../../assets/llm/volcanic_engine_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'volcengine',
  name: '火山引擎',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  iconUrl: 'assets/llm/volcanic_engine_icon_svg',
  jumpLink: 'https://cuemate.chat/guide/models/providers/volcengine.html',
  modelNamePlaceholder:
    '在控制台开通后填写完整模型名称（如 doubao-seed-1-6-251015）或接入点 ID（ep-xxx）',
  baseModels: [
    {
      name: 'doubao-seed-1-6-251015',
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
            step: 100,
          },
        },
      ],
    },
    {
      name: 'doubao-seed-1-6-thinking-250715',
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
            step: 100,
          },
        },
      ],
    },
    {
      name: 'doubao-seed-1-6-flash-250828',
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
            step: 100,
          },
        },
      ],
    },
    {
      name: 'doubao-seed-1-6-vision-250815',
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
            step: 100,
          },
        },
      ],
    },
    {
      name: 'deepseek-v3-1-terminus',
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
          value: '8000',
          defaultValue: '8000',
          extra: {
            min: 100,
            max: 8000,
            step: 100,
          },
        },
      ],
    },
    {
      name: 'doubao-1-5-thinking-pro-250415',
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
            step: 100,
          },
        },
      ],
    },
    {
      name: 'doubao-1-5-vision-pro-250328',
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
            step: 100,
          },
        },
      ],
    },
    {
      name: 'doubao-1-5-ui-tars-250428',
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
            step: 100,
          },
        },
      ],
    },
    {
      name: 'deepseek-r1-250528',
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
          value: '8000',
          defaultValue: '8000',
          extra: {
            min: 100,
            max: 8000,
            step: 100,
          },
        },
      ],
    },
    {
      name: 'deepseek-v3-250324',
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
          value: '8000',
          defaultValue: '8000',
          extra: {
            min: 100,
            max: 8000,
            step: 100,
          },
        },
      ],
    },
    {
      name: 'doubao-1-5-pro-32k-250115',
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
      name: 'doubao-1-5-pro-256k-250115',
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
      name: 'doubao-1-5-lite-32k-250115',
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
      name: 'kimi-k2-250905',
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
  ],
  credentialFields: [
    {
      key: 'base_url',
      label: 'API URL',
      type: 'text',
      placeholder: '默认 https://ark.cn-beijing.volces.com/api/v3（可选，代理 Base URL）',
      defaultValue: 'https://ark.cn-beijing.volces.com/api/v3',
    },
    {
      key: 'api_key',
      label: 'API Key',
      required: true,
      type: 'password',
      placeholder: '格式：UUID 格式的 API Key，需在火山引擎控制台获取',
    },
  ],
};

export default manifest;
