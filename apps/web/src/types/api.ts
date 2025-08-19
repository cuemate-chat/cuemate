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

// 用户相关类型
export interface User {
  id: string;
  username?: string;
  email?: string;
  name?: string;
  avatar?: string;
  theme?: 'light' | 'dark' | 'system';
  locale?: string;
  timezone?: string;
  created_at?: number;
  updated_at?: number;
  // 保持兼容性
  createdAt?: string;
  updatedAt?: string;
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
  theme?: 'light' | 'dark' | 'system';
  locale?: string;
  timezone?: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

// 岗位相关类型
export interface Job {
  id: string;
  title: string;
  company?: string;
  description?: string;
  requirements?: string;
  status: 'active' | 'inactive' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface JobSummary {
  id: string;
  title: string;
}

export interface CreateJobRequest {
  title: string;
  company?: string;
  description?: string;
  requirements?: string;
}

// 面试相关类型
export interface Interview {
  id: string;
  jobId: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  startTime?: string;
  endTime?: string;
  score?: number;
  feedback?: string;
  createdAt: string;
  updatedAt: string;
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
