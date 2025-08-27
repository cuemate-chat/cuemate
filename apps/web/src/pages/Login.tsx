import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signin } from '../api/auth';
import { storage } from '../api/http';
import LeftImage from '../assets/login-left.png';
import Logo from '../assets/logo-background.png';
import { message } from '../components/Message';
import { ROUTES, VALIDATION } from '../constants';

export default function Login() {
  const navigate = useNavigate();
  const [account, setAccount] = useState(''); // 用户名/邮箱/ID 任一
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(() => storage.getRememberEnabled());
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 初次加载：根据本地“记住我”恢复账号/密码
  useEffect(() => {
    const enabled = storage.getRememberEnabled();
    if (enabled) {
      const savedAccount = storage.getRemember();
      const savedPassword = storage.getRememberPassword();
      if (savedAccount) setAccount(savedAccount);
      if (savedPassword) setPassword(savedPassword);
    }
  }, []);

  // 勾选“记住我”或输入变更时，实时同步到本地（跳过首次运行）
  const didInitRef = React.useRef(false);
  useEffect(() => {
    if (!didInitRef.current) {
      didInitRef.current = true;
      return;
    }
    if (remember) {
      storage.setRememberEnabled(true);
      storage.setRemember(account);
      storage.setRememberPassword(password);
    } else {
      storage.clearRememberAll();
    }
  }, [remember, account, password]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await signin(account, password);
      if (remember) {
        storage.setRememberEnabled(true);
        storage.setRemember(account);
        storage.setRememberPassword(password);
      } else {
        storage.clearRememberAll();
      }
      message.success('登录成功');
      navigate(ROUTES.HOME, { replace: true });
    } catch (error) {
      // HTTP客户端已经处理了错误提示，这里只设置本地错误状态
      const errorMessage = error instanceof Error ? error.message : '账号或密码错误';
      setErrorMsg(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center login-bg p-10">
      <div className="quarter-circle" />
      <div className="login-ornaments" />
      {/* 居中白色卡片 */}
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.25)] overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* 左侧：顶部 Logo + 插画（居左） */}
          <div className="hidden md:flex flex-col items-start p-12 bg-[#e5eefc]">
            <img src={Logo} alt="CueMate" className="h-8 mb-6 bg-transparent" />
            <img src={LeftImage} alt="illustration" className="w-full h-auto object-contain" />
          </div>

          {/* 右侧表单（浅色输入 + 蓝色按钮）*/}
          <div className="p-10 bg-white">
            {/* 欢迎语 + 登录标题（右侧上方） */}
            <div className="mt-8 md:mt-14 mb-6 text-center">
              <div className="text-2xl md:text-3xl font-bold text-gray-800 mb-3">
                欢迎使用 CueMate
              </div>
              <div className="h-2 w-28 bg-blue-600 rounded-full mx-auto" />
            </div>
            <div className="mb-6 text-center">
              <h1 className="text-xl font-semibold text-gray-900">登录</h1>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <input
                className="w-full px-3 py-2 rounded border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入用户名"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                minLength={VALIDATION.USERNAME_MIN_LENGTH}
                maxLength={VALIDATION.USERNAME_MAX_LENGTH}
                required
              />
              <div className="relative group">
                <input
                  className="w-full px-3 pr-10 py-2 rounded border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入密码"
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={VALIDATION.PASSWORD_MIN_LENGTH}
                  maxLength={VALIDATION.PASSWORD_MAX_LENGTH}
                  required
                />
                <button
                  type="button"
                  aria-label={showPwd ? '隐藏密码' : '显示密码'}
                  title={showPwd ? '隐藏密码' : '显示密码'}
                  onClick={() => setShowPwd((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {showPwd ? (
                    // eye-off
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="w-5 h-5"
                    >
                      <path d="M3 3l18 18" />
                      <path d="M10.58 10.58a2 2 0 102.83 2.83" />
                      <path d="M9.88 4.24A9.77 9.77 0 0121 12c-1.2 2.3-3.13 4.18-5.5 5.34M7.5 7.5C5.13 8.66 3.2 10.55 2 12c.86 1.32 2.02 2.5 3.37 3.46" />
                    </svg>
                  ) : (
                    // eye
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="w-5 h-5"
                    >
                      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {errorMsg && (
                <div className="p-3 rounded bg-red-50 text-red-600 text-sm border border-red-200">
                  {errorMsg}
                </div>
              )}
              <button
                type="submit"
                disabled={submitting || !account.trim() || !password.trim()}
                className="w-full py-2.5 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium transition-colors"
              >
                {submitting ? '登录中…' : '登录'}
              </button>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <label className="inline-flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="cursor-pointer"
                  />
                  <span>记住我</span>
                </label>
                <button
                  type="button"
                  className="text-blue-600 hover:text-blue-500 transition-colors"
                  onClick={() => message.info('请联系管理员重置密码')}
                >
                  忘记密码？
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
