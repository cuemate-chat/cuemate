import { ProviderManifest } from '../types';
import Icon from '../../assets/llm/bedrock_icon_svg?raw';

const manifest: ProviderManifest = {
  id: 'aws-bedrock',
  name: 'Amazon Bedrock',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  modelNamePlaceholder: '如 anthropic.claude-3-7-sonnet 或 meta.llama3-70b-instruct',
  credentialFields: [
    { key: 'base_url', label: 'API URL', type: 'text', placeholder: '可选，代理 Base URL' },
    { key: 'api_key', label: 'API Key', type: 'password', required: false },
  ],
  defaultParams: [
    { label: '温度', param_key: 'temperature', ui_type: 'slider', value: '0.7', default_value: '0.7', extra: { min: 0, max: 1, step: 0.1 } },
    { label: '最大输出 Token', param_key: 'max_tokens', ui_type: 'input', value: '2000', default_value: '2000' },
  ],
};

export default manifest;


