import Icon from '../../assets/llm/siliconCloud_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'siliconflow',
  name: 'SILICONFLOW',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  iconUrl: 'assets/llm/siliconCloud_icon_svg',
  jumpLink: 'https://cuemate.chat/guide/models/providers/siliconflow.html',
  modelNamePlaceholder: '如 deepseek-ai/DeepSeek-R1 / Qwen/Qwen2.5-72B-Instruct',
  baseModels: [
    {
      name: 'deepseek-ai/DeepSeek-R1',
      defaultParams: [
        {
          label: '温度',
          paramKey: 'temperature',
          uiType: 'slider',
          value: '0.7',
          defaultValue: '0.7',
          extra: {
            min: 0,
            max: 1,
            step: 0.1,
          },
        },
        {
          label: '输出最大 tokens',
          paramKey: 'max_tokens',
          uiType: 'slider',
          value: '32768',
          defaultValue: '32768',
          extra: {
            min: 256,
            max: 32768,
            step: 256,
          },
        },
      ],
    },
    {
      name: 'deepseek-ai/DeepSeek-V3',
      defaultParams: [
        {
          label: '温度',
          paramKey: 'temperature',
          uiType: 'slider',
          value: '0.7',
          defaultValue: '0.7',
          extra: {
            min: 0,
            max: 1,
            step: 0.1,
          },
        },
        {
          label: '输出最大 tokens',
          paramKey: 'max_tokens',
          uiType: 'slider',
          value: '32768',
          defaultValue: '32768',
          extra: {
            min: 256,
            max: 32768,
            step: 256,
          },
        },
      ],
    },
    {
      name: 'deepseek-ai/DeepSeek-V3.2-Exp',
      defaultParams: [
        {
          label: '温度',
          paramKey: 'temperature',
          uiType: 'slider',
          value: '0.7',
          defaultValue: '0.7',
          extra: {
            min: 0,
            max: 1,
            step: 0.1,
          },
        },
        {
          label: '输出最大 tokens',
          paramKey: 'max_tokens',
          uiType: 'slider',
          value: '64000',
          defaultValue: '64000',
          extra: {
            min: 256,
            max: 64000,
            step: 256,
          },
        },
      ],
    },
    {
      name: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B',
      defaultParams: [
        {
          label: '温度',
          paramKey: 'temperature',
          uiType: 'slider',
          value: '0.7',
          defaultValue: '0.7',
          extra: {
            min: 0,
            max: 1,
            step: 0.1,
          },
        },
        {
          label: '输出最大 tokens',
          paramKey: 'max_tokens',
          uiType: 'slider',
          value: '32768',
          defaultValue: '32768',
          extra: {
            min: 256,
            max: 32768,
            step: 256,
          },
        },
      ],
    },
    {
      name: 'Qwen/Qwen2.5-72B-Instruct',
      defaultParams: [
        {
          label: '温度',
          paramKey: 'temperature',
          uiType: 'slider',
          value: '0.7',
          defaultValue: '0.7',
          extra: {
            min: 0,
            max: 1,
            step: 0.1,
          },
        },
        {
          label: '输出最大 tokens',
          paramKey: 'max_tokens',
          uiType: 'slider',
          value: '32768',
          defaultValue: '32768',
          extra: {
            min: 256,
            max: 32768,
            step: 256,
          },
        },
      ],
    },
    {
      name: 'Qwen/Qwen2.5-32B-Instruct',
      defaultParams: [
        {
          label: '温度',
          paramKey: 'temperature',
          uiType: 'slider',
          value: '0.7',
          defaultValue: '0.7',
          extra: {
            min: 0,
            max: 1,
            step: 0.1,
          },
        },
        {
          label: '输出最大 tokens',
          paramKey: 'max_tokens',
          uiType: 'slider',
          value: '32768',
          defaultValue: '32768',
          extra: {
            min: 256,
            max: 32768,
            step: 256,
          },
        },
      ],
    },
    {
      name: 'Qwen/Qwen2.5-7B-Instruct',
      defaultParams: [
        {
          label: '温度',
          paramKey: 'temperature',
          uiType: 'slider',
          value: '0.7',
          defaultValue: '0.7',
          extra: {
            min: 0,
            max: 1,
            step: 0.1,
          },
        },
        {
          label: '输出最大 tokens',
          paramKey: 'max_tokens',
          uiType: 'slider',
          value: '32768',
          defaultValue: '32768',
          extra: {
            min: 256,
            max: 32768,
            step: 256,
          },
        },
      ],
    },
    {
      name: 'Qwen/Qwen2.5-Coder-7B-Instruct',
      defaultParams: [
        {
          label: '温度',
          paramKey: 'temperature',
          uiType: 'slider',
          value: '0.7',
          defaultValue: '0.7',
          extra: {
            min: 0,
            max: 1,
            step: 0.1,
          },
        },
        {
          label: '输出最大 tokens',
          paramKey: 'max_tokens',
          uiType: 'slider',
          value: '32768',
          defaultValue: '32768',
          extra: {
            min: 256,
            max: 32768,
            step: 256,
          },
        },
      ],
    },
    {
      name: 'Qwen/QwQ-32B',
      defaultParams: [
        {
          label: '温度',
          paramKey: 'temperature',
          uiType: 'slider',
          value: '0.7',
          defaultValue: '0.7',
          extra: {
            min: 0,
            max: 1,
            step: 0.1,
          },
        },
        {
          label: '输出最大 tokens',
          paramKey: 'max_tokens',
          uiType: 'slider',
          value: '32768',
          defaultValue: '32768',
          extra: {
            min: 256,
            max: 32768,
            step: 256,
          },
        },
      ],
    },
    {
      name: 'meta-llama/Llama-3.3-70B-Instruct',
      defaultParams: [
        {
          label: '温度',
          paramKey: 'temperature',
          uiType: 'slider',
          value: '0.7',
          defaultValue: '0.7',
          extra: {
            min: 0,
            max: 1,
            step: 0.1,
          },
        },
        {
          label: '输出最大 tokens',
          paramKey: 'max_tokens',
          uiType: 'slider',
          value: '32768',
          defaultValue: '32768',
          extra: {
            min: 256,
            max: 32768,
            step: 256,
          },
        },
      ],
    },
    {
      name: 'THUDM/glm-4-9b-chat',
      defaultParams: [
        {
          label: '温度',
          paramKey: 'temperature',
          uiType: 'slider',
          value: '0.7',
          defaultValue: '0.7',
          extra: {
            min: 0,
            max: 1,
            step: 0.1,
          },
        },
        {
          label: '输出最大 tokens',
          paramKey: 'max_tokens',
          uiType: 'slider',
          value: '32768',
          defaultValue: '32768',
          extra: {
            min: 256,
            max: 32768,
            step: 256,
          },
        },
      ],
    },
    {
      name: 'internlm/internlm2_5-7b-chat',
      defaultParams: [
        {
          label: '温度',
          paramKey: 'temperature',
          uiType: 'slider',
          value: '0.7',
          defaultValue: '0.7',
          extra: {
            min: 0,
            max: 1,
            step: 0.1,
          },
        },
        {
          label: '输出最大 tokens',
          paramKey: 'max_tokens',
          uiType: 'slider',
          value: '32768',
          defaultValue: '32768',
          extra: {
            min: 256,
            max: 32768,
            step: 256,
          },
        },
      ],
    },
  ],
  credentialFields: [
    {
      key: 'base_url',
      label: 'API URL',
      type: 'text',
      placeholder: 'https://api.siliconflow.cn/v1',
      defaultValue: 'https://api.siliconflow.cn/v1',
    },
    {
      key: 'api_key',
      label: 'API Key',
      required: true,
      type: 'password',
      placeholder: '格式：sk-开头的 API Key，需在 SiliconFlow 平台获取',
    },
  ],
};

export default manifest;
