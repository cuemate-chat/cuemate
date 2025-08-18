import { ArrowPathRoundedSquareIcon, ChatBubbleLeftRightIcon, HomeIcon, ListBulletIcon, PlusCircleIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { Link, Outlet, useLocation } from 'react-router-dom';
import Logo from '../assets/logo-background.png';
import AppFooter from './Footer';
import MainView from './Main';
import UserMenu from './UserMenu';

export default function Layout() {
  const { pathname } = useLocation();

  const getActiveKey = (): string | null => {
    if (pathname.startsWith('/settings')) return null; // 账户 & 设置 页面不选中任何菜单
    if (pathname === '/' || pathname.startsWith('/home')) return '/home';
    if (pathname.startsWith('/jobs/new')) return '/jobs/new';
    if (pathname.startsWith('/jobs')) return '/jobs';
    if (pathname.startsWith('/questions')) return '/questions';
    if (pathname.startsWith('/reviews')) return '/reviews';
    if (pathname.startsWith('/help')) return '/help';
    return '/home';
  };
  const activeKey = getActiveKey();

  const linkCls = (key: string) =>
    `flex items-center gap-2 px-3 py-[6px] rounded-lg transition-colors ${
      activeKey === key
        ? 'bg-[rgba(59,130,246,0.12)] text-[#1d4ed8] font-medium shadow-sm'
        : 'text-[#3b82f6] hover:text-[#1d4ed8] hover:bg-[rgba(59,130,246,0.08)]'
    }`;
  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      {/* NavBar */}
      <header className="h-14 px-6 flex items-center justify-between border-b border-slate-200 bg-[#e5eefc] text-[#3b82f6] sticky top-0 z-[2000]">
        <div className="flex items-center space-x-3">
          <span className="font-semibold text-slate-800">
             <img src={Logo} alt="CueMate" className="h-8 bg-transparent" />
          </span>
        </div>
        <nav className="container flex items-center justify-center gap-8 text-sm">
          <Link to="/home" className={linkCls('/home')}>
            <HomeIcon className="w-5 h-5" />
            主页
          </Link>
          <Link to="/jobs/new" className={linkCls('/jobs/new')}>
            <PlusCircleIcon className="w-5 h-5" />
            新建岗位
          </Link>
          <Link to="/jobs" className={linkCls('/jobs')}>
            <ListBulletIcon className="w-5 h-5" />
            岗位列表
          </Link>
          <Link to="/questions" className={linkCls('/questions')}>
            <ChatBubbleLeftRightIcon className="w-5 h-5" />
            面试押题
          </Link>
          <Link to="/reviews" className={linkCls('/reviews')}>
            <ArrowPathRoundedSquareIcon className="w-5 h-5" />
            面试复盘
          </Link>
          <Link to="/help" className={linkCls('/help')}>
            <QuestionMarkCircleIcon className="w-5 h-5" />
            帮助中心
          </Link>
        </nav>
        <div className="ml-4 relative">
          <UserMenu />
        </div>
      </header>

      {/* RouterView */}
      <MainView>
        <Outlet />
      </MainView>

      {/* Footer */}
      <AppFooter />
    </div>
  );
}


