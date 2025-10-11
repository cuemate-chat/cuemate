import Icon from '../../assets/llm/openai_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'openai',
  name: 'OpenAI',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  icon_url: 'assets/llm/openai_icon_svg',
  modelNamePlaceholder: '如 gpt-5, gpt-4o, gpt-3.5-turbo 等',
  baseModels: [
  {
    name: "gpt-5",
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
    name: "gpt-5-mini",
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
    name: "gpt-5-nano",
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
    name: "gpt-4.1",
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
    name: "gpt-4o",
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
    name: "gpt-4o-mini",
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
    name: "gpt-4-turbo",
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
        value: "4096",
        default_value: "4096",
        extra: {
          min: 256,
          max: 4096,
          step: 128
        }
      }
    ]
  },
  {
    name: "gpt-4",
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
    name: "gpt-3.5-turbo",
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
      placeholder: '默认 https://api.openai.com/v1（可选，代理 Base URL）',
      defaultValue: 'https://api.openai.com/v1',
    },
    { 
      key: 'api_key', 
      label: 'API Key', 
      required: true, 
      type: 'password',
      placeholder: '格式：sk-开头的48位字符的API Key'
    },
  ]
};

export default manifest;
