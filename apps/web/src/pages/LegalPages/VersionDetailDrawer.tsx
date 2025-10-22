import { Button } from 'antd';
import type { VersionInfo } from '../../api/versions';
import { getCommitTypeInfo, parseCommitType } from '../../api/versions';
import { storage } from '../../api/http';
import { isVersionGreater } from '../../utils/version';
import DrawerProviderLevel2, { DrawerContent, DrawerFooter, DrawerHeader } from '../../components/DrawerProviderLevel2';

interface VersionDetailDrawerProps {
  open: boolean;
  version: VersionInfo | null;
  onClose: () => void;
  onBack: () => void;
  onUpdate?: (version: VersionInfo) => void;
}

export default function VersionDetailDrawer({
  open,
  version,
  onClose,
  onBack,
  onUpdate,
}: VersionDetailDrawerProps) {

  // 格式化日期
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // 按类型分组
  const groupedChanges = version?.desc.reduce((acc, desc) => {
    const parsed = parseCommitType(desc);
    if (!acc[parsed.type]) {
      acc[parsed.type] = [];
    }
    acc[parsed.type].push(parsed);
    return acc;
  }, {} as Record<string, Array<ReturnType<typeof parseCommitType>>>);

  if (!version) return null;

  // 获取当前用户版本
  const user = storage.getUser();
  const currentVersion = user?.version || 'v0.1.0';

  // 判断是否显示更新按钮: 只有当前版本 < 选中版本时才显示
  const showUpdateButton = isVersionGreater(version.version, currentVersion);

  return (
    <DrawerProviderLevel2 open={open} onClose={onClose} width="55%">
      <DrawerHeader>
        <div className="flex items-center gap-2">
          <button
            className="text-[#1d4ed8] hover:text-[#2563eb] hover:underline transition-colors"
            onClick={onBack}
          >
            返回版本列表
          </button>
          <span className="text-slate-400">→</span>
          <span className="font-medium">{version.version} 版本详情</span>
        </div>
      </DrawerHeader>

      <DrawerContent>
        <div className="space-y-6">
          {/* 版本信息卡片 */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200/50">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl font-bold text-slate-900">{version.version}</span>
                  <div className="px-3 py-1 bg-white/80 rounded-full">
                    <span className="text-sm font-medium text-blue-600">正式版本</span>
                  </div>
                </div>
                <p className="text-lg font-medium text-slate-700 mb-3">{version.name}</p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>发布时间: {formatDate(version.create_time)}</span>
              </div>

              {version.build_id && (
                <div className="flex items-center gap-2 text-slate-600">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span>构建ID: {version.build_id}</span>
                </div>
              )}

              {version.platforms && version.platforms.length > 0 && (
                <div className="flex items-start gap-2 text-slate-600">
                  <svg className="w-4 h-4 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <div className="flex flex-wrap gap-1">
                    <span>支持平台:</span>
                    {version.platforms.map((platform) => (
                      <span key={platform} className="px-2 py-0.5 bg-white/60 text-blue-700 rounded">
                        {platform}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 更新内容 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              更新内容
            </h3>

            {groupedChanges && Object.keys(groupedChanges).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(groupedChanges)
                  .sort(([a], [b]) => {
                    // 排序: feat > refactor > fix > 其他
                    const order = ['feat', 'refactor', 'fix'];
                    const aIdx = order.indexOf(a);
                    const bIdx = order.indexOf(b);
                    if (aIdx === -1 && bIdx === -1) return 0;
                    if (aIdx === -1) return 1;
                    if (bIdx === -1) return -1;
                    return aIdx - bIdx;
                  })
                  .map(([type, changes]) => {
                    const typeInfo = getCommitTypeInfo(type);
                    return (
                      <div key={type} className="space-y-2">
                        {/* 类型标题 */}
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 ${typeInfo.bgColor} ${typeInfo.color} text-sm font-semibold rounded-lg`}>
                            <span className="w-2 h-2 bg-current rounded-full"></span>
                            {typeInfo.label}
                          </span>
                          <span className="text-sm text-slate-500">({changes.length})</span>
                        </div>

                        {/* 变更列表 */}
                        <div className="space-y-2 pl-4">
                          {changes.map((change, idx) => (
                            <div key={idx} className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                              <div className="flex-shrink-0 w-1.5 h-1.5 bg-slate-400 rounded-full mt-2"></div>
                              <div className="flex-1 min-w-0">
                                {change.scope && (
                                  <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-medium rounded mb-1">
                                    {change.scope}
                                  </span>
                                )}
                                <p className="text-sm text-slate-700 leading-relaxed">{change.message}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <p>暂无更新内容</p>
              </div>
            )}
          </div>

          {/* 更新日志链接 */}
          {version.changelog_url && (
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <a
                href={version.changelog_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between text-blue-600 hover:text-blue-700 transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="font-medium">查看完整更新日志</span>
                </div>
                <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
            </div>
          )}

          {/* 依赖版本 */}
          {version.dependencies && Object.keys(version.dependencies).length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                依赖版本
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {Object.entries(version.dependencies).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                    <span className="text-slate-600 font-medium">{key}</span>
                    <span className="text-slate-800 font-mono text-xs">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 文件校验信息 */}
          {version.checksum && version.checksum.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                文件校验
              </h3>
              <div className="space-y-3">
                {version.checksum.map((item, index) => (
                  <div key={index} className="p-3 bg-slate-50 rounded-lg space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-medium">文件名:</span>
                      <span className="text-slate-800 font-mono text-xs">{item.file}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-slate-500 font-medium shrink-0">SHA256:</span>
                      <span className="text-slate-800 font-mono text-xs break-all">{item.sha256}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 维护者信息 */}
          {version.maintainer && (
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                维护者信息
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 min-w-16">姓名:</span>
                  <span className="text-slate-800">{version.maintainer.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 min-w-16">邮箱:</span>
                  <a href={`mailto:${version.maintainer.email}`} className="text-blue-600 hover:underline">
                    {version.maintainer.email}
                  </a>
                </div>
                {version.maintainer.github && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 min-w-16">GitHub:</span>
                    <a
                      href={version.maintainer.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {version.maintainer.github}
                    </a>
                  </div>
                )}
                {version.maintainer.tm && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 min-w-16">TM:</span>
                    <span className="text-slate-800">{version.maintainer.tm}</span>
                  </div>
                )}
                {version.maintainer.vx && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 min-w-16">VX:</span>
                    <span className="text-slate-800">{version.maintainer.vx}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 提示信息 */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-white text-xs font-bold">!</span>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-amber-800 mb-1">更新提示</h4>
                <p className="text-sm text-amber-700">
                  更新前请确保已备份重要数据,更新过程可能需要几分钟时间,请耐心等待。
                </p>
              </div>
            </div>
          </div>
        </div>
      </DrawerContent>

      <DrawerFooter>
        <div className="flex justify-end gap-2">
          <Button onClick={onBack}>返回列表</Button>
          {onUpdate && showUpdateButton && (
            <Button type="primary" onClick={() => onUpdate(version)}>
              更新到此版本
            </Button>
          )}
        </div>
      </DrawerFooter>
    </DrawerProviderLevel2>
  );
}
