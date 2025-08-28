import dayjs from 'dayjs';
import { http } from './http';

// 操作记录接口类型
export interface OperationLog {
  id: number;
  menu: string;
  type: string;
  resource_id: string;
  resource_name: string;
  operation: string;
  time: number;
  message: string;
  source_ip: string;
  user_id: string;
  user_name: string;
  request_method: string;
  request_url: string;
  user_agent: string;
  status: 'success' | 'failed';
  error_message: string;
  created_at: number;
  updated_at: number;
}

// 分页响应类型
export interface OperationLogResponse {
  list: OperationLog[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// 统计信息类型
export interface OperationStats {
  menuStats: Array<{ menu: string; count: number }>;
  operationStats: Array<{ operation: string; count: number }>;
  statusStats: Array<{ status: string; count: number }>;
  dailyStats: Array<{ date: string; count: number }>;
  userStats: Array<{ user_id: string; user_name: string; count: number }>;
}

// 查询参数类型
export interface OperationLogQuery {
  page: number;
  pageSize: number;
  menu?: string;
  type?: string;
  operation?: string;
  status?: string;
  userId?: string;
  startTime?: number;
  endTime?: number;
  keyword?: string;
}

// 批量删除参数类型
export interface BatchDeleteParams {
  ids?: number[];
  beforeTime?: number;
  conditions?: {
    menu?: string;
    type?: string;
    status?: string;
    userId?: string;
  };
}

/**
 * 获取操作记录列表
 */
export const fetchOperationLogs = async (params: OperationLogQuery): Promise<OperationLogResponse> => {
  const cleanParams: Record<string, string> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      cleanParams[key] = String(value);
    }
  });

  return http.get('/operation-logs', cleanParams);
};

/**
 * 获取单个操作记录详情
 */
export const fetchOperationLogDetail = async (id: number): Promise<{ record: OperationLog }> => {
  return http.get(`/operation-logs/${id}`);
};

/**
 * 获取操作统计信息
 */
export const fetchOperationStats = async (days: number = 7): Promise<OperationStats> => {
  return http.get('/operation-logs/stats', { days: days.toString() });
};

/**
 * 导出操作记录
 */
export const exportOperationLogs = async (params: {
  startTime?: number;
  endTime?: number;
  format?: string;
}): Promise<void> => {
  const cleanParams: Record<string, string> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      cleanParams[key] = String(value);
    }
  });

  // 使用原始fetch以处理blob响应
  const token = localStorage.getItem('auth_token');
  const searchParams = new URLSearchParams(cleanParams);
  const response = await fetch(`/api/operation-logs/export?${searchParams}`, {
    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  // 下载文件
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `operation_logs_${dayjs().format('YYYY-MM-DD')}.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

/**
 * 批量删除操作记录
 */
export const batchDeleteOperationLogs = async (params: BatchDeleteParams): Promise<{ success: boolean; deletedCount: number }> => {
  // http.delete 不支持 body，所以使用原始 fetch
  const token = localStorage.getItem('auth_token');
  const response = await fetch('/api/operation-logs', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(params),
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  return response.json();
};