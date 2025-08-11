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
        <nav className="flex items-center space-x-6 text-[#3b82f6] text-sm">
          <Link to="/home" className="hover:text-[#4f46e5]">首页</Link>
          <Link to="/tasks" className="hover:text-[#4f46e5]">任务</Link>
          <Link to="/settings" className="hover:text-[#4f46e5]">设置</Link>
        </nav>
        <div className="ml-4 relative">
          <UserMenu />
        </div>
      </header>

      {/* RouterView */}
      <main className="flex-1 container mx-auto px-6 py-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="h-12 flex items-center justify-center text-xs text-slate-500 border-t border-slate-200 bg-white">
        © {new Date().getFullYear()} CueMate. All rights reserved.
      </footer>
    </div>
  );
}


