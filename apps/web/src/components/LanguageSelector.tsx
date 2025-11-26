import { GlobeAltIcon } from '@heroicons/react/24/outline';
import { useEffect, useRef, useState } from 'react';
import { updateMe } from '../api/auth';
import { storage } from '../api/http';
import { message } from './Message';

const languageOptions = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'zh-TW', label: '繁體中文' },
  { value: 'en-US', label: 'English' },
];

export default function LanguageSelector() {
  const [locale, setLocale] = useState<string>('zh-CN');
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 从 localStorage 读取初始值
  useEffect(() => {
    const user = storage.getUser();
    if (user?.locale) {
      setLocale(user.locale);
    }
  }, []);

  // 监听用户设置更新事件，确保和系统设置页面同步
  useEffect(() => {
    const onUserSettingsUpdated = (e: Event) => {
      const customEvent = e as CustomEvent;
      const updatedUser = customEvent.detail;
      if (updatedUser?.locale) {
        setLocale(updatedUser.locale);
      }
    };
    window.addEventListener('user-settings-updated', onUserSettingsUpdated);
    return () => window.removeEventListener('user-settings-updated', onUserSettingsUpdated);
  }, []);

  // 清除延迟关闭定时器
  const clearTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  // 延迟关闭（给鼠标时间移动到下拉列表）
  const handleContainerLeave = () => {
    clearTimer();
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
    }, 100); // 100ms 延迟
  };

  // 鼠标进入按钮或下拉列表，取消关闭
  const handleMouseEnter = () => {
    clearTimer();
    setOpen(true);
  };

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => clearTimer();
  }, []);

  const handleChange = async (value: string) => {
    try {
      // 立即更新本地状态
      setLocale(value);
      setOpen(false);
      clearTimer();

      // 调用后端 API 更新数据库
      const updatedUser = await updateMe({ locale: value });

      // 更新 localStorage（updateMe 内部已经调用 storage.setUser）
      storage.setUser(updatedUser);

      // 触发自定义事件，通知其他组件（如系统设置页面）
      window.dispatchEvent(new CustomEvent('user-settings-updated', { detail: updatedUser }));

      message.success('语言设置已更新');
    } catch {
      

      // 失败时回滚到原值
      const user = storage.getUser();
      if (user?.locale) {
        setLocale(user.locale);
      }
    }
  };

  const currentLabel = languageOptions.find((opt) => opt.value === locale)?.label || '简体中文';

  return (
    <div
      className="user-menu relative"
      onMouseLeave={handleContainerLeave}
      onMouseEnter={handleMouseEnter}
    >
      <div
        className="user-avatar-container"
        style={{ minWidth: '120px' }}
      >
        <GlobeAltIcon className="w-5 h-5" />
        <span className="user-name" style={{ minWidth: '70px' }}>{currentLabel}</span>
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
        <div
          className="absolute left-0 top-full w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl overflow-hidden select-none z-[100]"
        >
          {languageOptions.map((option) => (
            <button
              key={option.value}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 ${
                locale === option.value ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium' : 'text-slate-700 dark:text-slate-300'
              }`}
              onClick={() => handleChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
