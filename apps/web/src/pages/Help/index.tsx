import React from 'react';
import PageLoading from '../../components/PageLoading';

export default function Help() {
  // 直接跳转到外部帮助文档
  React.useEffect(() => {
    // 检测是否在 Electron 环境中
    if ((window as any).electronAPI && typeof (window as any).electronAPI.openExternalUrl === 'function') {
      // 在 Electron 中使用外部浏览器打开
      (window as any).electronAPI.openExternalUrl('https://cuemate.chat');
    } else {
      // 在普通浏览器中正常打开
      window.open('https://cuemate.chat', '_blank');
    }
    // 返回上一页
    window.history.back();
  }, []);

  return <PageLoading tip="正在跳转到帮助文档..." />;
}
