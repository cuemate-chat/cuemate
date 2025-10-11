import Icon from '../../assets/llm/xf_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'iflytek',
  name: '讯飞星火',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  icon_url: 'assets/llm/xf_icon_svg',
  modelNamePlaceholder: '如 generalv3.5 / generalv3 / generalv2',
  baseModels: [
  {
    name: "generalv3.5",
    default_params: [
      {
        label: "温度",
        param_key: "temperature",
        ui_type: "slider",
        value: "0.5",
        default_value: "0.5",
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
        value: "8192",
        default_value: "8192",
        extra: {
          min: 512,
          max: 8192,
          step: 256
        }
      }
    ]
  },
  {
    name: "generalv3",
    default_params: [
      {
        label: "温度",
        param_key: "temperature",
        ui_type: "slider",
        value: "0.5",
        default_value: "0.5",
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
        value: "8192",
        default_value: "8192",
        extra: {
          min: 512,
          max: 8192,
          step: 256
        }
      }
    ]
  },
  {
    name: "generalv2",
    default_params: [
      {
        label: "温度",
        param_key: "temperature",
        ui_type: "slider",
        value: "0.5",
        default_value: "0.5",
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
        value: "8192",
        default_value: "8192",
        extra: {
          min: 512,
          max: 8192,
          step: 256
        }
      }
    ]
  },
  {
    name: "generalv1.1",
    default_params: [
      {
        label: "温度",
        param_key: "temperature",
        ui_type: "slider",
        value: "0.5",
        default_value: "0.5",
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
        value: "8192",
        default_value: "8192",
        extra: {
          min: 512,
          max: 8192,
          step: 256
        }
      }
    ]
  },
  {
    name: "4.0Ultra",
    default_params: [
      {
        label: "温度",
        param_key: "temperature",
        ui_type: "slider",
        value: "0.5",
        default_value: "0.5",
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
        value: "8192",
        default_value: "8192",
        extra: {
          min: 512,
          max: 8192,
          step: 256
        }
      }
    ]
  },
  {
    name: "Max-32K",
    default_params: [
      {
        label: "温度",
        param_key: "temperature",
        ui_type: "slider",
        value: "0.5",
        default_value: "0.5",
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
        value: "8192",
        default_value: "8192",
        extra: {
          min: 512,
          max: 8192,
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
      placeholder: '默认 https://spark-api-open.xf-yun.com/v1（讯飞星火API地址）',
      defaultValue: 'https://spark-api-open.xf-yun.com/v1'
    },
    { 
      key: 'api_key', 
      label: 'API Key', 
      required: true, 
      type: 'password',
      placeholder: '格式：讯飞星火平台的API Key，需在讯飞开放平台获取'
    },
  ]
};

export default manifest;
