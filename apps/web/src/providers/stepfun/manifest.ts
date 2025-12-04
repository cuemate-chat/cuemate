import Icon from '../../assets/llm/stepfun_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'stepfun',
  name: '阶跃星辰',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  iconUrl: 'assets/llm/stepfun_icon_svg',
  jumpLink: 'https://cuemate.chat/guide/models/providers/stepfun.html',
  modelNamePlaceholder: '如 step-2-mini, step-2-16k, step-1-8k, step-1-256k 等',
  baseModels: [
    {
      name: "step-2-mini",
      defaultParams: [
        {
          label: "温度",
          paramKey: "temperature",
          uiType: "slider",
          value: "0.7",
          defaultValue: "0.7",
          extra: {
            min: 0,
            max: 2,
            step: 0.1
          }
        },
        {
          label: "输出最大 tokens",
          paramKey: "max_tokens",
          uiType: "slider",
          value: "32768",
          defaultValue: "32768",
          extra: {
            min: 256,
            max: 32768,
            step: 128
          }
        }
      ]
    },
    {
      name: "step-2-16k",
      defaultParams: [
        {
          label: "温度",
          paramKey: "temperature",
          uiType: "slider",
          value: "0.7",
          defaultValue: "0.7",
          extra: {
            min: 0,
            max: 2,
            step: 0.1
          }
        },
        {
          label: "输出最大 tokens",
          paramKey: "max_tokens",
          uiType: "slider",
          value: "16384",
          defaultValue: "16384",
          extra: {
            min: 256,
            max: 16384,
            step: 128
          }
        }
      ]
    },
    {
      name: "step-1-8k",
      defaultParams: [
        {
          label: "温度",
          paramKey: "temperature",
          uiType: "slider",
          value: "0.7",
          defaultValue: "0.7",
          extra: {
            min: 0,
            max: 2,
            step: 0.1
          }
        },
        {
          label: "输出最大 tokens",
          paramKey: "max_tokens",
          uiType: "slider",
          value: "8192",
          defaultValue: "8192",
          extra: {
            min: 256,
            max: 8192,
            step: 128
          }
        }
      ]
    },
    {
      name: "step-1-32k",
      defaultParams: [
        {
          label: "温度",
          paramKey: "temperature",
          uiType: "slider",
          value: "0.7",
          defaultValue: "0.7",
          extra: {
            min: 0,
            max: 2,
            step: 0.1
          }
        },
        {
          label: "输出最大 tokens",
          paramKey: "max_tokens",
          uiType: "slider",
          value: "32768",
          defaultValue: "32768",
          extra: {
            min: 256,
            max: 32768,
            step: 128
          }
        }
      ]
    },
    {
      name: "step-1-256k",
      defaultParams: [
        {
          label: "温度",
          paramKey: "temperature",
          uiType: "slider",
          value: "0.7",
          defaultValue: "0.7",
          extra: {
            min: 0,
            max: 2,
            step: 0.1
          }
        },
        {
          label: "输出最大 tokens",
          paramKey: "max_tokens",
          uiType: "slider",
          value: "262144",
          defaultValue: "262144",
          extra: {
            min: 256,
            max: 262144,
            step: 256
          }
        }
      ]
    }
  ],
  credentialFields: [
    {
      key: 'base_url',
      label: 'API URL',
      type: 'text',
      placeholder: '默认 https://api.stepfun.com/v1',
      defaultValue: 'https://api.stepfun.com/v1',
    },
    {
      key: 'api_key',
      label: 'API Key',
      required: true,
      type: 'password',
      placeholder: '阶跃星辰平台 API Key'
    },
  ]
};

export default manifest;
