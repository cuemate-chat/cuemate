import Icon from '../../assets/llm/sensenova_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'sensenova',
  name: '商汤日日新',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  icon_url: 'assets/llm/sensenova_icon_svg',
  modelNamePlaceholder: '如 SenseNova-V6.5-Pro, SenseNova-V6.5-Turbo 等',
  baseModels: [
    {
      name: "SenseNova-V6.5-Pro",
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
          value: "16384",
          default_value: "16384",
          extra: {
            min: 256,
            max: 16384,
            step: 128
          }
        }
      ]
    },
    {
      name: "SenseNova-V6.5-Turbo",
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
          value: "16384",
          default_value: "16384",
          extra: {
            min: 256,
            max: 16384,
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
      placeholder: '默认 https://api.sensenova.cn/v1',
      defaultValue: 'https://api.sensenova.cn/v1',
    },
    {
      key: 'api_key',
      label: 'API Key',
      required: true,
      type: 'password',
      placeholder: '商汤日日新平台 API Key'
    },
  ]
};

export default manifest;
