/**
 * API 相关类型定义
 */

// 通用 API 响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 分页响应类型
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 模型相关类型
export interface Model {
  id: string;
  name: string;
  provider: string;
  type: string;
  scope: string;
  modelName: string;
  icon?: string;
  version?: string;
  credentials?: string; // JSON 字符串，包含凭据信息
  status?: string; // 连通状态：ok/fail/null
  createdBy?: string;
  isEnabled: number;
  createdAt: number;
  updatedAt?: number;
}

export interface ModelParam {
  id: string;
  modelId: string;
  label?: string;
  paramKey: string;
  uiType: string;
  value?: string;
  defaultValue?: string;
  required: number;
  extra?: any;
  createdAt: number;
  updatedAt?: number;
}

// 用户相关类型
export interface User {
  id: string;
  email?: string;
  name?: string;
  createdAt: number;
  theme?: string;
  locale?: string;
  timezone?: string;
  selectedModelId?: string;
  isLoggedIn?: number;
  floatingWindowVisible?: number;
  floatingWindowHeight?: number;
  version?: string;
  model?: Model | null;
  modelParams?: ModelParam[];
}

export interface LoginRequest {
  account: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  theme?: string;
  locale?: string;
  timezone?: string;
  selectedModelId?: string;
  floatingWindowVisible?: number;
  floatingWindowHeight?: number;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

// 岗位相关类型
export interface Job {
  id: string;
  title: string;
  description?: string;
  requirements?: string;
  status: 'active' | 'inactive' | 'archived';
  createdAt: number;
  updatedAt: number;
}

export interface JobSummary {
  id: string;
  title: string;
}

export interface CreateJobRequest {
  title: string;
  description?: string;
  requirements?: string;
}

// 面试相关类型
export interface Interview {
  id: string;
  jobId: string;
  userId: string;
  theme: string;
  startedAt: number;
  endedAt?: number | null;
  selectedModelId?: string | null;
  locale: string;
  timezone: string;
  jobTitle?: string | null;
  jobContent?: string | null;
  questionCount: number;
  resumesId?: string | null;
  resumesTitle?: string | null;
  resumesContent?: string | null;
  duration: number;
  interviewType: 'mock' | 'training';
  status:
    | 'idle'
    | 'mock-interview-recording'
    | 'mock-interview-paused'
    | 'mock-interview-completed'
    | 'mock-interview-playing'
    | 'mock-interview-error'
    | 'mock-interview-expired'
    | 'interview-training-recording'
    | 'interview-training-paused'
    | 'interview-training-completed'
    | 'interview-training-playing'
    | 'interview-training-error'
    | 'interview-training-expired';
  message?: string | null;
  vectorStatus: number;
  answerMode?: 'manual' | 'auto' | null;
  microphoneDeviceId?: string | null;
  speakerDeviceId?: string | null;
}

export interface Question {
  id: string;
  jobId?: string;
  content: string;
  type: 'behavioral' | 'technical' | 'situational';
  difficulty: 'easy' | 'medium' | 'hard';
  tags?: string[];
  answer?: string;
  tips?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  interviewId: string;
  jobTitle: string;
  score: number;
  highlights: string[];
  improvements: string[];
  feedback: string;
  createdAt: string;
  updatedAt: string;
}

// 模型配置相关类型
export interface ModelProvider {
  id: string;
  name: string;
  type: 'openai' | 'anthropic' | 'google' | 'local' | 'other';
  enabled: boolean;
  apiKey?: string;
  baseUrl?: string;
  models: string[];
  settings?: Record<string, any>;
}

// 向量知识库相关类型
export interface VectorDocument {
  id: string;
  filename: string;
  content: string;
  chunks: number;
  status: 'processing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

// 日志相关类型
export interface LogEntry {
  id: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  service: string;
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

// License 相关类型
export interface LicenseInfo {
  id: string;
  corporation: string;
  edition: string;
  expireTime: number;
  productType: string;
  authorizeCount: number;
  licenseVersion: string;
  applyUser: string;
  status: string;
  createdAt: number;
  updatedAt?: number;
}
