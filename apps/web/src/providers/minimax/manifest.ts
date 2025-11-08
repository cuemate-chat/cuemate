import Icon from '../../assets/llm/minimax_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'minimax',
  name: 'MiniMax',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  icon_url: 'assets/llm/minimax_icon_svg',
  modelNamePlaceholder: '如 MiniMax-M2, abab6.5s-chat, abab6.5t-chat 等',
  baseModels: [
    {
      name: 'MiniMax-M2',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.7',
          default_value: '0.7',
          extra: {
            min: 0,
            max: 1,
            step: 0.1,
          },
        },
        {
          label: '输出最大 tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '16384',
          default_value: '16384',
          extra: {
            min: 256,
            max: 16384,
            step: 128,
          },
        },
      ],
    },
    {
      name: 'abab6.5s-chat',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.7',
          default_value: '0.7',
          extra: {
            min: 0,
            max: 1,
            step: 0.1,
          },
        },
        {
          label: '输出最大 tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '16384',
          default_value: '16384',
          extra: {
            min: 256,
            max: 16384,
            step: 128,
          },
        },
      ],
    },
    {
      name: 'abab6.5t-chat',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.7',
          default_value: '0.7',
          extra: {
            min: 0,
            max: 1,
            step: 0.1,
          },
        },
        {
          label: '输出最大 tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '8192',
          default_value: '8192',
          extra: {
            min: 256,
            max: 8192,
            step: 128,
          },
        },
      ],
    },
    {
      name: 'abab6.5g-chat',
      default_params: [
        {
          label: '温度',
          param_key: 'temperature',
          ui_type: 'slider',
          value: '0.7',
          default_value: '0.7',
          extra: {
            min: 0,
            max: 1,
            step: 0.1,
          },
        },
        {
          label: '输出最大 tokens',
          param_key: 'max_tokens',
          ui_type: 'slider',
          value: '8192',
          default_value: '8192',
          extra: {
            min: 256,
            max: 8192,
            step: 128,
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
      placeholder: '默认 https://api.minimaxi.com/v1',
      defaultValue: 'https://api.minimaxi.com/v1',
    },
    {
      key: 'api_key',
      label: 'API Key',
      required: true,
      type: 'password',
      placeholder: 'MiniMax 平台接口密钥',
    },
  ],
};

export default manifest;
