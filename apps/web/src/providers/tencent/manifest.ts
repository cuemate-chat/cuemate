import Icon from '../../assets/llm/tencent_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'tencent',
  name: '腾讯混元',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  modelNamePlaceholder: '如 hunyuan-pro / hunyuan-standard',
  baseModels: [
    'hunyuan-pro',
    'hunyuan-standard',
    'hunyuan-lite',
    'hunyuan-role',
    'hunyuan-functioncall',
    'hunyuan-code',
  ],
  credentialFields: [
    { key: 'app_id', label: 'APP ID', required: true, type: 'text' },
    { key: 'secret_id', label: 'SecretId', required: true, type: 'password' },
    { key: 'secret_key', label: 'SecretKey', required: true, type: 'password' },
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
