// 版本管理 API - 通过后端获取腾讯云 COS 版本信息
import { http } from './http';

// 版本信息接口定义
export interface VersionInfo {
  name: string;
  version: string;
  buildId?: string;
  createTime: string;
  updateType?: string;
  platforms?: string[];
  dependencies?: Record<string, string>;
  desc: string[];
  maintainer?: {
    name: string;
    email: string;
    github?: string;
    tm?: string;
    vx?: string;
  };
  checksum?: Array<{
    file: string;
    sha256: string;
  }>;
  changelogUrl?: string;
}

// 获取版本列表
export async function fetchVersionList(): Promise<VersionInfo[]> {
  try {
    const response = await http.get<{ versions: VersionInfo[] }>('/api/versions');
    return response.versions || [];
  } catch {
    return [];
  }
}

// 获取单个版本详情
export async function fetchVersionDetail(version: string): Promise<VersionInfo | null> {
  try {
    const response = await http.get<VersionInfo>(`/api/versions/${version}`);
    return response;
  } catch {
    return null;
  }
}

// 解析描述文本中的 commit 类型
export function parseCommitType(desc: string): {
  type: 'feat' | 'fix' | 'refactor' | 'chore' | 'docs' | 'style' | 'perf' | 'test' | 'other';
  scope?: string;
  message: string;
} {
  // 匹配 type(scope): message 格式，支持前面有序号如 "1. feat(install): ..."
  const match = desc.match(/^(?:\d+\.\s*)?(feat|fix|refactor|chore|docs|style|perf|test)\(([^)]+)\):\s*(.+)$/);

  if (match) {
    return {
      type: match[1] as any,
      scope: match[2],
      message: match[3],
    };
  }

  // 如果不匹配标准格式,返回 other 类型
  return {
    type: 'other',
    message: desc,
  };
}

// 获取 commit 类型的显示信息
export function getCommitTypeInfo(type: string): {
  label: string;
  color: string;
  bgColor: string;
} {
  const typeMap: Record<string, { label: string; color: string; bgColor: string }> = {
    feat: {
      label: '新功能',
      color: 'text-green-700 dark:text-green-300',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    fix: {
      label: '修复',
      color: 'text-red-700 dark:text-red-300',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
    },
    refactor: {
      label: '重构',
      color: 'text-blue-700 dark:text-blue-300',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    chore: {
      label: '构建',
      color: 'text-gray-700 dark:text-gray-300',
      bgColor: 'bg-gray-50 dark:bg-gray-800',
    },
    docs: {
      label: '文档',
      color: 'text-purple-700 dark:text-purple-300',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
    style: {
      label: '样式',
      color: 'text-pink-700 dark:text-pink-300',
      bgColor: 'bg-pink-50 dark:bg-pink-900/20',
    },
    perf: {
      label: '性能',
      color: 'text-orange-700 dark:text-orange-300',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    },
    test: {
      label: '测试',
      color: 'text-yellow-700 dark:text-yellow-300',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    },
    other: {
      label: '其他',
      color: 'text-slate-700 dark:text-slate-300',
      bgColor: 'bg-slate-50 dark:bg-slate-700',
    },
  };

  return typeMap[type] || typeMap.other;
}
