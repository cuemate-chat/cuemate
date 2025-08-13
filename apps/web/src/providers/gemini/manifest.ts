import { ProviderManifest } from '../types';
import Icon from '../../assets/llm/gemini_icon_svg?raw';

const manifest: ProviderManifest = {
  id: 'gemini',
  name: 'Gemini',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  modelNamePlaceholder: '如 gemini-2.0-flash-exp',
  credentialFields: [
    { key: 'base_url', label: 'API URL', type: 'text', placeholder: '可选，OpenAI 兼容代理地址' },
    { key: 'api_key', label: 'API Key', required: true, type: 'password' },
  ],
  defaultParams: [
    { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 1, step: 0.1 } },
    { label: '最大输出 Token', param_key: 'max_tokens', ui_type: 'input', value: '2000', default_value: '2000' },
  ],
};

export default manifest;


