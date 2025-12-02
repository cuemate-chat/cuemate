import Icon from '../../assets/llm/baidu_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'baidu',
  name: '百度千帆',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  icon_url: 'assets/llm/baidu_icon_svg',
  jump_link: 'https://cuemate.chat/guide/models/providers/baidu.html',
  modelNamePlaceholder: '如 ERNIE-4.5-Turbo, DeepSeek-V3, Kimi-K2-Instruct 等',
  baseModels: [
    // ERNIE 系列（百度自家模型）
    {
      name: "ERNIE-4.5-Turbo",
      default_params: [
        {
          label: "温度",
          param_key: "temperature",
          ui_type: "slider",
          value: "0.95",
          default_value: "0.95",
          extra: {
            min: 0,
            max: 1,
            step: 0.01
          }
        },
        {
          label: "输出最大 tokens",
          param_key: "max_tokens",
          ui_type: "slider",
          value: "8192",
          default_value: "8192",
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
      default_params: [
        {
          label: "温度",
          param_key: "temperature",
          ui_type: "slider",
          value: "0.95",
          default_value: "0.95",
          extra: {
            min: 0,
            max: 1,
            step: 0.01
          }
        },
        {
          label: "输出最大 tokens",
          param_key: "max_tokens",
          ui_type: "slider",
          value: "8192",
          default_value: "8192",
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
      default_params: [
        {
          label: "温度",
          param_key: "temperature",
          ui_type: "slider",
          value: "0.95",
          default_value: "0.95",
          extra: {
            min: 0,
            max: 1,
            step: 0.01
          }
        },
        {
          label: "输出最大 tokens",
          param_key: "max_tokens",
          ui_type: "slider",
          value: "4096",
          default_value: "4096",
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
      default_params: [
        {
          label: "温度",
          param_key: "temperature",
          ui_type: "slider",
          value: "1",
          default_value: "1",
          extra: {
            min: 0,
            max: 2,
            step: 0.01
          }
        },
        {
          label: "输出最大 tokens",
          param_key: "max_tokens",
          ui_type: "slider",
          value: "8192",
          default_value: "8192",
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
      default_params: [
        {
          label: "温度",
          param_key: "temperature",
          ui_type: "slider",
          value: "1",
          default_value: "1",
          extra: {
            min: 0,
            max: 2,
            step: 0.01
          }
        },
        {
          label: "输出最大 tokens",
          param_key: "max_tokens",
          ui_type: "slider",
          value: "8192",
          default_value: "8192",
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
      default_params: [
        {
          label: "温度",
          param_key: "temperature",
          ui_type: "slider",
          value: "1",
          default_value: "1",
          extra: {
            min: 0,
            max: 2,
            step: 0.01
          }
        },
        {
          label: "输出最大 tokens",
          param_key: "max_tokens",
          ui_type: "slider",
          value: "8000",
          default_value: "8000",
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
      default_params: [
        {
          label: "温度",
          param_key: "temperature",
          ui_type: "slider",
          value: "1",
          default_value: "1",
          extra: {
            min: 0,
            max: 2,
            step: 0.01
          }
        },
        {
          label: "输出最大 tokens",
          param_key: "max_tokens",
          ui_type: "slider",
          value: "8000",
          default_value: "8000",
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
            step: 0.01
          }
        },
        {
          label: "输出最大 tokens",
          param_key: "max_tokens",
          ui_type: "slider",
          value: "4096",
          default_value: "4096",
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
            step: 0.01
          }
        },
        {
          label: "输出最大 tokens",
          param_key: "max_tokens",
          ui_type: "slider",
          value: "4096",
          default_value: "4096",
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
            step: 0.01
          }
        },
        {
          label: "输出最大 tokens",
          param_key: "max_tokens",
          ui_type: "slider",
          value: "4096",
          default_value: "4096",
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
            step: 0.01
          }
        },
        {
          label: "输出最大 tokens",
          param_key: "max_tokens",
          ui_type: "slider",
          value: "6144",
          default_value: "6144",
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
            step: 0.01
          }
        },
        {
          label: "输出最大 tokens",
          param_key: "max_tokens",
          ui_type: "slider",
          value: "6144",
          default_value: "6144",
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
      default_params: [
        {
          label: "温度",
          param_key: "temperature",
          ui_type: "slider",
          value: "0.95",
          default_value: "0.95",
          extra: {
            min: 0,
            max: 1,
            step: 0.01
          }
        },
        {
          label: "输出最大 tokens",
          param_key: "max_tokens",
          ui_type: "slider",
          value: "4095",
          default_value: "4095",
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
      default_params: [
        {
          label: "温度",
          param_key: "temperature",
          ui_type: "slider",
          value: "0.95",
          default_value: "0.95",
          extra: {
            min: 0,
            max: 1,
            step: 0.01
          }
        },
        {
          label: "输出最大 tokens",
          param_key: "max_tokens",
          ui_type: "slider",
          value: "4095",
          default_value: "4095",
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
      default_params: [
        {
          label: "温度",
          param_key: "temperature",
          ui_type: "slider",
          value: "0.3",
          default_value: "0.3",
          extra: {
            min: 0,
            max: 1.5,
            step: 0.01
          }
        },
        {
          label: "输出最大 tokens",
          param_key: "max_tokens",
          ui_type: "slider",
          value: "4096",
          default_value: "4096",
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
