import React, { useEffect, useState } from 'react';
import { signin } from '../api/auth';
import { storage } from '../api/http';
import Logo from '../assets/CueMate.png';
import LeftImage from '../assets/login-left.png';

export default function Login() {
  const [account, setAccount] = useState(''); // 用户名/邮箱/ID 任一
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(false);

  // 初次加载：恢复本地记住的账号/密码/勾选状态
  useEffect(() => {
    const enabled = storage.getRememberEnabled() === '1';
    setRemember(enabled);
    if (enabled) {
      const acc = storage.getRemember();
      const pwd = storage.getRememberPassword();
      if (acc) setAccount(acc);
      if (pwd) setPassword(pwd);
    }
  }, []);

  // 勾选“记住我”或输入变更时，实时同步到本地
  useEffect(() => {
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
    await signin(account, password);
    if (remember) {
      storage.setRememberEnabled(true);
      storage.setRemember(account);
      storage.setRememberPassword(password);
    } else {
      storage.clearRememberAll();
    }
    alert('登录成功');
  };

  return (
    <div className="min-h-screen flex items-center justify-center login-bg p-10">
      <div className="quarter-circle" />
      <div className="login-ornaments" />
      {/* 居中白色卡片 */}
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.25)] overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* 左侧：顶部 Logo + 插画（居左） */}
          <div className="hidden md:flex flex-col items-start p-12 bg-blue-50">
            <img src={Logo} alt="CueMate" className="h-8 mb-6" />
            <img src={LeftImage} alt="illustration" className="w-full h-auto object-contain" />
          </div>

          {/* 右侧表单（浅色输入 + 蓝色按钮）*/}
          <div className="p-10 bg-white">
            {/* 欢迎语 + 登录标题（右侧上方） */}
            <div className="mt-8 md:mt-14 mb-6 text-center">
              <div className="text-2xl md:text-3xl font-bold text-gray-800 mb-3">欢迎使用 CueMate</div>
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
              />
              <div className="relative group">
                <input
                  className="w-full px-3 pr-10 py-2 rounded border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入密码"
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  aria-label={showPwd ? '隐藏密码' : '显示密码'}
                  title={showPwd ? '隐藏密码' : '显示密码'}
                  onClick={() => setShowPwd(v=>!v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {showPwd ? (
                    // eye-off
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                      <path d="M3 3l18 18"/>
                      <path d="M10.58 10.58a2 2 0 102.83 2.83"/>
                      <path d="M9.88 4.24A9.77 9.77 0 0121 12c-1.2 2.3-3.13 4.18-5.5 5.34M7.5 7.5C5.13 8.66 3.2 10.55 2 12c.86 1.32 2.02 2.5 3.37 3.46"/>
                    </svg>
                  ) : (
                    // eye
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
              <button
                className="w-full py-2.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
              >
                登录
              </button>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <label className="inline-flex items-center space-x-2">
                  <input type="checkbox" checked={remember} onChange={(e)=>setRemember(e.target.checked)} />
                  <span>记住我</span>
                </label>
                <button type="button" className="text-blue-600 hover:text-blue-500">忘记密码？</button>
              </div>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
}


