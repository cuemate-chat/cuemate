/**
 * 托盘菜单数据服务
 * 负责获取托盘菜单所需的统计数据和用户设置
 */

const API_BASE_URL = 'http://localhost:3001';

// 缓存 token
let cachedToken: string | null = null;

/**
 * 获取用户 token
 */
async function getToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  try {
    const result = await (window as any).electronAPI?.getUserData?.();
    if (result?.success && result.userData?.token) {
      cachedToken = result.userData.token;
      return cachedToken;
    }
  } catch (error) {
    console.error('获取用户 token 失败:', error);
  }
  return null;
}

/**
 * 获取请求头（带 Authorization）
 */
async function getHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * 模型数据类型
 */
interface Model {
  id: string;
  name: string;
  provider: string;
  model_name: string;
  icon?: string;
  type: string;
  is_enabled: number;
}

/**
 * 用户设置类型
 */
interface UserSettings {
  theme?: string;
  locale?: string;
  selected_model_id?: string;
}

/**
 * 向量知识库同步状态接口返回类型
 */
interface VectorSyncStatus {
  job?: {
    total: number;
    synced: number;
    unsynced: number;
  };
  resume?: {
    total: number;
    synced: number;
    unsynced: number;
  };
  questions?: {
    total: number;
    synced: number;
    unsynced: number;
  };
}

/**
 * 训练统计数据接口返回类型
 */
interface TrainingStatsResponse {
  success: boolean;
  data?: {
    trainingCount: number; // 训练总数
    totalHours: number; // 总时长（小时）
    avgConversations: number; // 平均对话数
  };
}

/**
 * 获取向量知识库同步状态
 */
export async function getVectorSyncStatus(): Promise<{ synced: number; total: number }> {
  try {
    const response = await fetch(`${API_BASE_URL}/vectors/sync-status`, {
      method: 'GET',
      headers: await getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: VectorSyncStatus = await response.json();

    // 计算总的已同步和总数据量
    const totalSynced =
      (data.job?.synced || 0) + (data.resume?.synced || 0) + (data.questions?.synced || 0);
    const totalCount =
      (data.job?.total || 0) + (data.resume?.total || 0) + (data.questions?.total || 0);

    return { synced: totalSynced, total: totalCount };
  } catch (error) {
    console.error('获取向量同步状态失败:', error);
    return { synced: 0, total: 0 };
  }
}

/**
 * 获取用户训练统计数据
 */
export async function getTrainingStats(): Promise<{
  interviews: number;
  hours: number;
  conversations: number;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/user-training-stats`, {
      method: 'GET',
      headers: await getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: TrainingStatsResponse = await response.json();

    if (result.success && result.data) {
      return {
        interviews: result.data.trainingCount || 0,
        hours: result.data.totalHours || 0,
        conversations: result.data.avgConversations || 0,
      };
    }

    return { interviews: 0, hours: 0, conversations: 0 };
  } catch (error) {
    console.error('获取训练统计数据失败:', error);
    return { interviews: 0, hours: 0, conversations: 0 };
  }
}

/**
 * 获取用户设置
 */
export async function getUserSettings(): Promise<UserSettings> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: await getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    if (result.user) {
      return {
        theme: result.user.theme || 'light',
        locale: result.user.locale || 'zh-CN',
        selected_model_id: result.user.selected_model_id || '',
      };
    }
    return { theme: 'light', locale: 'zh-CN', selected_model_id: '' };
  } catch (error) {
    console.error('获取用户设置失败:', error);
    return { theme: 'light', locale: 'zh-CN', selected_model_id: '' };
  }
}

/**
 * 获取可用的模型列表
 */
export async function getModelList(): Promise<Model[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/models`, {
      method: 'GET',
      headers: await getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.list || [];
  } catch (error) {
    console.error('获取模型列表失败:', error);
    return [];
  }
}

/**
 * 更新用户设置
 */
export async function updateUserSettings(settings: UserSettings): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/update-setting`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(settings),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.success !== false;
  } catch (error) {
    console.error('更新用户设置失败:', error);
    return false;
  }
}
