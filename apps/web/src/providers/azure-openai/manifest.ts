import Icon from '../../assets/llm/azure_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'azure-openai',
  name: 'Azure OpenAI',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  modelNamePlaceholder: '部署名称，如 gpt-4o-mini 部署',
  baseModels: ['Azure OpenAI', 'gpt-4', 'gpt-4o', 'gpt-4o-mini'],
  credentialFields: [
    {
      key: 'base_url',
      label: 'Endpoint',
      type: 'text',
      required: true,
      placeholder: 'https://{resource}.openai.azure.com',
    },
    {
      key: 'api_version',
      label: 'API Version',
      required: true,
      type: 'text',
      placeholder: '默认 2024-06-01（Azure OpenAI API版本）',
      defaultValue: '2024-06-01',
    },
    { 
      key: 'api_key', 
      label: 'API Key', 
      required: true, 
      type: 'password',
      placeholder: '格式：32位字符的16进制密钥，需在Azure控制台获取'
    },
    { key: 'deployment_name', label: 'Deployment name', required: true, type: 'text' },
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
      extra: { min: 256, max: 8192, step: 128 },
    },
  ],
};

export default manifest;
