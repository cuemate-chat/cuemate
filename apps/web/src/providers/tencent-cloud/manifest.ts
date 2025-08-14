import Icon from '../../assets/llm/tencent_cloud_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'tencent-cloud',
  name: '腾讯云',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  modelNamePlaceholder: '如 deepseek-v3 / deepseek-r1 / hunyuan-pro',
  baseModels: ['deepseek-v3', 'deepseek-r1', 'hunyuan-pro', 'hunyuan-standard', 'hunyuan-lite'],
  credentialFields: [
    { key: 'base_url', label: 'API URL', type: 'text' },
    { key: 'api_key', label: 'API Key', required: true, type: 'password' },
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
