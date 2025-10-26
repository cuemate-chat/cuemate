import React from 'react';

interface PageLoadingProps {
  tip?: string;
  subtitle?: string;
  type?: 'default' | 'saving' | 'testing' | 'loading';
}

const PageLoading: React.FC<PageLoadingProps> = ({
  tip = '加载中...',
  subtitle = '请稍候，这可能需要几秒钟',
  type = 'loading',
}) => {
  const getIcon = () => {
    switch (type) {
      case 'saving':
        return (
          <div className="relative">
            {/* 外圈旋转 */}
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            {/* 内圈反向旋转 */}
            <div className="absolute inset-2 w-12 h-12 border-4 border-transparent border-t-blue-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            {/* 中心点 */}
            <div className="absolute inset-6 w-4 h-4 bg-blue-600 rounded-full animate-pulse"></div>
          </div>
        );
      case 'testing':
        return (
          <div className="relative">
            {/* 脉冲圆圈 */}
            <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
            {/* 连接线动画 */}
            <div className="absolute inset-0 w-16 h-16">
              <div className="absolute top-0 left-1/2 w-0.5 h-8 bg-gradient-to-b from-green-400 to-transparent animate-pulse"></div>
              <div className="absolute bottom-0 left-1/2 w-0.5 h-8 bg-gradient-to-t from-green-400 to-transparent animate-pulse" style={{ animationDelay: '0.5s' }}></div>
              <div className="absolute left-0 top-1/2 w-8 h-0.5 bg-gradient-to-r from-green-400 to-transparent animate-pulse" style={{ animationDelay: '1s' }}></div>
              <div className="absolute right-0 top-1/2 w-8 h-0.5 bg-gradient-to-l from-green-400 to-transparent animate-pulse" style={{ animationDelay: '1.5s' }}></div>
            </div>
          </div>
        );
      case 'loading':
        return (
          <div className="relative">
            {/* 三环旋转 */}
            <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
            <div className="absolute inset-2 w-12 h-12 border-4 border-purple-300 border-t-purple-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.2s' }}></div>
            <div className="absolute inset-4 w-8 h-8 border-4 border-purple-400 border-t-purple-400 rounded-full animate-spin" style={{ animationDuration: '0.8s' }}></div>
          </div>
        );
      default:
        return (
          <div className="relative">
            {/* 默认旋转圆圈 */}
            <div className="w-16 h-16 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
            {/* 中心点 */}
            <div className="absolute inset-6 w-4 h-4 bg-blue-600 rounded-full animate-pulse"></div>
          </div>
        );
    }
  };

  const getColors = () => {
    switch (type) {
      case 'saving':
        return 'text-blue-600';
      case 'testing':
        return 'text-green-600';
      case 'loading':
        return 'text-purple-600';
      default:
        return 'text-blue-600';
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm transition-all duration-300">
      {/* 背景动画 */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10 animate-pulse"></div>
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-green-500/10 via-transparent to-yellow-500/10 animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* 主要内容 */}
      <div className="relative flex items-center justify-center min-h-screen">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-white/20 transform transition-all duration-300 hover:scale-105">
          {/* 图标区域 */}
          <div className="flex justify-center mb-6">
            {getIcon()}
          </div>

          {/* 文字区域 */}
          <div className="text-center">
            <h3 className={`text-xl font-semibold mb-2 ${getColors()}`}>
              {tip}
            </h3>
            <p className="text-slate-600 text-sm max-w-xs">
              {subtitle}
            </p>
          </div>

          {/* 底部装饰 */}
          <div className="mt-6 flex justify-center">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* 边缘光效 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-transparent rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-purple-400/20 to-transparent rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>
    </div>
  );
};

export default PageLoading;
