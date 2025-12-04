import Icon from '../../assets/llm/openai_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'openai',
  name: 'OpenAI',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  iconUrl: 'assets/llm/openai_icon_svg',
  jumpLink: 'https://cuemate.chat/guide/models/providers/openai.html',
  modelNamePlaceholder: '如 gpt-5, gpt-4o, gpt-3.5-turbo 等',
  baseModels: [
  {
    name: "gpt-5",
    defaultParams: [
      {
        label: "温度",
        paramKey: "temperature",
        uiType: "slider",
        value: "0.7",
        defaultValue: "0.7",
        extra: {
          min: 0,
          max: 2,
          step: 0.1
        }
      },
      {
        label: "输出最大 tokens",
        paramKey: "max_tokens",
        uiType: "slider",
        value: "16384",
        defaultValue: "16384",
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
    defaultParams: [
      {
        label: "温度",
        paramKey: "temperature",
        uiType: "slider",
        value: "0.7",
        defaultValue: "0.7",
        extra: {
          min: 0,
          max: 2,
          step: 0.1
        }
      },
      {
        label: "输出最大 tokens",
        paramKey: "max_tokens",
        uiType: "slider",
        value: "16384",
        defaultValue: "16384",
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
    defaultParams: [
      {
        label: "温度",
        paramKey: "temperature",
        uiType: "slider",
        value: "0.7",
        defaultValue: "0.7",
        extra: {
          min: 0,
          max: 2,
          step: 0.1
        }
      },
      {
        label: "输出最大 tokens",
        paramKey: "max_tokens",
        uiType: "slider",
        value: "16384",
        defaultValue: "16384",
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
    defaultParams: [
      {
        label: "温度",
        paramKey: "temperature",
        uiType: "slider",
        value: "0.7",
        defaultValue: "0.7",
        extra: {
          min: 0,
          max: 2,
          step: 0.1
        }
      },
      {
        label: "输出最大 tokens",
        paramKey: "max_tokens",
        uiType: "slider",
        value: "16384",
        defaultValue: "16384",
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
    defaultParams: [
      {
        label: "温度",
        paramKey: "temperature",
        uiType: "slider",
        value: "0.7",
        defaultValue: "0.7",
        extra: {
          min: 0,
          max: 2,
          step: 0.1
        }
      },
      {
        label: "输出最大 tokens",
        paramKey: "max_tokens",
        uiType: "slider",
        value: "16384",
        defaultValue: "16384",
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
    defaultParams: [
      {
        label: "温度",
        paramKey: "temperature",
        uiType: "slider",
        value: "0.7",
        defaultValue: "0.7",
        extra: {
          min: 0,
          max: 2,
          step: 0.1
        }
      },
      {
        label: "输出最大 tokens",
        paramKey: "max_tokens",
        uiType: "slider",
        value: "16384",
        defaultValue: "16384",
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
    defaultParams: [
      {
        label: "温度",
        paramKey: "temperature",
        uiType: "slider",
        value: "0.7",
        defaultValue: "0.7",
        extra: {
          min: 0,
          max: 2,
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
  },
  {
    name: "gpt-4",
    defaultParams: [
      {
        label: "温度",
        paramKey: "temperature",
        uiType: "slider",
        value: "0.7",
        defaultValue: "0.7",
        extra: {
          min: 0,
          max: 2,
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
    name: "gpt-3.5-turbo",
    defaultParams: [
      {
        label: "温度",
        paramKey: "temperature",
        uiType: "slider",
        value: "0.7",
        defaultValue: "0.7",
        extra: {
          min: 0,
          max: 2,
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
      placeholder: '默认 https://api.openai.com/v1（可选，代理 Base URL）',
      defaultValue: 'https://api.openai.com/v1',
    },
    { 
      key: 'api_key', 
      label: 'API Key', 
      required: true, 
      type: 'password',
      placeholder: '格式：sk-开头的 48 位字符的 API Key'
    },
  ]
};

export default manifest;
