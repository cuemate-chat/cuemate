import {
  ArrowPathRoundedSquareIcon,
  Bars3Icon,
  ChatBubbleLeftRightIcon,
  HomeIcon,
  ListBulletIcon,
  PlusCircleIcon,
  QuestionMarkCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Logo from '../assets/logo-background.png';
import UserMenu from './UserMenu';

export default function Header() {
  const { pathname } = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getActiveKey = (): string | null => {
    if (pathname.startsWith('/settings')) return null;
    if (pathname === '/' || pathname.startsWith('/home')) return '/home';
    if (pathname.startsWith('/jobs/new')) return '/jobs/new';
    if (pathname.startsWith('/jobs')) return '/jobs';
    if (pathname.startsWith('/questions')) return '/questions';
    if (pathname.startsWith('/reviews')) return '/reviews';
    if (pathname.startsWith('/help')) return '/help';
    return '/home';
  };
  const activeKey = getActiveKey();

  // 桌面端链接样式
  const desktopLinkCls = (key: string) =>
    `flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-[6px] rounded-lg transition-all duration-200 text-xs sm:text-sm whitespace-nowrap ${
      activeKey === key
        ? 'bg-[rgba(59,130,246,0.12)] text-[#1d4ed8] font-medium shadow-sm'
        : 'text-[#3b82f6] hover:text-[#1d4ed8] hover:bg-[rgba(59,130,246,0.08)]'
    }`;

  // 移动端链接样式
  const mobileLinkCls = (key: string) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-base ${
      activeKey === key
        ? 'bg-[rgba(59,130,246,0.12)] text-[#1d4ed8] font-medium shadow-sm'
        : 'text-[#3b82f6] hover:text-[#1d4ed8] hover:bg-[rgba(59,130,246,0.08)]'
    }`;

  const navigationItems = [
    { to: '/home', icon: HomeIcon, label: '主页' },
    { to: '/jobs/new', icon: PlusCircleIcon, label: '新建岗位' },
    { to: '/jobs', icon: ListBulletIcon, label: '岗位列表' },
    { to: '/questions', icon: ChatBubbleLeftRightIcon, label: '面试押题' },
    { to: '/reviews', icon: ArrowPathRoundedSquareIcon, label: '面试复盘' },
    { to: '/help', icon: QuestionMarkCircleIcon, label: '帮助中心' },
  ];

  return (
    <>
      <header className="h-14 px-3 sm:px-6 flex items-center justify-between border-b border-slate-200 bg-[#e5eefc] text-[#3b82f6] sticky top-0 z-[2000]">
        {/* Logo 区域 */}
        <div className="flex items-center flex-shrink-0">
          <img src={Logo} alt="CueMate" className="h-6 sm:h-8 bg-transparent" />
        </div>

        {/* 桌面端导航 - 在大屏幕上显示 */}
        <nav className="hidden lg:flex items-center justify-center flex-1 max-w-4xl mx-4">
          <div className="flex items-center gap-2 xl:gap-4">
            {navigationItems.map(({ to, icon: Icon, label }) => (
              <Link key={to} to={to} className={desktopLinkCls(to)}>
                <Icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            ))}
          </div>
        </nav>

        {/* 中等屏幕导航 - 只显示图标 */}
        <nav className="hidden md:flex lg:hidden items-center justify-center flex-1 max-w-2xl mx-4">
          <div className="flex items-center gap-1">
            {navigationItems.map(({ to, icon: Icon, label }) => (
              <Link 
                key={to} 
                to={to} 
                className={desktopLinkCls(to)}
                title={label}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
              </Link>
            ))}
          </div>
        </nav>

        {/* 右侧用户菜单和移动端菜单按钮 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <UserMenu />
          
          {/* 移动端菜单按钮 */}
          <button
            className="md:hidden p-2 rounded-lg text-[#3b82f6] hover:bg-[rgba(59,130,246,0.08)] transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <XMarkIcon className="w-6 h-6" />
            ) : (
              <Bars3Icon className="w-6 h-6" />
            )}
          </button>
        </div>
      </header>

      {/* 移动端下拉菜单 */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#e5eefc] border-b border-slate-200 shadow-lg z-[1999]">
          <nav className="px-4 py-3 space-y-1">
            {navigationItems.map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                className={mobileLinkCls(to)}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{label}</span>
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
