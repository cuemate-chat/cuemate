import { http } from './http';

// AI对话记录接口类型定义
export interface AIConversation {
  id: number;
  title: string;
  model_id: string;
  model_title: string;
  model_provider: string;
  model_name: string;
  model_type: string;
  model_icon: string;
  model_version: string;
  model_credentials: string;
  message_count: number;
  token_used: number;
  status: 'active' | 'completed' | 'error';
  created_at: number;
  updated_at: number;
}

// AI消息接口类型定义
export interface AIMessage {
  id: number;
  conversation_id: number;
  message_type: 'user' | 'assistant' | 'system';
  content: string;
  content_format: 'text' | 'markdown' | 'json';
  sequence_number: number;
  token_count: number;
  response_time_ms?: number;
  error_message?: string;
  metadata?: Record<string, any>;
  created_at: number;
}

// API响应类型
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
  model_id?: string;
  keyword?: string;
  startTime?: number;
  endTime?: number;
}

// 获取AI对话记录列表
export const fetchAIConversations = async (
  params: AIConversationParams,
): Promise<AIConversationsResponse> => {
  const queryParams = new URLSearchParams();

  if (params.page !== undefined) queryParams.set('page', params.page.toString());
  if (params.pageSize !== undefined) queryParams.set('limit', params.pageSize.toString());
  if (params.status) queryParams.set('status', params.status);
  if (params.model_id) queryParams.set('model_id', params.model_id);
  if (params.keyword) queryParams.set('search', params.keyword);
  if (params.startTime) queryParams.set('start_time', params.startTime.toString());
  if (params.endTime) queryParams.set('end_time', params.endTime.toString());

  const response = await http.get(`/ai/conversations?${queryParams.toString()}`);
  return response;
};

// 获取单个AI对话详情（包含所有消息）
export const fetchAIConversationDetail = async (
  conversationId: number,
): Promise<AIConversationDetailResponse> => {
  const response = await http.get(`/ai/conversations/${conversationId}`);
  return response;
};

// 删除AI对话记录
export const deleteAIConversation = async (conversationId: number): Promise<void> => {
  await http.delete(`/ai/conversations/${conversationId}`);
};

// 获取AI对话统计信息
export const fetchAIConversationStats = async (): Promise<AIConversationStats> => {
  const response = await http.get('/ai/conversations/stats');
  return response;
};

// 批量删除AI对话记录
export const batchDeleteAIConversations = async (
  conversationIds: number[],
): Promise<{ deletedCount: number }> => {
  const response = await http.post('/ai/conversations/batch-delete', {
    conversation_ids: conversationIds,
  });
  return response;
};

// 按时间删除AI对话记录
export const deleteAIConversationsBefore = async (
  beforeTime: number,
): Promise<{ deletedCount: number }> => {
  const response = await http.post('/ai/conversations/delete-before', {
    before_time: beforeTime,
  });
  return response;
};
