import { ArrowPathRoundedSquareIcon, ChatBubbleLeftRightIcon, HomeIcon, ListBulletIcon, PlusCircleIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { Link, Outlet } from 'react-router-dom';
import Logo from '../assets/logo-background.png';
import UserMenu from './UserMenu';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      {/* NavBar */}
      <header className="h-14 px-6 flex items-center justify-between border-b border-slate-200 bg-[#e5eefc] text-[#3b82f6] sticky top-0 z-[2000]">
        <div className="flex items-center space-x-3">
          <span className="font-semibold text-slate-800">
             <img src={Logo} alt="CueMate" className="h-8 bg-transparent" />
          </span>
        </div>
        <nav className="container flex items-center justify-center gap-8 text-[#3b82f6] text-sm">
          <Link to="/home" className="hover:text-[#1d4ed8] flex items-center gap-2">
            <HomeIcon className="w-5 h-5" />
            主页
          </Link>
          <Link to="/jobs/new" className="hover:text-[#1d4ed8] flex items-center gap-2">
            <PlusCircleIcon className="w-5 h-5" />
            新建岗位
          </Link>
          <Link to="/jobs" className="hover:text-[#1d4ed8] flex items-center gap-2">
            <ListBulletIcon className="w-5 h-5" />
            岗位列表
          </Link>
          <Link to="/prompts" className="hover:text-[#1d4ed8] flex items-center gap-2">
            <ChatBubbleLeftRightIcon className="w-5 h-5" />
            面试押题
          </Link>
          <Link to="/reviews" className="hover:text-[#1d4ed8] flex items-center gap-2">
            <ArrowPathRoundedSquareIcon className="w-5 h-5" />
            面试复盘
          </Link>
          <Link to="/help" className="hover:text-[#1d4ed8] flex items-center gap-2">
            <QuestionMarkCircleIcon className="w-5 h-5" />
            帮助中心
          </Link>
        </nav>
        <div className="ml-4 relative">
          <UserMenu />
        </div>
      </header>

      {/* RouterView */}
      <main className="flex-1 container px-6 py-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="h-12 flex items-center justify-center text-xs text-slate-500 border-t border-slate-200 bg-white">
        © {new Date().getFullYear()} CueMate. All rights reserved.
      </footer>
    </div>
  );
}


