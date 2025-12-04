import Icon from '../../assets/llm/baidu_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'baidu',
  name: '百度千帆',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  iconUrl: 'assets/llm/baidu_icon_svg',
  jumpLink: 'https://cuemate.chat/guide/models/providers/baidu.html',
  modelNamePlaceholder: '如 ERNIE-4.5-Turbo, DeepSeek-V3, Kimi-K2-Instruct 等',
  baseModels: [
    // ERNIE 系列（百度自家模型）
    {
      name: "ERNIE-4.5-Turbo",
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
            step: 0.01
          }
        },
        {
          label: "输出最大 tokens",
          paramKey: "max_tokens",
          uiType: "slider",
          value: "8192",
          defaultValue: "8192",
          extra: {
            min: 2,
            max: 8192,
            step: 1
          }
        }
      ]
    },
    {
      name: "ERNIE-4.5",
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
            step: 0.01
          }
        },
        {
          label: "输出最大 tokens",
          paramKey: "max_tokens",
          uiType: "slider",
          value: "8192",
          defaultValue: "8192",
          extra: {
            min: 2,
            max: 8192,
            step: 1
          }
        }
      ]
    },
    {
      name: "ERNIE-Speed-AppBuilder",
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
            step: 0.01
          }
        },
        {
          label: "输出最大 tokens",
          paramKey: "max_tokens",
          uiType: "slider",
          value: "4096",
          defaultValue: "4096",
          extra: {
            min: 2,
            max: 4096,
            step: 1
          }
        }
      ]
    },
    // DeepSeek 系列（深度求索）
    {
      name: "DeepSeek-V3",
      defaultParams: [
        {
          label: "温度",
          paramKey: "temperature",
          uiType: "slider",
          value: "1",
          defaultValue: "1",
          extra: {
            min: 0,
            max: 2,
            step: 0.01
          }
        },
        {
          label: "输出最大 tokens",
          paramKey: "max_tokens",
          uiType: "slider",
          value: "8192",
          defaultValue: "8192",
          extra: {
            min: 1,
            max: 8192,
            step: 1
          }
        }
      ]
    },
    {
      name: "DeepSeek-V3.2",
      defaultParams: [
        {
          label: "温度",
          paramKey: "temperature",
          uiType: "slider",
          value: "1",
          defaultValue: "1",
          extra: {
            min: 0,
            max: 2,
            step: 0.01
          }
        },
        {
          label: "输出最大 tokens",
          paramKey: "max_tokens",
          uiType: "slider",
          value: "8192",
          defaultValue: "8192",
          extra: {
            min: 1,
            max: 8192,
            step: 1
          }
        }
      ]
    },
    {
      name: "DeepSeek-V3.2-Think",
      defaultParams: [
        {
          label: "温度",
          paramKey: "temperature",
          uiType: "slider",
          value: "1",
          defaultValue: "1",
          extra: {
            min: 0,
            max: 2,
            step: 0.01
          }
        },
        {
          label: "输出最大 tokens",
          paramKey: "max_tokens",
          uiType: "slider",
          value: "8000",
          defaultValue: "8000",
          extra: {
            min: 1,
            max: 8000,
            step: 1
          }
        }
      ]
    },
    {
      name: "DeepSeek-V3.1-Think",
      defaultParams: [
        {
          label: "温度",
          paramKey: "temperature",
          uiType: "slider",
          value: "1",
          defaultValue: "1",
          extra: {
            min: 0,
            max: 2,
            step: 0.01
          }
        },
        {
          label: "输出最大 tokens",
          paramKey: "max_tokens",
          uiType: "slider",
          value: "8000",
          defaultValue: "8000",
          extra: {
            min: 1,
            max: 8000,
            step: 1
          }
        }
      ]
    },
    // Kimi 系列（月之暗面）
    {
      name: "Kimi-K2-Instruct",
      defaultParams: [
        {
          label: "温度",
          paramKey: "temperature",
          uiType: "slider",
          value: "0.3",
          defaultValue: "0.3",
          extra: {
            min: 0,
            max: 1,
            step: 0.01
          }
        },
        {
          label: "输出最大 tokens",
          paramKey: "max_tokens",
          uiType: "slider",
          value: "4096",
          defaultValue: "4096",
          extra: {
            min: 1,
            max: 4096,
            step: 1
          }
        }
      ]
    },
    // Llama 系列（Meta）
    {
      name: "Llama-3.3-70B-Instruct",
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
            step: 0.01
          }
        },
        {
          label: "输出最大 tokens",
          paramKey: "max_tokens",
          uiType: "slider",
          value: "4096",
          defaultValue: "4096",
          extra: {
            min: 1,
            max: 4096,
            step: 1
          }
        }
      ]
    },
    {
      name: "Llama-3.1-405B-Instruct",
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
            step: 0.01
          }
        },
        {
          label: "输出最大 tokens",
          paramKey: "max_tokens",
          uiType: "slider",
          value: "4096",
          defaultValue: "4096",
          extra: {
            min: 1,
            max: 4096,
            step: 1
          }
        }
      ]
    },
    // Qwen 系列（通义实验室/阿里）
    {
      name: "Qwen2.5-72B-Instruct",
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
            step: 0.01
          }
        },
        {
          label: "输出最大 tokens",
          paramKey: "max_tokens",
          uiType: "slider",
          value: "6144",
          defaultValue: "6144",
          extra: {
            min: 1,
            max: 6144,
            step: 1
          }
        }
      ]
    },
    {
      name: "Qwen2.5-7B-Instruct",
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
            step: 0.01
          }
        },
        {
          label: "输出最大 tokens",
          paramKey: "max_tokens",
          uiType: "slider",
          value: "6144",
          defaultValue: "6144",
          extra: {
            min: 1,
            max: 6144,
            step: 1
          }
        }
      ]
    },
    // GLM 系列（智谱 AI）
    {
      name: "GLM-4-Plus",
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
            step: 0.01
          }
        },
        {
          label: "输出最大 tokens",
          paramKey: "max_tokens",
          uiType: "slider",
          value: "4095",
          defaultValue: "4095",
          extra: {
            min: 1,
            max: 4095,
            step: 1
          }
        }
      ]
    },
    {
      name: "GLM-4-Flash",
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
            step: 0.01
          }
        },
        {
          label: "输出最大 tokens",
          paramKey: "max_tokens",
          uiType: "slider",
          value: "4095",
          defaultValue: "4095",
          extra: {
            min: 1,
            max: 4095,
            step: 1
          }
        }
      ]
    },
    // Yi 系列（零一万物）
    {
      name: "Yi-Lightning",
      defaultParams: [
        {
          label: "温度",
          paramKey: "temperature",
          uiType: "slider",
          value: "0.3",
          defaultValue: "0.3",
          extra: {
            min: 0,
            max: 1.5,
            step: 0.01
          }
        },
        {
          label: "输出最大 tokens",
          paramKey: "max_tokens",
          uiType: "slider",
          value: "4096",
          defaultValue: "4096",
          extra: {
            min: 1,
            max: 4096,
            step: 1
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
      placeholder: '默认 https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat',
      defaultValue: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat',
    },
    {
      key: 'api_key',
      label: 'API Key',
      required: true,
      type: 'password',
      placeholder: '百度智能云千帆平台 API Key'
    },
  ]
};

export default manifest;
