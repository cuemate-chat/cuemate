import Icon from '../../assets/llm/tencent_cloud_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'tencent-cloud',
  name: '腾讯云',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  icon_url: 'assets/llm/tencent_cloud_icon_svg',
  modelNamePlaceholder: '如 deepseek-v3 / deepseek-r1 / hunyuan-pro',
  baseModels: [
  {
    name: "deepseek-v3",
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
        label: "输出最大tokens",
        param_key: "max_tokens",
        ui_type: "slider",
        value: "4000",
        default_value: "4000",
        extra: {
          min: 100,
          max: 4000,
          step: 50
        }
      }
    ]
  },
  {
    name: "deepseek-r1",
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
        label: "输出最大tokens",
        param_key: "max_tokens",
        ui_type: "slider",
        value: "4000",
        default_value: "4000",
        extra: {
          min: 100,
          max: 4000,
          step: 50
        }
      }
    ]
  },
  {
    name: "hunyuan-pro",
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
        label: "输出最大tokens",
        param_key: "max_tokens",
        ui_type: "slider",
        value: "4000",
        default_value: "4000",
        extra: {
          min: 100,
          max: 4000,
          step: 50
        }
      }
    ]
  },
  {
    name: "hunyuan-standard",
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
        label: "输出最大tokens",
        param_key: "max_tokens",
        ui_type: "slider",
        value: "4000",
        default_value: "4000",
        extra: {
          min: 100,
          max: 4000,
          step: 50
        }
      }
    ]
  },
  {
    name: "hunyuan-lite",
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
        label: "输出最大tokens",
        param_key: "max_tokens",
        ui_type: "slider",
        value: "4000",
        default_value: "4000",
        extra: {
          min: 100,
          max: 4000,
          step: 50
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
      placeholder: '默认 https://hunyuan.tencentcloudapi.com（腾讯云混元API地址）',
      defaultValue: 'https://hunyuan.tencentcloudapi.com'
    },
    { 
      key: 'api_key', 
      label: 'API Key', 
      required: true, 
      type: 'password',
      placeholder: '格式：腾讯云API密钥，需在腾讯云控制台获取'
    },
  ]
};

export default manifest;
