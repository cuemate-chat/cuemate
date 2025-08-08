import React, { useState } from 'react';

export default function SubmitPrompt() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: 调用 RAG/LLM 接口保存押题
    alert(`提交押题: ${title}`);
  };

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-2xl space-y-4 bg-slate-900 p-6 rounded-xl border border-slate-800">
        <h1 className="text-xl font-semibold">提交押题</h1>
        <input className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700" placeholder="标题" value={title} onChange={(e)=>setTitle(e.target.value)} />
        <textarea className="w-full min-h-[200px] px-3 py-2 rounded bg-slate-800 border border-slate-700" placeholder="内容或提示词（prompt）" value={content} onChange={(e)=>setContent(e.target.value)} />
        <button className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500">提交</button>
      </form>
    </div>
  );
}


