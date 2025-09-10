import Icon from '../../assets/llm/local_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'local',
  name: '本地模型',
  scope: 'private',
  kind: 'llm',
  icon: Icon,
  icon_url: 'assets/llm/local_icon_svg',
  modelNamePlaceholder: '如 llama3.1:8b（配合 Ollama/vLLM/xInference 等）',
  baseModels: [
    'deepseek-r1:1.5b',
    'deepseek-r1:7b',
    'deepseek-r1:14b',
    'deepseek-r1:32b',
    'llama3.3:70b',
    'llama3.2:90b',
    'llama3.2:11b',
    'llama3.2:3b',
    'llama3.2:1b',
    'llama3.1:405b',
    'llama3.1:70b',
    'llama3.1:8b',
    'qwen2.5:72b',
    'qwen2.5:32b',
    'qwen2.5:14b',
    'qwen2.5:7b',
    'qwen2.5:3b',
    'qwen2.5:1.5b',
    'qwen2.5:0.5b'
  ],
  credentialFields: [
    {
      key: 'base_url',
      label: 'API URL',
      type: 'text',
      required: true,
      placeholder: '默认 http://localhost:11434（本地模型服务API地址）',
      defaultValue: 'http://localhost:11434',
    },
  ],
  defaultParams: [
    {
      label: '温度',
      param_key: 'temperature',
      ui_type: 'slider',
      value: '0.3',
      default_value: '0.3',
      extra: { min: 0, max: 1, step: 0.1 },
    },
    {
      label: '最大输出 Token',
      param_key: 'max_tokens',
      ui_type: 'input',
      value: '1024',
      default_value: '1024',
    },
  ],
};

export default manifest;
