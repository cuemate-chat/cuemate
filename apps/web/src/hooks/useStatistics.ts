import { useEffect, useState } from 'react';

// 统计数据类型定义
export interface StatisticsData {
  offers_count: string;
  mock_interviews: string;
  companies_joined: string;
  success_rate: string;
  practice_hours: string;
}

// 默认数据（兜底）
const DEFAULT_STATISTICS: StatisticsData = {
  offers_count: '100',
  mock_interviews: '860',
  companies_joined: '75',
  success_rate: '85%',
  practice_hours: '2000',
};

// LocalStorage 键名
const STORAGE_KEY = 'cuemate_statistics';
const STORAGE_TIMESTAMP_KEY = 'cuemate_statistics_timestamp';

// 统计数据 API 基础 URL
const STATISTICS_API_URL = 'https://stats.cuemate.chat/api/v1/statistics/summary';

/**
 * 从 localStorage 获取缓存的统计数据
 */
function getCachedStatistics(): StatisticsData | null {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // 静默处理
  }
  return null;
}

/**
 * 保存统计数据到 localStorage
 */
function setCachedStatistics(data: StatisticsData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(STORAGE_TIMESTAMP_KEY, Date.now().toString());
  } catch {
    // 静默处理
  }
}

/**
 * 从 API 获取统计数据
 */
async function fetchStatistics(): Promise<StatisticsData | null> {
  try {
    const response = await fetch(STATISTICS_API_URL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000), // 5 秒超时
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json();

    if (result.success && result.data && result.data.stats) {
      const stats = result.data.stats;
      const statsMap: Record<string, any> = {};

      stats.forEach((stat: any) => {
        statsMap[stat.key] = stat.value;
      });

      return {
        offers_count: statsMap.offers_count || DEFAULT_STATISTICS.offers_count,
        mock_interviews: statsMap.mock_interviews || DEFAULT_STATISTICS.mock_interviews,
        companies_joined: statsMap.companies_joined || DEFAULT_STATISTICS.companies_joined,
        success_rate: statsMap.success_rate || DEFAULT_STATISTICS.success_rate,
        practice_hours: statsMap.practice_hours || DEFAULT_STATISTICS.practice_hours,
      };
    }

    return null;
  } catch {
    // 静默处理，自动降级
    return null;
  }
}

/**
 * 统计数据 Hook
 *
 * 数据获取优先级：
 * 1. API 调用（每分钟刷新一次）
 * 2. LocalStorage 缓存
 * 3. 默认写死的值
 */
export function useStatistics() {
  const [statistics, setStatistics] = useState<StatisticsData>(DEFAULT_STATISTICS);
  const [loading, setLoading] = useState(true);

  // 加载统计数据
  const loadStatistics = async () => {
    // 1. 尝试从 API 获取
    const apiData = await fetchStatistics();
    if (apiData) {
      setStatistics(apiData);
      setCachedStatistics(apiData); // 保存到 localStorage
      setLoading(false);
      return;
    }

    // 2. 降级使用 localStorage 缓存
    const cachedData = getCachedStatistics();
    if (cachedData) {
      setStatistics(cachedData);
      setLoading(false);
      return;
    }

    // 3. 降级使用默认值
    setStatistics(DEFAULT_STATISTICS);
    setLoading(false);
  };

  // 初始加载
  useEffect(() => {
    loadStatistics();
  }, []);

  // 每分钟刷新一次
  useEffect(() => {
    const interval = setInterval(() => {
      loadStatistics();
    }, 60000); // 60 秒

    return () => clearInterval(interval);
  }, []);

  return { statistics, loading };
}
