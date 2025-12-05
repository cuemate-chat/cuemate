import { http } from './http';

// AI 对话记录接口类型定义
export interface AIConversation {
  id: number;
  title: string;
  modelId: string;
  modelTitle: string;
  modelProvider: string;
  modelName: string;
  modelType: string;
  modelIcon: string;
  modelVersion: string;
  modelCredentials: string;
  messageCount: number;
  tokenUsed: number;
  status: 'active' | 'completed' | 'error';
  createdAt: number;
  updatedAt: number;
}

// AI 消息接口类型定义
export interface AIMessage {
  id: number;
  conversationId: number;
  messageType: 'user' | 'assistant' | 'system';
  content: string;
  contentFormat: 'text' | 'markdown' | 'json';
  sequenceNumber: number;
  tokenCount: number;
  responseTimeMs?: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt: number;
}

// API 响应类型
export interface AIConversationsResponse {
  items: AIConversation[];
  total: number;
}

export interface AIConversationDetailResponse {
  conversation: AIConversation;
  messages: AIMessage[];
}

export interface AIConversationStats {
  total: number;
  active: number;
  completed: number;
  error: number;
  totalTokens: number;
  todayConversations: number;
  todayQuestions: number;
  totalQuestions: number;
  failedConversations: number;
}

// 查询参数类型
export interface AIConversationParams {
  page?: number;
  pageSize?: number;
  status?: string;
  modelId?: string;
  keyword?: string;
  startTime?: number;
  endTime?: number;
}

// 获取 AI 对话记录列表
export const fetchAIConversations = async (
  params: AIConversationParams,
): Promise<AIConversationsResponse> => {
  const queryParams = new URLSearchParams();

  if (params.page !== undefined) queryParams.set('page', params.page.toString());
  if (params.pageSize !== undefined) queryParams.set('limit', params.pageSize.toString());
  if (params.status) queryParams.set('status', params.status);
  if (params.modelId) queryParams.set('modelId', params.modelId);
  if (params.keyword) queryParams.set('search', params.keyword);
  if (params.startTime) queryParams.set('startTime', params.startTime.toString());
  if (params.endTime) queryParams.set('endTime', params.endTime.toString());

  const response = await http.get(`/ai/conversations?${queryParams.toString()}`);
  return response;
};

// 获取单个 AI 对话详情（包含所有消息）
export const fetchAIConversationDetail = async (
  conversationId: number,
): Promise<AIConversationDetailResponse> => {
  const response = await http.get(`/ai/conversations/${conversationId}`);
  return response;
};

// 删除 AI 对话记录
export const deleteAIConversation = async (conversationId: number): Promise<void> => {
  await http.delete(`/ai/conversations/${conversationId}`);
};

// 获取 AI 对话统计信息
export const fetchAIConversationStats = async (): Promise<AIConversationStats> => {
  const response = await http.get('/ai/conversations/stats');
  return response;
};

// 批量删除 AI 对话记录
export const batchDeleteAIConversations = async (
  conversationIds: number[],
): Promise<{ deletedCount: number }> => {
  const response = await http.post('/ai/conversations/batch-delete', {
    conversationIds: conversationIds,
  });
  return response;
};

// 按时间删除 AI 对话记录
export const deleteAIConversationsBefore = async (
  beforeTime: number,
): Promise<{ deletedCount: number }> => {
  const response = await http.post('/ai/conversations/delete-before', {
    beforeTime: beforeTime,
  });
  return response;
};
