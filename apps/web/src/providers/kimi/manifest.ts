import Icon from '../../assets/llm/kimi_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'kimi',
  name: 'Kimi',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  icon_url: 'assets/llm/kimi_icon_svg',
  modelNamePlaceholder: '如 moonshot-v1-8k / moonshot-v1-32k',
  baseModels: [
  {
    name: "moonshot-v1-128k",
    default_params: [
      {
        label: "温度",
        param_key: "temperature",
        ui_type: "slider",
        value: "0.3",
        default_value: "0.3",
        extra: {
          min: 0,
          max: 1,
          step: 0.1
        }
      },
      {
        label: "输出最大tokens",
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
    name: "moonshot-v1-32k",
    default_params: [
      {
        label: "温度",
        param_key: "temperature",
        ui_type: "slider",
        value: "0.3",
        default_value: "0.3",
        extra: {
          min: 0,
          max: 1,
          step: 0.1
        }
      },
      {
        label: "输出最大tokens",
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
    name: "moonshot-v1-8k",
    default_params: [
      {
        label: "温度",
        param_key: "temperature",
        ui_type: "slider",
        value: "0.3",
        default_value: "0.3",
        extra: {
          min: 0,
          max: 1,
          step: 0.1
        }
      },
      {
        label: "输出最大tokens",
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
      placeholder: 'https://api.moonshot.cn/v1',
      defaultValue: 'https://api.moonshot.cn/v1',
    },
    { 
      key: 'api_key', 
      label: 'API Key', 
      required: true, 
      type: 'password',
      placeholder: '格式：sk-开头的API Key，需在Kimi开放平台获取'
    },
  ]
};

export default manifest;
