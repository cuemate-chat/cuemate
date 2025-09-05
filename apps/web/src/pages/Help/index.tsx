import React from 'react';

export default function Help() {
  // 直接跳转到外部帮助文档
  React.useEffect(() => {
    // 检测是否在 Electron 环境中
    if ((window as any).electronAPI && typeof (window as any).electronAPI.openExternalUrl === 'function') {
      // 在 Electron 中使用外部浏览器打开
      (window as any).electronAPI.openExternalUrl('https://docs.cuemate.chat');
    } else {
      // 在普通浏览器中正常打开
      window.open('https://docs.cuemate.chat', '_blank');
    }
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
