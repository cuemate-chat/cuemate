import Icon from '../../assets/llm/gemini_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'gemini',
  name: 'Gemini',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  icon_url: 'assets/llm/gemini_icon_svg',
  jump_link: 'https://cuemate.chat/guide/models/providers/gemini.html',
  modelNamePlaceholder: '如 gemini-2.0-flash-001 / gemini-1.5-pro-002 / gemini-1.5-flash-002',
  baseModels: [
  {
    name: "gemini-2.5-pro-exp-03-25",
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
        value: "65536",
        default_value: "65536",
        extra: {
          min: 256,
          max: 65536,
          step: 256
        }
      }
    ]
  },
  {
    name: "gemini-2.0-flash-001",
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
    name: "gemini-2.0-flash-exp",
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
    name: "gemini-1.5-pro-latest",
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
    name: "gemini-1.5-pro-002",
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
    name: "gemini-1.5-flash-latest",
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
    name: "gemini-1.5-flash-002",
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
    name: "gemini-1.5-flash-8b",
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
    name: "gemini-1.0-pro",
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
        value: "2048",
        default_value: "2048",
        extra: {
          min: 256,
          max: 2048,
          step: 128
        }
      }
    ]
  },
  {
    name: "gemini-1.0-pro-vision",
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
      placeholder: 'https://generativelanguage.googleapis.com/v1beta',
      defaultValue: 'https://generativelanguage.googleapis.com/v1beta'
    },
    { 
      key: 'api_key', 
      label: 'API Key', 
      required: true, 
      type: 'password',
      placeholder: '格式：AIzaSy 开头的 39 位字符的 API Key，需在 Google AI Studio 获取'
    },
  ]
};

export default manifest;
