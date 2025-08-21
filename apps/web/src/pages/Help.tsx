import React from 'react';

export default function Help() {
  // 直接跳转到外部帮助文档
  React.useEffect(() => {
    window.open('https://docs.cuemate.chat', '_blank');
    // 返回上一页
    window.history.back();
  }, []);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-slate-600 text-sm">正在跳转到帮助文档...</p>
      </div>
    </div>
  );
}
