export type ProviderScope = 'public' | 'private';
export type ModelKind = 'llm' | 'asr' | 'embedding' | 'vision';

export interface ProviderField {
  key: string; // 如 api_key / base_url
  label: string; // 显示名称
  required?: boolean;
  type?: 'text' | 'password' | 'number' | 'select';
  placeholder?: string;
  options?: Array<{ label: string; value: string }>; // select 用
}

export interface ProviderParam {
  label: string; // 显示名称
  param_key: string; // 写入 model_params.param_key
  ui_type?: 'slider' | 'input' | 'switch' | 'select';
  value?: string; // 默认值（字符串存储）
  default_value?: string;
  required?: boolean;
  extra?: any; // 范围/步长/选项
}

export interface ProviderManifest {
  id: string; // 唯一标识，如 openai / deepseek / ollama
  name: string; // 展示名称
  scope: ProviderScope; // 公有/私有/本地
  kind: ModelKind; // 模型类型
  icon?: string; // 图标 URL（可选）
  modelNamePlaceholder?: string;
  credentialFields: ProviderField[]; // API URL、API Key 等
  defaultParams: ProviderParam[]; // 默认高级参数
}
