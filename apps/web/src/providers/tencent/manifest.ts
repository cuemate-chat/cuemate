import Icon from '../../assets/llm/tencent_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'tencent',
  name: '腾讯混元',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  icon_url: 'assets/llm/tencent_icon_svg',
  modelNamePlaceholder: '如 hunyuan-pro / hunyuan-standard',
  baseModels: [
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
        value: "4096",
        default_value: "4096",
        extra: {
          min: 100,
          max: 4096,
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
        value: "4096",
        default_value: "4096",
        extra: {
          min: 100,
          max: 4096,
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
        value: "6000",
        default_value: "6000",
        extra: {
          min: 100,
          max: 6000,
          step: 50
        }
      }
    ]
  },
  {
    name: "hunyuan-role",
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
        value: "4096",
        default_value: "4096",
        extra: {
          min: 100,
          max: 4096,
          step: 50
        }
      }
    ]
  },
  {
    name: "hunyuan-functioncall",
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
        value: "4096",
        default_value: "4096",
        extra: {
          min: 100,
          max: 4096,
          step: 50
        }
      }
    ]
  },
  {
    name: "hunyuan-code",
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
        value: "4096",
        default_value: "4096",
        extra: {
          min: 100,
          max: 4096,
          step: 50
        }
      }
    ]
  }
],
  credentialFields: [
    { 
      key: 'app_id', 
      label: 'APP ID', 
      required: true, 
      type: 'text',
      placeholder: '格式：10位数字的应用ID，需在腾讯云控制台获取'
    },
    { 
      key: 'secret_id', 
      label: 'SecretId', 
      required: true, 
      type: 'password',
      placeholder: '格式：AKID开头的36位字符，需在腾讯云控制台获取'
    },
    { 
      key: 'secret_key', 
      label: 'SecretKey', 
      required: true, 
      type: 'password',
      placeholder: '格式：32位字符的密钥，需在腾讯云控制台获取'
    },
  ]
};

export default manifest;
