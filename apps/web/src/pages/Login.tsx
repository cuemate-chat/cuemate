import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../assets/CueMate.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`登录: ${email}`);
  };

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 bg-slate-900 p-6 rounded-xl border border-slate-800">
        <div className="flex justify-center">
          <img src={Logo} alt="CueMate" className="h-10" />
        </div>
        <h1 className="text-xl font-semibold">登录 CueMate</h1>
        <input className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700" placeholder="邮箱" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <input className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700" placeholder="密码" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
        <button className="w-full py-2 rounded bg-blue-600 hover:bg-blue-500">登录</button>
        <div className="text-sm text-slate-400">没有账号？<Link to="/register" className="text-blue-400">注册</Link></div>
      </form>
    </div>
  );
}


