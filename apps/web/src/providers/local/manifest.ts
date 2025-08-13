import { ProviderManifest } from '../types';
import Icon from '../../assets/llm/local_icon_svg?raw';

const manifest: ProviderManifest = {
  id: 'local',
  name: '本地模型',
  scope: 'local',
  kind: 'llm',
  icon: Icon,
  modelNamePlaceholder: '如 llama3.1:8b（配合 Ollama/vLLM/xInference 等）',
  credentialFields: [
    { key: 'base_url', label: 'API URL', type: 'text', required: true, placeholder: 'http://localhost:11434 或本地代理地址' },
  ],
  defaultParams: [
    { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.3', default_value: '0.3', extra: { min: 0, max: 1, step: 0.1 } },
    { label: '最大输出 Token', param_key: 'max_tokens', ui_type: 'input', value: '1024', default_value: '1024' },
  ],
};

export default manifest;


