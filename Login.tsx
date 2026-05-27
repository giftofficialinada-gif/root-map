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
      const ok = login(name.trim(), pin);
      if (!ok) setError('名前またはパスワードが違います');
    } else {
      const result = register(name.trim(), pin);
      if (!result.ok) setError(result.error ?? '登録に失敗しました');
    }
  };

  const handlePinChange = (v: string) => {
    if (/^\d{0,4}$/.test(v)) setPin(v);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🚐</div>
          <h1 className="text-2xl font-bold text-slate-800">配送マップ</h1>
          <p className="text-slate-500 text-sm mt-1">軽貨物配送管理</p>
        </div>

        <div className="flex rounded-lg overflow-hidden border border-slate-200 mb-6">
          {(['login', 'register'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); }}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                mode === m
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {m === 'login' ? 'ログイン' : '新規登録'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">名前</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：田中 太郎"
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              パスワード（4桁）
            </label>
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => handlePinChange(e.target.value)}
              placeholder="0000"
              maxLength={4}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-slate-800 tracking-widest text-center text-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 rounded-lg transition-colors mt-2"
          >
            {mode === 'login' ? 'ログイン' : '登録してはじめる'}
          </button>
        </form>
      </div>
    </div>
  );
}
