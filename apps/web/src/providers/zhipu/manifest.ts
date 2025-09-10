import Icon from '../../assets/llm/zhipuai_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'zhipu',
  name: '智谱 AI',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  icon_url: 'assets/llm/zhipuai_icon_svg',
  modelNamePlaceholder: '如 glm-4 / glm-4v / glm-3-turbo',
  baseModels: [
    'glm-4-plus',
    'glm-4-long',
    'glm-4-air',
    'glm-4-airx',
    'glm-4-flash', 
    'glm-4',
    'glm-4v',
    'glm-4v-plus',
    'glm-3-turbo'
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
      placeholder: '格式：32位字符.字符串，需在智谱AI开放平台获取'
    },
  ],
  defaultParams: [
    {
      label: '温度',
      param_key: 'temperature',
      ui_type: 'slider',
      value: '0.95',
      default_value: '0.95',
      extra: { min: 0, max: 1, step: 0.05 },
    },
    {
      label: '输出最大 tokens',
      param_key: 'max_tokens',
      ui_type: 'slider',
      value: '1024',
      default_value: '1024',
      extra: { min: 256, max: 4096, step: 128 },
    },
  ],
};

export default manifest;
