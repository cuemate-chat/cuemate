/**
 * 通用类型定义
 */

// 选项类型
export interface SelectOption<T = string> {
  label: string;
  value: T;
  disabled?: boolean;
}

// 加载状态
export interface LoadingState {
  loading: boolean;
  error?: string | null;
}

// 分页参数
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 主题类型
export type Theme = 'light' | 'dark' | 'system';

// 语言类型
export type Locale = 'zh-CN' | 'en-US';

// 状态类型
export type Status = 'idle' | 'pending' | 'success' | 'error';

// 操作结果类型
export interface OperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// 表单字段类型
export interface FormField<T = any> {
  value: T;
  error?: string;
  touched?: boolean;
  required?: boolean;
}

// 验证规则类型
export interface ValidationRule<T = any> {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  validator?: (value: T) => string | null;
}
