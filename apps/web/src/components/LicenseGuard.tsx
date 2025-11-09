import { DocumentTextIcon } from '@heroicons/react/24/outline';
import React from 'react';
import { useLicense } from '../hooks/useLicense';

interface LicenseGuardProps {
  children: React.ReactNode;
  feature?: string;
  fallback?: React.ReactNode;
}

export default function LicenseGuard({
  children,
  feature: _feature,
  fallback
}: LicenseGuardProps) {
  const { loading, isValid, isExpiringSoon } = useLicense();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-slate-600">检查授权状态...</span>
      </div>
    );
  }

  // 如果没有 license 或无效
  if (!isValid) {
    return fallback || (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="bg-white dark:bg-slate-800 rounded-xl border-2 border-red-200 dark:border-red-800 p-8 shadow-lg max-w-md">
          <div className="flex flex-col items-center">
            <DocumentTextIcon className="h-16 w-16 text-slate-400 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">需要有效授权</h3>
            <p className="text-slate-600 dark:text-slate-400 text-center mb-4">
              此功能需要有效的 License 授权才能使用
            </p>
            <a
              href="/settings/license"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              前往授权管理
            </a>
          </div>
        </div>
      </div>
    );
  }

  // 如果即将过期
  if (isExpiringSoon) {
    return fallback || (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="bg-white dark:bg-slate-800 rounded-xl border-2 border-amber-200 dark:border-amber-800 p-8 shadow-lg max-w-md">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-gradient-to-r from-amber-400 to-orange-400 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">License 即将过期</h3>
            <p className="text-slate-600 dark:text-slate-400 text-center mb-4">
              您的 License 即将过期，部分功能可能受限
            </p>
            <a
              href="/settings/license"
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
            >
              查看授权状态
            </a>
          </div>
        </div>
      </div>
    );
  }

  // 权限验证通过，显示内容
  return <>{children}</>;
}
