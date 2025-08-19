import Icon from '../../assets/llm/ollama_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'ollama',
  name: 'Ollama',
  scope: 'private',
  kind: 'llm',
  icon: Icon,
  modelNamePlaceholder: '如 deepseek-r1:7b / qwen2.5:7b-instruct',
  baseModels: [
    // DeepSeek-R1 家族
    'deepseek-r1:1.5b',
    'deepseek-r1:7b',
    'deepseek-r1:8b',
    'deepseek-r1:14b',
    'deepseek-r1:32b',
    // Llama 家族
    'llama3:8b',
    'llama3:70b',
    'llama2:70b',
    'llama2-chinese:13b',
    // Qwen 基础模型
    'qwen:0.5b',
    'qwen:1.8b',
    'qwen:4b',
    'qwen:7b',
    'qwen:14b',
    'qwen:32b',
    'qwen:72b',
    'qwen:110b',
    // Qwen 指令微调
    'qwen2.5:0.5b-instruct',
    'qwen2.5:1.5b-instruct',
    'qwen2.5:3b-instruct',
    'qwen2.5:5b-instruct',
    'qwen2.5:7b-instruct',
    'qwen2.5:14b-instruct',
    'qwen2.5:32b-instruct',
    'qwen2.5:72b-instruct',
    'qwen2.2:72b-instruct',
    // 其它代表性模型
    'phi3',
  ],
  credentialFields: [
    {
      key: 'base_url',
      label: 'API URL',
      required: true,
      type: 'text',
      placeholder: '默认 http://localhost:11434（Ollama本地API地址）',
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
      label: '输出最大 tokens',
      param_key: 'num_predict',
      ui_type: 'slider',
      value: '1024',
      default_value: '1024',
      extra: { min: 128, max: 8192, step: 128 },
    },
  ],
};

export default manifest;
