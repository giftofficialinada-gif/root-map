import { useState } from 'react';
import { Shield } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export default function AdminLogin({ onBack }: { onBack: () => void }) {
  const { adminLogin } = useAppStore();
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!adminLogin(id.trim(), password)) {
      setError('IDまたはパスワードが違います');
    }
  };

  return (
    <div style={{ background: 'var(--washi)' }} className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            border: '2px solid var(--ink-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            color: 'var(--ink-muted)',
          }}>
            <Shield size={28} strokeWidth={1.5} />
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', color: 'var(--ink)' }} className="text-2xl font-bold tracking-wide">
            管理者ログイン
          </h1>
          <div style={{ background: 'var(--ink-muted)', height: 1 }} className="w-12 mx-auto mt-3" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="管理者ID">
            <input
              type="text"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="admin"
              className={inputCls}
              autoComplete="username"
            />
          </Field>
          <Field label="パスワード">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={inputCls}
              autoComplete="current-password"
            />
          </Field>

          {error && (
            <p style={{ color: 'var(--accent)', fontFamily: 'var(--font-sans)' }}
              className="text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            style={{ background: 'var(--ink)', fontFamily: 'var(--font-serif)' }}
            className="w-full text-white font-semibold py-3 rounded-xl text-base tracking-widest mt-2">
            ログイン
          </button>
        </form>

        <button
          onClick={onBack}
          style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-sans)' }}
          className="w-full text-center text-sm mt-6">
          ← 通常ログインに戻る
        </button>
      </div>
    </div>
  );
}

const inputCls = 'w-full rounded-xl px-4 py-3 text-sm outline-none transition-all';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-sans)', fontSize: 12, letterSpacing: '0.08em' }}
        className="block mb-1 uppercase">{label}</label>
      <div style={{ border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 12 }}>
        {children}
      </div>
    </div>
  );
}
