import Icon from '../../assets/llm/azure_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'azure-openai',
  name: 'Azure OpenAI',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  iconUrl: 'assets/llm/azure_icon_svg',
  jumpLink: 'https://cuemate.chat/guide/models/providers/azure-openai.html',
  modelNamePlaceholder: '部署名称，如 gpt-4o-mini 部署',
  baseModels: [
  {
    name: "gpt-4o",
    defaultParams: [
      {
        label: "温度",
        paramKey: "temperature",
        uiType: "slider",
        value: "0.7",
        defaultValue: "0.7",
        extra: {
          min: 0,
          max: 1,
          step: 0.1
        }
      },
      {
        label: "输出最大 tokens",
        paramKey: "max_tokens",
        uiType: "slider",
        value: "16384",
        defaultValue: "16384",
        extra: {
          min: 256,
          max: 16384,
          step: 128
        }
      }
    ]
  },
  {
    name: "gpt-4o-mini",
    defaultParams: [
      {
        label: "温度",
        paramKey: "temperature",
        uiType: "slider",
        value: "0.7",
        defaultValue: "0.7",
        extra: {
          min: 0,
          max: 1,
          step: 0.1
        }
      },
      {
        label: "输出最大 tokens",
        paramKey: "max_tokens",
        uiType: "slider",
        value: "16384",
        defaultValue: "16384",
        extra: {
          min: 256,
          max: 16384,
          step: 128
        }
      }
    ]
  },
  {
    name: "gpt-4",
    defaultParams: [
      {
        label: "温度",
        paramKey: "temperature",
        uiType: "slider",
        value: "0.7",
        defaultValue: "0.7",
        extra: {
          min: 0,
          max: 1,
          step: 0.1
        }
      },
      {
        label: "输出最大 tokens",
        paramKey: "max_tokens",
        uiType: "slider",
        value: "8192",
        defaultValue: "8192",
        extra: {
          min: 256,
          max: 8192,
          step: 128
        }
      }
    ]
  }
],
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
      placeholder: '默认 2024-06-01（Azure OpenAI API 版本）',
      defaultValue: '2024-06-01',
    },
    { 
      key: 'api_key', 
      label: 'API Key', 
      required: true, 
      type: 'password',
      placeholder: '格式：32 位字符的 16 进制密钥，需在 Azure 控制台获取'
    },
    { key: 'deployment_name', label: 'Deployment name', required: true, type: 'text' },
  ]
};

export default manifest;
