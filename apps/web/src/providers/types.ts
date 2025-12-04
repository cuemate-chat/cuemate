export type ProviderScope = 'public' | 'private';
export type ModelKind = 'llm' | 'asr' | 'embedding' | 'vision';

export interface ProviderField {
  key: string; // 如 api_key / base_url
  label: string; // 显示名称
  required?: boolean;
  type?: 'text' | 'password' | 'number' | 'select';
  placeholder?: string;
  defaultValue?: string; // 默认值,会自动填入表单
  options?: Array<{ label: string; value: string }>; // select 用
}

export interface ProviderParam {
  label: string; // 显示名称
  paramKey: string; // 写入 modelParams.paramKey
  uiType?: 'slider' | 'input' | 'switch' | 'select';
  value?: string; // 默认值(字符串存储)
  defaultValue?: string;
  required?: boolean;
  extra?: any; // 范围/步长/选项
}

export interface BaseModel {
  name: string;
  defaultParams: ProviderParam[];
}

export interface ProviderManifest {
  id: string; // 唯一标识,如 openai / deepseek / ollama
  name: string; // 展示名称
  scope: ProviderScope; // 公有/私有/本地
  kind: ModelKind; // 模型类型
  icon?: string; // 图标 URL(可选)
  iconUrl?: string; // 图标文件路径,用于存储到数据库
  jumpLink?: string; // 跳转到官方文档的链接
  modelNamePlaceholder?: string;
  baseModels?: (string | BaseModel)[]; // 该提供商支持的"基础模型/版本"列表,可以是简单字符串或包含参数配置的对象
  credentialFieldsPerModel?: Record<string, ProviderField[]>; // 针对不同基础模型定制凭据字段
  credentialFields: ProviderField[]; // API URL、API Key 等
}
