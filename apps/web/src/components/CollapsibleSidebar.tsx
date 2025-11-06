import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { ReactNode } from 'react';

interface CollapsibleSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
  width?: string;
  collapsedWidth?: string;
  title?: string | ReactNode;
  className?: string;
}

export default function CollapsibleSidebar({
  isCollapsed,
  onToggle,
  children,
  width = 'w-80',
  collapsedWidth = 'w-12',
  title,
  className = '',
}: CollapsibleSidebarProps) {
  return (
    <div
      className={`relative transition-all duration-300 ease-in-out flex-shrink-0 ${
        isCollapsed ? collapsedWidth : width
      } ${className}`}
    >
      {/* 主要内容区域 */}
      <div
        className={`h-full bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all duration-300 ease-in-out ${
          isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        {!isCollapsed && (
          <div className="h-full flex flex-col">
            {title && (
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-800">
                <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                  {title}
                </h3>
              </div>
            )}
            <div className="flex-1 overflow-hidden">{children}</div>
          </div>
        )}
      </div>

      {/* 折叠状态的简化显示 */}
      {isCollapsed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="w-6 h-1 bg-slate-300 dark:bg-slate-600 rounded-full mb-2 animate-pulse"></div>
          <div className="w-4 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mb-1"></div>
          <div className="w-5 h-1 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
        </div>
      )}

      {/* 悬浮切换按钮 */}
      <button
        onClick={onToggle}
        className="absolute -right-4 top-1/2 transform -translate-y-1/2 z-20
                   w-8 h-8 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded-full shadow-lg
                   flex items-center justify-center transition-all duration-300
                   hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/50 dark:hover:to-indigo-900/50
                   hover:border-blue-400 hover:shadow-xl hover:scale-110
                   active:scale-95 group backdrop-blur-sm"
        title={isCollapsed ? '展开侧边栏' : '折叠侧边栏'}
      >
        {/* 按钮背景渐变效果 */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

        <div className="relative overflow-hidden w-5 h-5">
          {/* 展开图标 */}
          <ChevronRightIcon
            className={`absolute inset-0 w-5 h-5 text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all duration-300 transform ${
              isCollapsed ? 'translate-x-0 opacity-100 rotate-0' : 'translate-x-full opacity-0 rotate-180'
            }`}
          />
          {/* 折叠图标 */}
          <ChevronLeftIcon
            className={`absolute inset-0 w-5 h-5 text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all duration-300 transform ${
              isCollapsed ? '-translate-x-full opacity-0 -rotate-180' : 'translate-x-0 opacity-100 rotate-0'
            }`}
          />
        </div>

        {/* 按钮光圈效果 */}
        <div className="absolute inset-0 rounded-full border-2 border-blue-400/30 scale-150 opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300"></div>
      </button>

      {/* 侧边装饰条 */}
      <div
        className={`absolute right-0 top-4 bottom-4 w-1 bg-gradient-to-b from-blue-400 via-blue-500 to-indigo-600 rounded-l-lg transition-all duration-300 ${
          isCollapsed ? 'opacity-20 scale-y-50' : 'opacity-0 hover:opacity-30 scale-y-100'
        }`}
      ></div>

      {/* 折叠状态指示器 */}
      {isCollapsed && (
        <div className="absolute left-2 top-6 space-y-1">
          <div className="w-1 h-3 bg-blue-400 rounded-full animate-pulse"></div>
          <div className="w-1 h-2 bg-blue-300 rounded-full animate-pulse delay-150"></div>
          <div className="w-1 h-4 bg-blue-500 rounded-full animate-pulse delay-300"></div>
        </div>
      )}
    </div>
  );
}