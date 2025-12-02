import Icon from '../../assets/llm/vllm_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'vllm',
  name: 'vLLM',
  scope: 'private',
  kind: 'llm',
  icon: Icon,
  icon_url: 'assets/llm/vllm_icon_svg',
  jump_link: 'https://cuemate.chat/guide/models/providers/vllm.html',
  modelNamePlaceholder: '如 Qwen/Qwen2.5-7B-Instruct / meta-llama/Meta-Llama-3.1-8B-Instruct',
  baseModels: [
    {
      name: 'Qwen/Qwen2.5-7B-Instruct',
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
          label: '输出最大 tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '8192',
          default_value: '8192',
          extra: { min: 256, max: 32768, step: 128 },
        },
      ],
    },
    {
      name: 'Qwen/Qwen2.5-14B-Instruct',
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
          label: '输出最大 tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '8192',
          default_value: '8192',
          extra: { min: 256, max: 32768, step: 128 },
        },
      ],
    },
    {
      name: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
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
          label: '输出最大 tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '8192',
          default_value: '8192',
          extra: { min: 256, max: 131072, step: 128 },
        },
      ],
    },
    {
      name: 'meta-llama/Meta-Llama-3.1-70B-Instruct',
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
          label: '输出最大 tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '8192',
          default_value: '8192',
          extra: { min: 256, max: 131072, step: 128 },
        },
      ],
    },
    {
      name: 'mistralai/Mistral-7B-Instruct-v0.3',
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
          label: '输出最大 tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '8192',
          default_value: '8192',
          extra: { min: 256, max: 32768, step: 128 },
        },
      ],
    },
    {
      name: 'deepseek-ai/DeepSeek-V2.5',
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
          label: '输出最大 tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '8192',
          default_value: '8192',
          extra: { min: 256, max: 65536, step: 128 },
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
      placeholder: '默认 http://localhost:8000/v1（vLLM 本地服务 API 地址）',
      defaultValue: 'http://localhost:8000/v1',
    },
    {
      key: 'api_key',
      label: 'API Key',
      type: 'password',
      required: false,
      placeholder: '可选，vLLM 服务启动时配置了 --api-key 参数时填写'
    },
  ]
};

export default manifest;
