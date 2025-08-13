import Icon from '../../assets/llm/regolo_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'regolo',
  name: 'Regolo',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  modelNamePlaceholder: '请输入模型名称',
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
  ],
};

export default manifest;
