import Icon from '../../assets/llm/baichuan_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'baichuan',
  name: '百川智能',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  iconUrl: 'assets/llm/baichuan_icon_svg',
  jumpLink: 'https://cuemate.chat/guide/models/providers/baichuan.html',
  modelNamePlaceholder: '如 Baichuan4, Baichuan3-Turbo, Baichuan3-Turbo-128k 等',
  baseModels: [
    {
      name: "Baichuan4",
      defaultParams: [
        {
          label: "温度",
          paramKey: "temperature",
          uiType: "slider",
          value: "0.7",
          defaultValue: "0.7",
          extra: {
            min: 0,
            max: 1,
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
      name: "Baichuan3-Turbo",
      defaultParams: [
        {
          label: "温度",
          paramKey: "temperature",
          uiType: "slider",
          value: "0.7",
          defaultValue: "0.7",
          extra: {
            min: 0,
            max: 1,
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
      name: "Baichuan3-Turbo-128k",
      defaultParams: [
        {
          label: "温度",
          paramKey: "temperature",
          uiType: "slider",
          value: "0.7",
          defaultValue: "0.7",
          extra: {
            min: 0,
            max: 1,
            step: 0.1
          }
        },
        {
          label: "输出最大 tokens",
          paramKey: "max_tokens",
          uiType: "slider",
          value: "4096",
          defaultValue: "4096",
          extra: {
            min: 256,
            max: 4096,
            step: 128
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
      placeholder: '默认 https://api.baichuan-ai.com/v1',
      defaultValue: 'https://api.baichuan-ai.com/v1',
    },
    {
      key: 'api_key',
      label: 'API Key',
      required: true,
      type: 'password',
      placeholder: '百川智能平台 API Key'
    },
  ]
};

export default manifest;
