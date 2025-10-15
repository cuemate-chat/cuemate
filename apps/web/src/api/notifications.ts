// 站内信 API
import { http } from './http';

// 通知类型定义
export interface Notification {
  id: number;
  user_id: number;
  title: string;
  content: string;
  summary?: string;
  type:
    | 'job_created'
    | 'question_created'
    | 'interview_report'
    | 'knowledge_synced'
    | 'model_added'
    | 'license_imported'
    | 'license_expire'
    | 'ad_expire'
    | 'task_success'
    | 'task_failed';
  category: 'job' | 'question' | 'interview' | 'knowledge' | 'model' | 'license' | 'ad' | 'system';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_read: number; // 0: 未读, 1: 已读
  is_starred: number; // 0: 未标星, 1: 已标星
  resource_type?: string;
  resource_id?: string;
  action_url?: string;
  action_text?: string;
  metadata?: string;
  expire_at?: number;
  created_at: number;
  read_at?: number;
  starred_at?: number;
}

// 获取通知列表
export async function fetchNotifications(params?: {
  type?: string;
  is_read?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{
  notifications: Notification[];
  unreadCount: number;
  total: number;
}> {
  try {
    const queryParams: any = {};
    if (params?.type) queryParams.type = params.type;
    if (params?.is_read !== undefined) queryParams.is_read = params.is_read;
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.offset) queryParams.offset = params.offset;

    const response = await http.get<{
      notifications: Notification[];
      unreadCount: number;
      total: number;
    }>('/api/notifications', { params: queryParams });
    return response;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return { notifications: [], unreadCount: 0, total: 0 };
  }
}

// 获取未读通知数量
export async function fetchUnreadCount(): Promise<number> {
  try {
    const response = await http.get<{ count: number }>('/api/notifications/unread-count');
    return response.count;
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return 0;
  }
}

// 标记通知为已读
export async function markNotificationAsRead(id: number): Promise<boolean> {
  try {
    await http.put(`/api/notifications/${id}/read`);
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
}

// 标记所有通知为已读
export async function markAllNotificationsAsRead(): Promise<boolean> {
  try {
    await http.put('/api/notifications/read-all');
    return true;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }
}

// 标记通知为星标
export async function toggleNotificationStar(id: number, starred: boolean): Promise<boolean> {
  try {
    await http.put(`/api/notifications/${id}/star`, { starred });
    return true;
  } catch (error) {
    console.error('Error toggling notification star:', error);
    return false;
  }
}

// 创建通知
export async function createNotification(data: {
  userId: string;
  title: string;
  content: string;
  summary?: string;
  type: string;
  category: string;
  priority?: string;
  resourceType?: string;
  resourceId?: string;
  actionUrl?: string;
  actionText?: string;
  metadata?: any;
  expireAt?: number;
}): Promise<{ success: boolean; id?: number }> {
  try {
    const response = await http.post<{ success: boolean; id: number }>('/api/notifications', data);
    return response;
  } catch (error) {
    console.error('Error creating notification:', error);
    return { success: false };
  }
}

// 获取通知类型的显示信息
export function getNotificationTypeInfo(type: string): {
  label: string;
  color: string;
  icon: string;
} {
  const typeMap: Record<
    string,
    {
      label: string;
      color: string;
      icon: string;
    }
  > = {
    job_created: { label: '岗位创建', color: 'text-blue-700 bg-blue-50', icon: '💼' },
    question_created: { label: '押题创建', color: 'text-green-700 bg-green-50', icon: '📝' },
    interview_report: { label: '面试报告', color: 'text-purple-700 bg-purple-50', icon: '📊' },
    knowledge_synced: { label: '知识库同步', color: 'text-cyan-700 bg-cyan-50', icon: '🔄' },
    model_added: { label: '模型添加', color: 'text-indigo-700 bg-indigo-50', icon: '🤖' },
    license_imported: { label: '许可证导入', color: 'text-green-700 bg-green-50', icon: '✅' },
    license_expire: { label: '许可证到期', color: 'text-orange-700 bg-orange-50', icon: '⚠️' },
    ad_expire: { label: '广告到期', color: 'text-amber-700 bg-amber-50', icon: '📢' },
    task_success: { label: '任务成功', color: 'text-green-700 bg-green-50', icon: '✨' },
    task_failed: { label: '任务失败', color: 'text-red-700 bg-red-50', icon: '❌' },
  };

  return typeMap[type] || { label: '其他', color: 'text-slate-700 bg-slate-50', icon: '📌' };
}

// 获取优先级的显示信息
export function getPriorityInfo(priority: string): {
  label: string;
  color: string;
} {
  const priorityMap: Record<string, { label: string; color: string }> = {
    low: { label: '低', color: 'text-slate-600' },
    normal: { label: '普通', color: 'text-blue-600' },
    high: { label: '高', color: 'text-orange-600' },
    urgent: { label: '紧急', color: 'text-red-600' },
  };

  return priorityMap[priority] || priorityMap.normal;
}
