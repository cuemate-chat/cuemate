import Icon from '../../assets/llm/azure_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'azure-openai',
  name: 'Azure OpenAI',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  icon_url: 'assets/llm/azure_icon_svg',
  modelNamePlaceholder: '部署名称，如 gpt-4o-mini 部署',
  baseModels: [
  {
    name: "gpt-4o",
    default_params: [
      {
        label: "温度",
        param_key: "temperature",
        ui_type: "slider",
        value: "0.7",
        default_value: "0.7",
        extra: {
          min: 0,
          max: 1,
          step: 0.1
        }
      },
      {
        label: "输出最大 tokens",
        param_key: "max_tokens",
        ui_type: "slider",
        value: "16384",
        default_value: "16384",
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
    default_params: [
      {
        label: "温度",
        param_key: "temperature",
        ui_type: "slider",
        value: "0.7",
        default_value: "0.7",
        extra: {
          min: 0,
          max: 1,
          step: 0.1
        }
      },
      {
        label: "输出最大 tokens",
        param_key: "max_tokens",
        ui_type: "slider",
        value: "16384",
        default_value: "16384",
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
    default_params: [
      {
        label: "温度",
        param_key: "temperature",
        ui_type: "slider",
        value: "0.7",
        default_value: "0.7",
        extra: {
          min: 0,
          max: 1,
          step: 0.1
        }
      },
      {
        label: "输出最大 tokens",
        param_key: "max_tokens",
        ui_type: "slider",
        value: "8192",
        default_value: "8192",
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
