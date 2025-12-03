import { ClockIcon, TagIcon, CubeIcon } from '@heroicons/react/24/outline';
import { Button } from 'antd';
import type { VersionInfo } from '../../api/versions';
import { parseCommitType } from '../../api/versions';
import DrawerProvider, { DrawerContent, DrawerFooter, DrawerHeader } from '../../components/DrawerProvider';

interface VersionListDrawerProps {
  open: boolean;
  versions: VersionInfo[];
  loading: boolean;
  currentVersion: string;
  onClose: () => void;
  onSelectVersion: (version: VersionInfo) => void;
}

export default function VersionListDrawer({
  open,
  versions,
  loading,
  currentVersion,
  onClose,
  onSelectVersion,
}: VersionListDrawerProps) {

  // 格式化日期
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // 统计版本更新类型
  const getVersionStats = (version: VersionInfo) => {
    const stats = {
      feat: 0,
      fix: 0,
      refactor: 0,
      other: 0,
    };

    version.desc.forEach((desc) => {
      const parsed = parseCommitType(desc);
      if (parsed.type === 'feat') stats.feat++;
      else if (parsed.type === 'fix') stats.fix++;
      else if (parsed.type === 'refactor') stats.refactor++;
      else stats.other++;
    });

    return stats;
  };

  return (
    <DrawerProvider open={open} onClose={onClose} width="65%">
      <DrawerHeader>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <ClockIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">版本历史</h2>
              <p className="text-xs text-slate-600 dark:text-slate-300">共 {versions.length} 个版本</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg">
            <span className="text-xs text-slate-500 dark:text-slate-400">当前版本</span>
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{currentVersion}</span>
          </div>
        </div>
      </DrawerHeader>
      <DrawerContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
              <span className="text-slate-600 dark:text-slate-300">加载版本信息中...</span>
            </div>
          ) : versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400">
              <ClockIcon className="w-16 h-16 mb-4 text-slate-300" />
              <p className="text-lg font-medium">暂无版本信息</p>
              <p className="text-sm mt-2">版本信息将在发布后显示</p>
            </div>
          ) : (
            <div className="space-y-4">
              {versions.map((version, index) => {
                const stats = getVersionStats(version);
                const isLatest = index === 0;

                return (
                  <div
                    key={version.version}
                    onClick={() => onSelectVersion(version)}
                    className="group relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:border-blue-300 hover:shadow-lg transition-all duration-200 cursor-pointer"
                  >
                    {/* 最新版本角标 */}
                    {isLatest && (
                      <div className="absolute -top-2 -right-2">
                        <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                          最新版本
                        </div>
                      </div>
                    )}

                    {/* 版本号和时间 */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <TagIcon className="w-6 h-6 text-blue-500 group-hover:text-blue-600 transition-colors" />
                        <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 transition-colors">
                          {version.version}
                        </span>
                        {isLatest && (
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                        <ClockIcon className="w-4 h-4" />
                        <span>{formatDate(version.create_time)}</span>
                      </div>
                    </div>

                    {/* 版本名称 */}
                    <div className="mb-3 flex items-center gap-2">
                      <CubeIcon className="w-5 h-5 text-slate-500 group-hover:text-blue-500 transition-colors" />
                      <span className="text-base font-medium text-slate-700 dark:text-slate-200">{version.name}</span>
                    </div>

                    {/* 更新统计标签 */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {stats.feat > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-xs font-medium rounded-full">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                          {stats.feat} 个新功能
                        </span>
                      )}
                      {stats.fix > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-xs font-medium rounded-full">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                          {stats.fix} 个修复
                        </span>
                      )}
                      {stats.refactor > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
                          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                          {stats.refactor} 个优化
                        </span>
                      )}
                      {stats.other > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-full">
                          <span className="w-1.5 h-1.5 bg-slate-500 rounded-full"></span>
                          {stats.other} 个其他
                        </span>
                      )}
                    </div>

                    {/* 悬停提示 */}
                    <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs text-blue-600 font-medium">点击查看详情 →</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </DrawerContent>
      <DrawerFooter>
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>关闭</Button>
        </div>
      </DrawerFooter>
    </DrawerProvider>
  );
}
