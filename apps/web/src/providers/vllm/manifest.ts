import Icon from '../../assets/llm/vllm_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'vllm',
  name: 'vLLM',
  scope: 'private',
  kind: 'llm',
  icon: Icon,
  icon_url: 'assets/llm/vllm_icon_svg',
  modelNamePlaceholder: '如 facebook/opt-125m / BAAI/Aquila-7B',
  baseModels: [
    {
      name: 'facebook/opt-125m',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.7',
          default_value: '0.7',
          extra: { min: 0, max: 2, step: 0.1 },
        },
        {
          label: '输出最大tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '2048',
          default_value: '2048',
          extra: { min: 256, max: 2048, step: 128 },
        },
      ],
    },
    {
      name: 'BAAI/Aquila-7B',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.7',
          default_value: '0.7',
          extra: { min: 0, max: 2, step: 0.1 },
        },
        {
          label: '输出最大tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '2048',
          default_value: '2048',
          extra: { min: 256, max: 2048, step: 128 },
        },
      ],
    },
    {
      name: 'BAAI/AquilaChat-7B',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.7',
          default_value: '0.7',
          extra: { min: 0, max: 2, step: 0.1 },
        },
        {
          label: '输出最大tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '2048',
          default_value: '2048',
          extra: { min: 256, max: 2048, step: 128 },
        },
      ],
    },
  ],
  credentialFields: [
    {
      key: 'base_url',
      label: 'API URL',
      type: 'text',
      required: true,
      placeholder: '默认 http://localhost:8000/v1（vLLM本地服务API地址）',
      defaultValue: 'http://localhost:8000/v1',
    },
    {
      key: 'api_key',
      label: 'API Key',
      type: 'password',
      required: true,
      placeholder: '格式：vLLM服务的API密钥（可选，若未设置可为空）'
    },
  ]
};

export default manifest;
