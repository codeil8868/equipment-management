'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const ORG_NAME = '인천구월그린컴퓨터아트학원';

export default function Login() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    if (error) setErr(error.message);
    setBusy(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-1 text-center text-xs text-slate-500">{ORG_NAME}</div>
        <h1 className="mb-6 text-center text-xl font-bold">🏢 시설장비관리</h1>

        <label className="block text-sm font-medium text-slate-600">이메일</label>
        <input
          type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username"
          className="mt-1 mb-4 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          placeholder="you@example.com"
        />

        <label className="block text-sm font-medium text-slate-600">비밀번호</label>
        <input
          type="password" value={pw} onChange={(e) => setPw(e.target.value)} required autoComplete="current-password"
          className="mt-1 mb-4 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        />

        {err && <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}

        <button
          type="submit" disabled={busy}
          className="w-full rounded bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy ? '로그인 중…' : '로그인'}
        </button>
      </form>
    </main>
  );
}
