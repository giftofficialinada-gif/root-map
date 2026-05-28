import { useMemo } from 'react';
import { format, parseISO, isToday, isThisMonth } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Map, Package, ArrowUpDown, BookOpen, LogOut } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export default function Home() {
  const { currentUser, logout, getAllForUser, setActiveTab, setSelectedDate } = useAppStore();
  const allPkgs = getAllForUser();

  const today = format(new Date(), 'yyyy-MM-dd');

  const todayPkgs = useMemo(() => allPkgs.filter(p => p.date === today), [allPkgs, today]);
  const monthPkgs = useMemo(() => allPkgs.filter(p => isThisMonth(parseISO(p.date))), [allPkgs]);

  const todayDelivered = todayPkgs.filter(p => p.delivered).length;
  const todayRemaining = todayPkgs.length - todayDelivered;
  const pct = todayPkgs.length > 0 ? (todayDelivered / todayPkgs.length) * 100 : 0;

  const monthDelivered = monthPkgs.filter(p => p.delivered).length;
  const monthDates = new Set(monthPkgs.map(p => p.date)).size;

  // 直近7稼働日
  const recentDates = useMemo(() => {
    const dates = [...new Set(allPkgs.map(p => p.date))].sort((a, b) => b.localeCompare(a)).slice(0, 7);
    return dates.map(date => {
      const pkgs = allPkgs.filter(p => p.date === date);
      return { date, total: pkgs.length, delivered: pkgs.filter(p => p.delivered).length };
    });
  }, [allPkgs]);

  const goToDate = (date: string, tab: 'packages' | 'map' | 'route') => {
    setSelectedDate(date);
    setActiveTab(tab);
  };

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 10 ? 'おはようございます' : greetingHour < 17 ? 'こんにちは' : 'お疲れ様です';

  return (
    <div style={{ background: 'var(--washi)' }} className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div style={{ background: 'var(--ink)' }} className="px-5 pt-6 pb-8 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <p style={{ fontFamily: 'var(--font-sans)', color: 'rgba(255,255,255,0.55)', fontSize: 12, letterSpacing: '0.05em' }}>
              {greeting}
            </p>
            <h1 style={{ fontFamily: 'var(--font-serif)', color: '#fff', fontSize: 22, fontWeight: 700, marginTop: 2 }}>
              {currentUser} さん
            </h1>
          </div>
          <button onClick={logout}
            style={{ color: 'rgba(255,255,255,0.5)', background: 'transparent', marginTop: 4 }}>
            <LogOut size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Today summary card */}
        <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 16, marginTop: 20, padding: '16px 18px' }}>
          <p style={{ fontFamily: 'var(--font-sans)', color: 'rgba(255,255,255,0.6)', fontSize: 11, letterSpacing: '0.1em', marginBottom: 10 }}>
            TODAY — {format(new Date(), 'M月d日（EEE）', { locale: ja })}
          </p>
          <div className="flex gap-0 divide-x" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
            {[
              { label: '持出し', value: todayPkgs.length, color: '#fff' },
              { label: '配達済', value: todayDelivered, color: 'rgba(100,220,150,0.9)' },
              { label: '残り', value: todayRemaining, color: todayRemaining > 0 ? 'rgba(255,180,100,0.9)' : 'rgba(100,220,150,0.9)' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex-1 text-center px-2">
                <div style={{ fontFamily: 'var(--font-mono)', color, fontSize: 28, lineHeight: 1 }}>{value}</div>
                <div style={{ fontFamily: 'var(--font-sans)', color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>

          {todayPkgs.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: 'rgba(100,220,150,0.8)', borderRadius: 2, transition: 'width 0.4s' }} />
              </div>
              <p style={{ fontFamily: 'var(--font-sans)', color: 'rgba(255,255,255,0.4)', fontSize: 10, textAlign: 'right', marginTop: 4 }}>
                {Math.round(pct)}% 完了
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="px-4 py-4 flex-shrink-0">
        <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--ink-muted)', fontSize: 11, letterSpacing: '0.1em', marginBottom: 10 }}>
          クイックアクション
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: '地図', Icon: Map, tab: 'map' as const },
            { label: '荷物追加', Icon: Package, tab: 'packages' as const },
            { label: 'ルート', Icon: ArrowUpDown, tab: 'route' as const },
          ].map(({ label, Icon, tab }) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <Icon size={20} style={{ color: 'var(--accent)' }} strokeWidth={1.5} />
              <span style={{ fontFamily: 'var(--font-sans)', color: 'var(--ink)', fontSize: 12 }}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Monthly stats */}
      <div className="px-4 pb-4 flex-shrink-0">
        <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--ink-muted)', fontSize: 11, letterSpacing: '0.1em', marginBottom: 10 }}>
          {format(new Date(), 'M月', { locale: ja })}の実績
        </p>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14 }} className="grid grid-cols-3 divide-x">
          {[
            { label: '持出し合計', value: monthPkgs.length, unit: '件', color: 'var(--ink)' },
            { label: '配達済', value: monthDelivered, unit: '件', color: 'var(--delivered)' },
            { label: '稼働日数', value: monthDates, unit: '日', color: 'var(--ink-muted)' },
          ].map(({ label, value, unit, color }) => (
            <div key={label} className="text-center py-3 px-1">
              <div style={{ fontFamily: 'var(--font-mono)', color, fontSize: 22, lineHeight: 1.1 }}>
                {value}<span style={{ fontSize: 11, color: 'var(--ink-muted)', fontFamily: 'var(--font-sans)', marginLeft: 1 }}>{unit}</span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--ink-muted)', fontFamily: 'var(--font-sans)', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent days */}
      <div className="px-4 pb-6">
        <div className="flex items-center justify-between mb-3">
          <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--ink-muted)', fontSize: 11, letterSpacing: '0.1em' }}>
            最近の配達記録
          </p>
          <button onClick={() => setActiveTab('history')}
            style={{ fontFamily: 'var(--font-sans)', color: 'var(--accent)', fontSize: 11, background: 'transparent' }}>
            すべて見る →
          </button>
        </div>

        {recentDates.length === 0 ? (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '32px 0', textAlign: 'center' }}>
            <p style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-sans)', fontSize: 13 }}>まだ記録がありません</p>
            <button onClick={() => setActiveTab('packages')}
              style={{ marginTop: 12, fontFamily: 'var(--font-sans)', color: 'var(--accent)', fontSize: 12, background: 'transparent' }}>
              荷物を追加する →
            </button>
          </div>
        ) : (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            {recentDates.map(({ date, total, delivered }, i) => {
              const d = parseISO(date);
              const isToday_ = isToday(d);
              const dow = format(d, 'EEE', { locale: ja });
              const isSat = format(d, 'e') === '7';
              const isSun = format(d, 'e') === '1';
              const done = delivered === total && total > 0;

              return (
                <button key={date}
                  onClick={() => goToDate(date, 'packages')}
                  style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none', background: 'transparent', width: '100%', textAlign: 'left' }}
                  className="flex items-center gap-3 px-4 py-3">
                  {/* Date column */}
                  <div style={{ width: 42, flexShrink: 0, textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', color: isToday_ ? 'var(--accent)' : 'var(--ink)', fontSize: 18, lineHeight: 1, fontWeight: 700 }}>
                      {format(d, 'd')}
                    </div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: isSun ? '#C0392B' : isSat ? '#2980B9' : 'var(--ink-muted)', marginTop: 1 }}>
                      {dow}
                    </div>
                  </div>

                  {/* Mini progress bar */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{ fontFamily: 'var(--font-sans)', color: 'var(--ink)', fontSize: 13 }}>
                        {total}件
                        {done && <span style={{ fontSize: 10, color: 'var(--delivered)', marginLeft: 6 }}>完了</span>}
                        {isToday_ && <span style={{ fontSize: 10, color: 'var(--accent)', marginLeft: 6 }}>今日</span>}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-muted)', fontSize: 11, marginLeft: 'auto' }}>
                        {delivered}/{total}
                      </span>
                    </div>
                    <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: total > 0 ? `${(delivered / total) * 100}%` : '0%', background: done ? 'var(--delivered)' : 'var(--accent)', borderRadius: 2 }} />
                    </div>
                  </div>

                  <BookOpen size={14} style={{ color: 'var(--ink-muted)', flexShrink: 0 }} strokeWidth={1.5} />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
