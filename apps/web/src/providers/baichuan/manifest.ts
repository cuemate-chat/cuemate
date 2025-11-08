import Icon from '../../assets/llm/baichuan_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'baichuan',
  name: '百川智能',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  icon_url: 'assets/llm/baichuan_icon_svg',
  modelNamePlaceholder: '如 Baichuan4, Baichuan3-Turbo, Baichuan3-Turbo-128k 等',
  baseModels: [
    {
      name: "Baichuan4",
      default_params: [
        {
          label: "温度",
          param_key: "temperature",
          ui_type: "slider",
          value: "0.7",
          default_value: "0.7",
          extra: {
            min: 0,
            max: 1,
            step: 0.1
          }
        },
        {
          label: "输出最大 tokens",
          param_key: "max_tokens",
          ui_type: "slider",
          value: "8192",
          default_value: "8192",
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
      default_params: [
        {
          label: "温度",
          param_key: "temperature",
          ui_type: "slider",
          value: "0.7",
          default_value: "0.7",
          extra: {
            min: 0,
            max: 1,
            step: 0.1
          }
        },
        {
          label: "输出最大 tokens",
          param_key: "max_tokens",
          ui_type: "slider",
          value: "8192",
          default_value: "8192",
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
      default_params: [
        {
          label: "温度",
          param_key: "temperature",
          ui_type: "slider",
          value: "0.7",
          default_value: "0.7",
          extra: {
            min: 0,
            max: 1,
            step: 0.1
          }
        },
        {
          label: "输出最大 tokens",
          param_key: "max_tokens",
          ui_type: "slider",
          value: "4096",
          default_value: "4096",
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
