import { PropsWithChildren } from 'react';
import { useLocation } from 'react-router-dom';
import heroBg from '../assets/home.png';

export default function MainView({ children }: PropsWithChildren) {
  const { pathname } = useLocation();

  const isHome = pathname.startsWith('/home');

  if (isHome) {
    return (
      <main className="flex-1 px-0 py-0 overflow-hidden">
        <div className="relative" style={{ height: 'calc(100vh - 56px - 48px)' }}>
          {/* 背景图：固定定位，严格铺满中央区域，避免横向/纵向滚动 */}
          <div
            className="fixed left-0 right-0 z-0 bg-cover bg-center bg-no-repeat"
            style={{ top: '56px', height: 'calc(100vh - 56px - 48px)', backgroundImage: `url(${heroBg})` }}
          />
          {/* 柔化蒙版 */}
          <div
            className="fixed left-0 right-0 z-10 pointer-events-none bg-white/45 backdrop-blur-sm"
            style={{ top: '56px', height: 'calc(100vh - 56px - 48px)' }}
          />
          {/* 页面内容（占满高度，不产生外部滚动） */}
          <div className="relative z-20 container px-6 py-6 h-full overflow-hidden flex flex-col justify-center">
            {children}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 container px-6 py-6">
      {children}
    </main>
  );
}


