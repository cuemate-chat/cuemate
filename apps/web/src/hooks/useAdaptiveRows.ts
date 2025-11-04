import { useEffect, useState } from 'react';

export interface AdaptiveRowsConfig {
  small: number;   // 768px 以下
  medium: number;  // 768-900px
  large: number;   // 900-1080px
  xlarge: number;  // 1080px 及以上
}

/**
 * 自适应文本域行数 Hook
 * 根据屏幕高度自动计算合适的文本域行数
 */
export function useAdaptiveRows(config: AdaptiveRowsConfig): number {
  const [rows, setRows] = useState<number>(config.medium);

  useEffect(() => {
    const calculateRows = () => {
      const viewportHeight = window.innerHeight;
      
      if (viewportHeight >= 1080) {
        setRows(config.xlarge);
      } else if (viewportHeight >= 900) {
        setRows(config.large);
      } else if (viewportHeight >= 768) {
        setRows(config.medium);
      } else {
        setRows(config.small);
      }
    };

    calculateRows();
    window.addEventListener('resize', calculateRows);
    return () => window.removeEventListener('resize', calculateRows);
  }, [config]);

  return rows;
}

/**
 * 多字段自适应行数 Hook
 * 用于同时管理多个文本域的行数
 */
export function useMultiAdaptiveRows<T extends Record<string, AdaptiveRowsConfig>>(
  configs: T
): Record<keyof T, number> {
  const [allRows, setAllRows] = useState<Record<keyof T, number>>(
    Object.keys(configs).reduce((acc, key) => {
      acc[key as keyof T] = configs[key as keyof T].medium;
      return acc;
    }, {} as Record<keyof T, number>)
  );

  useEffect(() => {
    const calculateAllRows = () => {
      const viewportHeight = window.innerHeight;
      const newRows = {} as Record<keyof T, number>;

      for (const [key, config] of Object.entries(configs)) {
        if (viewportHeight >= 1080) {
          newRows[key as keyof T] = config.xlarge;
        } else if (viewportHeight >= 900) {
          newRows[key as keyof T] = config.large;
        } else if (viewportHeight >= 768) {
          newRows[key as keyof T] = config.medium;
        } else {
          newRows[key as keyof T] = config.small;
        }
      }

      setAllRows(newRows);
    };

    calculateAllRows();
    window.addEventListener('resize', calculateAllRows);
    return () => window.removeEventListener('resize', calculateAllRows);
  }, [configs]);

  return allRows;
}

// 预设的常用配置
export const adaptiveRowsPresets = {
  // 短文本：标题、简短说明
  short: {
    small: 2,
    medium: 3,
    large: 3,
    xlarge: 4,
  },
  // 中等文本：问题、简历摘要  
  medium: {
    small: 5,
    medium: 6,
    large: 7,
    xlarge: 8,
  },
  // 长文本：详细描述、文章内容
  long: {
    small: 8,
    medium: 10,
    large: 12,
    xlarge: 15,
  },
  // 超长文本：岗位描述、简历全文
  extraLong: {
    small: 12,
    medium: 15,
    large: 18,
    xlarge: 22,
  },
} as const;