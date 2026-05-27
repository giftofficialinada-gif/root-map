import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';

type Mode = 'login' | 'register';

export default function Login() {
  const { login, register } = useAppStore();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (mode === 'login') {
      if (!login(name.trim(), pin)) setError('名前またはパスワードが違います');
    } else {
      const result = register(name.trim(), pin);
      if (!result.ok) setError(result.error ?? '登録に失敗しました');
    }
  };

  const handlePinChange = (v: string) => {
    if (/^\d{0,4}$/.test(v)) setPin(v);
  };

  return (
    <div style={{ background: 'var(--washi)' }} className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Title */}
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">🚐</div>
          <h1 style={{ fontFamily: 'var(--font-serif)', color: 'var(--ink)' }} className="text-3xl font-bold tracking-wide">
            荷物ルートマップ
          </h1>
          <div style={{ background: 'var(--accent)', height: 2 }} className="w-16 mx-auto mt-3 mb-3 rounded" />
          <p style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-sans)' }} className="text-sm">
            軽貨物配送管理
          </p>
        </div>

        {/* Mode tabs */}
        <div style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
          className="flex rounded-xl overflow-hidden mb-6">
          {(['login', 'register'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); }}
              style={mode === m
                ? { background: 'var(--accent)', color: '#fff' }
                : { color: 'var(--ink-muted)', background: 'transparent' }}
              className="flex-1 py-2.5 text-sm font-medium transition-all"
            >
              {m === 'login' ? 'ログイン' : '新規登録'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="名前">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：田中 太郎"
              className={inputCls}
              autoComplete="username"
            />
          </Field>
          <Field label="パスワード（4桁）">
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => handlePinChange(e.target.value)}
              placeholder="••••"
              maxLength={4}
              style={{ letterSpacing: '0.5em', fontFamily: 'var(--font-mono)' }}
              className={`${inputCls} text-center text-xl`}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </Field>

          {error && (
            <p style={{ color: 'var(--accent)', fontFamily: 'var(--font-sans)' }}
              className="text-sm text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            style={{ background: 'var(--accent)', fontFamily: 'var(--font-serif)' }}
            className="w-full text-white font-semibold py-3 rounded-xl text-base tracking-widest mt-2 hover:opacity-90 transition-opacity"
          >
            {mode === 'login' ? '入る' : '登録して始める'}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputCls = [
  'w-full rounded-xl px-4 py-3 text-sm',
  'outline-none transition-all',
].join(' ');

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-sans)', fontSize: 12, letterSpacing: '0.08em' }}
        className="block mb-1 uppercase">
        {label}
      </label>
      <div style={{ border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 12 }}>
        {children}
      </div>
    </div>
  );
}
