import Icon from '../../assets/llm/vllm_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'vllm',
  name: 'vLLM',
  scope: 'private',
  kind: 'llm',
  icon: Icon,
  modelNamePlaceholder: '部署的模型名称',
  credentialFields: [{ key: 'base_url', label: 'API URL', type: 'text', required: true }],
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
