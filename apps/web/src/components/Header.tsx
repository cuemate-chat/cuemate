import {
  ArrowPathRoundedSquareIcon,
  Bars3Icon,
  BellIcon,
  ChatBubbleLeftRightIcon,
  HomeIcon,
  ListBulletIcon,
  PlusCircleIcon,
  QuestionMarkCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Badge, Modal } from 'antd';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Logo from '../assets/logo-background.png';
import { fetchUnreadCount } from '../api/notifications';
import { storage } from '../api/http';
import UserMenu from './UserMenu';

export default function Header() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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

  // 判断是否运行在 Electron 容器
  const isElectron = () => {
    return (
      (typeof navigator !== 'undefined' && /Electron/i.test(navigator.userAgent)) ||
      (typeof window !== 'undefined' && (window as any).process?.versions?.electron)
    );
  };

  // 获取未读通知数量
  useEffect(() => {
    const loadUnreadCount = async () => {
      const user = storage.getUser();
      if (user?.id) {
        const count = await fetchUnreadCount();
        setUnreadCount(count);
      }
    };

    loadUnreadCount();

    // 每30秒刷新一次未读数量
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // 客户端中为"帮助中心"采用外部浏览器打开逻辑
  const handleHelpClick = async (e: React.MouseEvent) => {
    e.preventDefault(); // 总是阻止默认行为，显示确认弹框
    const helpUrl = 'https://docs.cuemate.chat';
    
    Modal.confirm({
      title: '确认跳转到外部网站',
      content: (
        <div className="space-y-3">
          <div className="text-sm text-slate-600">
            即将跳转到帮助中心网站：
          </div>
          <div className="bg-slate-50 p-3 rounded border text-sm break-all">
            {helpUrl}
          </div>
          <div className="text-xs text-slate-500">
            链接将在{isElectron() ? '外部浏览器' : '新标签页'}中打开
          </div>
        </div>
      ),
      okText: '确认跳转',
      cancelText: '取消',
      onOk: async () => {
        if (isElectron()) {
          try {
            // 使用 WebSocket 通信方式
            const { getWebSocketBridge } = await import('../utils/websocketBridge');
            const bridge = getWebSocketBridge();
            bridge.openExternal(helpUrl);
          } catch (error) {
            console.error('WebSocket 通信失败，使用降级方案:', error);
            // 降级方案：直接使用 window.open
            window.open(helpUrl, '_blank');
          }
        } else {
          // 在普通浏览器中，打开新标签页
          window.open(helpUrl, '_blank', 'noopener,noreferrer');
        }
      }
    });
  };

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
              <Link key={to} to={to} className={desktopLinkCls(to)} onClick={to === '/help' ? handleHelpClick : undefined}>
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
                onClick={to === '/help' ? handleHelpClick : undefined}
                title={label}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
              </Link>
            ))}
          </div>
        </nav>

        {/* 右侧用户菜单和移动端菜单按钮 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* 站内信按钮 */}
          <Badge count={unreadCount} offset={[-5, 5]} showZero={false}>
            <button
              onClick={() => navigate('/settings/notification')}
              className="p-2 rounded-lg text-[#3b82f6] hover:bg-[rgba(59,130,246,0.08)] transition-colors"
              title="站内信"
            >
              <BellIcon className="w-5 h-5" />
            </button>
          </Badge>

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
                onClick={(e) => {
                  if (to === '/help') handleHelpClick(e);
                  setMobileMenuOpen(false);
                }}
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
