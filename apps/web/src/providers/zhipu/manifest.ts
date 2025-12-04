import Icon from '../../assets/llm/zhipuai_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'zhipu',
  name: '智谱 AI',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  iconUrl: 'assets/llm/zhipuai_icon_svg',
  jumpLink: 'https://cuemate.chat/guide/models/providers/zhipu.html',
  modelNamePlaceholder: '如 glm-4 / glm-4v / glm-3-turbo',
  baseModels: [
  {
    name: "glm-4-plus",
    defaultParams: [
      {
        label: "温度",
        paramKey: "temperature",
        uiType: "slider",
        value: "0.95",
        defaultValue: "0.95",
        extra: {
          min: 0,
          max: 1,
          step: 0.05
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
    name: "glm-4-long",
    defaultParams: [
      {
        label: "温度",
        paramKey: "temperature",
        uiType: "slider",
        value: "0.95",
        defaultValue: "0.95",
        extra: {
          min: 0,
          max: 1,
          step: 0.05
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
    name: "glm-4-air",
    defaultParams: [
      {
        label: "温度",
        paramKey: "temperature",
        uiType: "slider",
        value: "0.95",
        defaultValue: "0.95",
        extra: {
          min: 0,
          max: 1,
          step: 0.05
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
    name: "glm-4-airx",
    defaultParams: [
      {
        label: "温度",
        paramKey: "temperature",
        uiType: "slider",
        value: "0.95",
        defaultValue: "0.95",
        extra: {
          min: 0,
          max: 1,
          step: 0.05
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
    name: "glm-4-flash",
    defaultParams: [
      {
        label: "温度",
        paramKey: "temperature",
        uiType: "slider",
        value: "0.95",
        defaultValue: "0.95",
        extra: {
          min: 0,
          max: 1,
          step: 0.05
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
    name: "glm-4",
    defaultParams: [
      {
        label: "温度",
        paramKey: "temperature",
        uiType: "slider",
        value: "0.95",
        defaultValue: "0.95",
        extra: {
          min: 0,
          max: 1,
          step: 0.05
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
    name: "glm-4v",
    defaultParams: [
      {
        label: "温度",
        paramKey: "temperature",
        uiType: "slider",
        value: "0.95",
        defaultValue: "0.95",
        extra: {
          min: 0,
          max: 1,
          step: 0.05
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
    name: "glm-4v-plus",
    defaultParams: [
      {
        label: "温度",
        paramKey: "temperature",
        uiType: "slider",
        value: "0.95",
        defaultValue: "0.95",
        extra: {
          min: 0,
          max: 1,
          step: 0.05
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
    name: "glm-3-turbo",
    defaultParams: [
      {
        label: "温度",
        paramKey: "temperature",
        uiType: "slider",
        value: "0.95",
        defaultValue: "0.95",
        extra: {
          min: 0,
          max: 1,
          step: 0.05
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
      placeholder: 'https://open.bigmodel.cn/api/paas/v4',
      defaultValue: 'https://open.bigmodel.cn/api/paas/v4',
    },
    { 
      key: 'api_key', 
      label: 'API Key', 
      required: true, 
      type: 'password',
      placeholder: '格式：32 位字符.字符串，需在智谱 AI 开放平台获取'
    },
  ]
};

export default manifest;
