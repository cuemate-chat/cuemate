import Icon from '../../assets/llm/stepfun_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'stepfun',
  name: '阶跃星辰',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  icon_url: 'assets/llm/stepfun_icon_svg',
  modelNamePlaceholder: '如 step-2-mini, step-2-16k, step-1-8k, step-1-256k 等',
  baseModels: [
    {
      name: "step-2-mini",
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
          label: "输出最大 tokens",
          param_key: "max_tokens",
          ui_type: "slider",
          value: "32768",
          default_value: "32768",
          extra: {
            min: 256,
            max: 32768,
            step: 128
          }
        }
      ]
    },
    {
      name: "step-2-16k",
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
          label: "输出最大 tokens",
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
      name: "step-1-8k",
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
      name: "step-1-32k",
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
          label: "输出最大 tokens",
          param_key: "max_tokens",
          ui_type: "slider",
          value: "32768",
          default_value: "32768",
          extra: {
            min: 256,
            max: 32768,
            step: 128
          }
        }
      ]
    },
    {
      name: "step-1-256k",
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
          label: "输出最大 tokens",
          param_key: "max_tokens",
          ui_type: "slider",
          value: "262144",
          default_value: "262144",
          extra: {
            min: 256,
            max: 262144,
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
      placeholder: '默认 https://api.stepfun.com/v1',
      defaultValue: 'https://api.stepfun.com/v1',
    },
    {
      key: 'api_key',
      label: 'API Key',
      required: true,
      type: 'password',
      placeholder: '阶跃星辰平台 API Key'
    },
  ]
};

export default manifest;
