import Icon from '../../assets/llm/volcanic_engine_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'volcengine',
  name: '火山引擎',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  icon_url: 'assets/llm/volcanic_engine_icon_svg',
  modelNamePlaceholder: '如 doubao-pro-32k / ep-xxxxxxxxxx-yyyy',
  baseModels: [
    // Doubao 系列常见模型（可根据需要扩展/调整）
    'ep-xxxxxxxxxx-yyyy',
    'doubao-pro-32k',
    'doubao-lite-32k',
    'doubao-vision-pro',
    'doubao-vision-lite',
    'doubao-pro-128k',
  ],
  credentialFields: [
    { 
      key: 'base_url', 
      label: 'API URL', 
      type: 'text',
      placeholder: '默认 https://ark.cn-beijing.volces.com/api/v3（可选，代理 Base URL）',
      defaultValue: 'https://ark.cn-beijing.volces.com/api/v3'
    },
    { 
      key: 'api_key', 
      label: 'API Key', 
      required: true, 
      type: 'password',
      placeholder: '格式：UUID格式的API Key，需在火山引擎控制台获取'
    },
  ],
  defaultParams: [
    {
      label: '温度',
      param_key: 'temperature',
      ui_type: 'slider',
      value: '0.7',
      default_value: '0.7',
      extra: { min: 0, max: 1, step: 0.1 },
    },
    {
      label: '输出最大 tokens',
      param_key: 'max_tokens',
      ui_type: 'slider',
      value: '800',
      default_value: '800',
      extra: { min: 100, max: 4000, step: 50 },
    },
  ],
};

export default manifest;
