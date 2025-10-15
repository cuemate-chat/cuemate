// 版本管理 API - 通过后端获取腾讯云 COS 版本信息
import { http } from './http';

// 版本信息接口定义
export interface VersionInfo {
  name: string;
  version: string;
  build_id?: string;
  create_time: string;
  update_type?: string;
  platforms?: string[];
  dependencies?: Record<string, string>;
  desc: string[];
  maintainer?: {
    name: string;
    email: string;
    github?: string;
  };
  checksum?: {
    file: string;
    sha256: string;
  };
  changelog_url?: string;
}

// 获取版本列表
export async function fetchVersionList(): Promise<VersionInfo[]> {
  try {
    const response = await http.get<{ versions: VersionInfo[] }>('/api/versions');
    return response.versions || [];
  } catch (error) {
    console.error('Error fetching version list:', error);
    return [];
  }
}

// 获取单个版本详情
export async function fetchVersionDetail(version: string): Promise<VersionInfo | null> {
  try {
    const response = await http.get<VersionInfo>(`/api/versions/${version}`);
    return response;
  } catch (error) {
    console.error(`Error fetching version ${version}:`, error);
    return null;
  }
}

// 解析描述文本中的 commit 类型
export function parseCommitType(desc: string): {
  type: 'feat' | 'fix' | 'refactor' | 'chore' | 'docs' | 'style' | 'perf' | 'test' | 'other';
  scope?: string;
  message: string;
} {
  // 匹配 type(scope): message 格式
  const match = desc.match(/^(feat|fix|refactor|chore|docs|style|perf|test)\(([^)]+)\):\s*(.+)$/);

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
    feat: { label: '新功能', color: 'text-green-700', bgColor: 'bg-green-50' },
    fix: { label: '修复', color: 'text-red-700', bgColor: 'bg-red-50' },
    refactor: { label: '重构', color: 'text-blue-700', bgColor: 'bg-blue-50' },
    chore: { label: '构建', color: 'text-gray-700', bgColor: 'bg-gray-50' },
    docs: { label: '文档', color: 'text-purple-700', bgColor: 'bg-purple-50' },
    style: { label: '样式', color: 'text-pink-700', bgColor: 'bg-pink-50' },
    perf: { label: '性能', color: 'text-orange-700', bgColor: 'bg-orange-50' },
    test: { label: '测试', color: 'text-yellow-700', bgColor: 'bg-yellow-50' },
    other: { label: '其他', color: 'text-slate-700', bgColor: 'bg-slate-50' },
  };

  return typeMap[type] || typeMap.other;
}
