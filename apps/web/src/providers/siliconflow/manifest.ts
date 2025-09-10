import Icon from '../../assets/llm/siliconCloud_icon_svg?raw';
import { ProviderManifest } from '../types';

const manifest: ProviderManifest = {
  id: 'siliconflow',
  name: 'SILICONFLOW',
  scope: 'public',
  kind: 'llm',
  icon: Icon,
  icon_url: 'assets/llm/siliconCloud_icon_svg',
  modelNamePlaceholder: '如 Qwen2.5-7B-Instruct / DeepSeek-R1-Distill-Qwen-7B',
  baseModels: [
    'deepseek-ai/DeepSeek-R1-Distill-Llama-8B',
    'deepseek-ai/DeepSeek-R1-Distill-Qwen-7B',
    'deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B',
    'Qwen/Qwen2.5-7B-Instruct',
    'Qwen/Qwen2.5-Coder-7B-Instruct',
    'internlm/internlm2_5-7b-chat',
    'Qwen/Qwen2-1.5B-Instruct',
    'THUDM/glm-4-9b-chat',
  ],
  credentialFields: [
    { 
      key: 'base_url', 
      label: 'API URL', 
      type: 'text', 
      placeholder: 'https://api.siliconflow.cn/v1',
      defaultValue: 'https://api.siliconflow.cn/v1'
    },
    { 
      key: 'api_key', 
      label: 'API Key', 
      required: true, 
      type: 'password',
      placeholder: '格式：sk-开头的API Key，需在SiliconFlow平台获取'
    },
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
