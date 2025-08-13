import Icon from '../../assets/llm/ollama_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'ollama',
  name: 'Ollama',
  scope: 'private',
  kind: 'llm',
  icon: Icon,
  modelNamePlaceholder: '如 llama3.1:8b / deepseek-r1:7b',
  credentialFields: [
    {
      key: 'base_url',
      label: 'API URL',
      required: true,
      type: 'text',
      placeholder: '默认 http://localhost:11434',
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
      param_key: 'num_predict',
      ui_type: 'input',
      value: '1024',
      default_value: '1024',
    },
  ],
};

export default manifest;
