import Icon from '../../assets/llm/deepseek_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'deepseek',
  name: 'DeepSeek',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  icon_url: 'assets/llm/deepseek_icon_svg',
  modelNamePlaceholder: '如 deepseek-reasoner / deepseek-chat 或 deepseek-r1:32b',
  baseModels: [
  {
    name: "deepseek-chat",
    default_params: [
      {
        label: "温度",
        param_key: "temperature",
        ui_type: "slider",
        value: "0.7",
        default_value: "0.7",
        extra: {
          min: 0,
          max: 2,
          step: 0.1
        }
      },
      {
        label: "输出最大tokens",
        param_key: "max_tokens",
        ui_type: "slider",
        value: "8000",
        default_value: "8000",
        extra: {
          min: 256,
          max: 8000,
          step: 128
        }
      }
    ]
  },
  {
    name: "deepseek-reasoner",
    default_params: [
      {
        label: "温度",
        param_key: "temperature",
        ui_type: "slider",
        value: "0.7",
        default_value: "0.7",
        extra: {
          min: 0,
          max: 2,
          step: 0.1
        }
      },
      {
        label: "输出最大tokens",
        param_key: "max_tokens",
        ui_type: "slider",
        value: "64000",
        default_value: "64000",
        extra: {
          min: 256,
          max: 64000,
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
      placeholder: '默认 https://api.deepseek.com/v1（可选，代理 Base URL）',
      defaultValue: 'https://api.deepseek.com/v1'
    },
    { 
      key: 'api_key', 
      label: 'API Key', 
      required: true, 
      type: 'password',
      placeholder: '格式：sk-开头的API Key，需在DeepSeek官网获取'
    },
  ]
};

export default manifest;
