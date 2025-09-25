import {
  ArrowRightOnRectangleIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  CpuChipIcon,
  CubeIcon,
  DocumentTextIcon,
  PhotoIcon,
  QueueListIcon,
  RectangleGroupIcon,
  SpeakerWaveIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMe, signout } from '../api/auth';
import { storage } from '../api/http';
import { message } from './Message';

function getUserInitials(username: string): string {
  if (!username) return 'U';
  if (/\p{Script=Han}/u.test(username)) {
    return username.substring(0, 2);
  } else {
    const names = username.trim().split(/\s+/);
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  }
}

export default function UserMenu() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(storage.getToken());
  const [user, setUser] = useState<any | null>(storage.getUser());
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, []);

  useEffect(() => {
    const onStorage = () => {
      setToken(storage.getToken());
      setUser(storage.getUser());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // 启动时如果有 token 但本地无用户信息，调用 /auth/me 同步
  useEffect(() => {
    const t = storage.getToken();
    const u = storage.getUser();
    if (t && !u) {
      fetchMe().catch(() => {
        /* 忽略错误，保持现状 */
      });
    }
  }, []);

  const { isLoggedIn, username } = useMemo(() => {
    if (!token) return { isLoggedIn: false, username: '' };
    const name =
      user?.name ||
      user?.username ||
      (user?.email ? user.email.split('@')[0] : undefined) ||
      user?.id ||
      'User';
    return { isLoggedIn: true, username: name };
  }, [token, user]);

  if (!isLoggedIn) {
    return (
      <div className="flex items-center gap-3">
        <button
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          onClick={() => navigate('/login')}
        >
          登录
        </button>
      </div>
    );
  }

  const initials = getUserInitials(user?.id || username);

  const onSettings = () => {
    navigate('/settings');
    setOpen(false);
  };

  const onModelSettings = () => {
    navigate('/settings/models');
    setOpen(false);
  };

  const onASRSettings = () => {
    navigate('/settings/asr');
    setOpen(false);
  };

  const onLogs = () => {
    navigate('/settings/logs');
    setOpen(false);
  };

  const onOperationLogs = () => {
    navigate('/settings/operation-logs');
    setOpen(false);
  };

  const onDockerMonitor = () => {
    navigate('/settings/docker-monitor');
    setOpen(false);
  };

  const onVectorKnowledge = () => {
    navigate('/settings/vector-knowledge');
    setOpen(false);
  };

  const onLicense = () => {
    navigate('/settings/license');
    setOpen(false);
  };

  const onAIRecords = () => {
    navigate('/settings/ai-records');
    setOpen(false);
  };

  const onPresetQuestions = () => {
    navigate('/settings/preset-questions');
    setOpen(false);
  };

  const onAdsPixel = () => {
    navigate('/settings/pixel-ads');
    setOpen(false);
  };

  const onAdsManagement = () => {
    navigate('/settings/ads-management');
    setOpen(false);
  };

  const onLogout = async () => {
    try {
      // 统一在 auth.signout 中处理清理与通知
      await signout();
    } catch (error) {
      console.warn('登出接口调用失败:', error);
    }
    // 成功与否都提示并导航
    message.success('已退出登录');
    setOpen(false);
    navigate('/login', { replace: true });
  };

  return (
    <div className="user-menu" ref={ref}>
      <div
        className="user-avatar-container relative"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <div className="user-avatar gradient-avatar">{initials}</div>
        <span className="user-name">{username}</span>
        <svg
          className={`dropdown-icon ${open ? 'rotate-180' : ''}`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-44 rounded-lg border border-slate-200 bg-white shadow-xl overflow-hidden select-none z-[100]">
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700"
            onClick={onSettings}
          >
            <Cog6ToothIcon className="w-4 h-4" /> 系统设置
          </button>
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700"
            onClick={onModelSettings}
          >
            <Squares2X2Icon className="w-4 h-4" /> 模型设置
          </button>
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700"
            onClick={onASRSettings}
          >
            <SpeakerWaveIcon className="w-4 h-4" /> 语音设置
          </button>
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700"
            onClick={onLogs}
          >
            <DocumentTextIcon className="w-4 h-4" /> 日志管理
          </button>
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700"
            onClick={onOperationLogs}
          >
            <ClipboardDocumentListIcon className="w-4 h-4" /> 操作记录
          </button>
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700"
            onClick={onDockerMonitor}
          >
            <CpuChipIcon className="w-4 h-4" /> 容器监控
          </button>
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700"
            onClick={onPresetQuestions}
          >
            <QueueListIcon className="w-4 h-4" /> 预置题库
          </button>
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700"
            onClick={onVectorKnowledge}
          >
            <CubeIcon className="w-4 h-4" /> 向量知识库
          </button>
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700"
            onClick={onAIRecords}
          >
            <ChatBubbleLeftRightIcon className="w-4 h-4" /> AI 对话记录
          </button>
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700"
            onClick={onAdsPixel}
          >
            <PhotoIcon className="w-4 h-4" /> 像素广告
          </button>
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700"
            onClick={onAdsManagement}
          >
            <RectangleGroupIcon className="w-4 h-4" /> 广告管理
          </button>
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700"
            onClick={onLicense}
          >
            <CubeIcon className="w-4 h-4" /> License 管理
          </button>
          <div className="h-px bg-slate-200" />
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 text-red-600 flex items-center gap-2"
            onClick={onLogout}
          >
            <ArrowRightOnRectangleIcon className="w-4 h-4" /> 退出登录
          </button>
        </div>
      )}
    </div>
  );
}
