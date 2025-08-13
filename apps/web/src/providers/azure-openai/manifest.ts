import Icon from '../../assets/llm/azure_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'azure-openai',
  name: 'Azure OpenAI',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  modelNamePlaceholder: '部署名称，如 gpt-4o-mini 部署',
  credentialFields: [
    {
      key: 'base_url',
      label: 'Endpoint',
      type: 'text',
      placeholder: 'https://{resource}.openai.azure.com',
    },
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
      label: '最大输出 Token',
      param_key: 'max_tokens',
      ui_type: 'input',
      value: '2000',
      default_value: '2000',
    },
  ],
};

export default manifest;
