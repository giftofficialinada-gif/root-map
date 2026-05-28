import { useState, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Package } from '../types';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';

export default function History() {
  const { getAllForUser, setSelectedDate, setActiveTab } = useAppStore();
  const packages = getAllForUser();
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [viewMonth, setViewMonth] = useState(() => format(new Date(), 'yyyy-MM'));

  const byDate = useMemo(() => {
    const map: Record<string, Package[]> = {};
    for (const pkg of packages) {
      if (!map[pkg.date]) map[pkg.date] = [];
      map[pkg.date].push(pkg);
    }
    return map;
  }, [packages]);

  const monthStart = parseISO(`${viewMonth}-01`);
  const allDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));
  const monthDates = allDates.filter(d => d.startsWith(viewMonth));

  const monthTotal = monthDates.reduce((s, d) => s + byDate[d].length, 0);
  const monthDelivered = monthDates.reduce((s, d) => s + byDate[d].filter(p => p.delivered).length, 0);

  const prevMonth = () => {
    const d = new Date(monthStart); d.setMonth(d.getMonth() - 1);
    setViewMonth(format(d, 'yyyy-MM'));
  };
  const nextMonth = () => {
    const d = new Date(monthStart); d.setMonth(d.getMonth() + 1);
    setViewMonth(format(d, 'yyyy-MM'));
  };

  return (
    <div style={{ background: 'var(--washi)' }} className="flex flex-col h-full">
      {/* Header */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }} className="px-4 pt-3 pb-4 flex-shrink-0">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={prevMonth} style={{ color: 'var(--ink-muted)', background: 'transparent', padding: '4px 8px', fontSize: 16 }}>◀</button>
          <span style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--font-serif)', color: 'var(--ink)', fontSize: 18, fontWeight: 700 }}>
            {format(monthStart, 'yyyy年M月', { locale: ja })}
          </span>
          <button onClick={nextMonth} style={{ color: 'var(--ink-muted)', background: 'transparent', padding: '4px 8px', fontSize: 16 }}>▶</button>
        </div>
        {/* Monthly stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: '持出し合計', value: monthTotal, color: 'var(--ink)' },
            { label: '配達済', value: monthDelivered, color: 'var(--delivered)' },
            { label: '稼働日数', value: monthDates.length, unit: '日', color: 'var(--ink-muted)' },
          ].map(({ label, value, unit, color }) => (
            <div key={label} style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--washi)' }}
              className="text-center py-2.5">
              <div style={{ fontFamily: 'var(--font-mono)', color, fontSize: 22, lineHeight: 1.1 }}>
                {value}
                <span style={{ fontSize: 11, color: 'var(--ink-muted)', fontFamily: 'var(--font-sans)', marginLeft: 1 }}>{unit ?? '件'}</span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--ink-muted)', fontFamily: 'var(--font-sans)', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Day list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {monthDates.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">冊</div>
            <p style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-sans)' }} className="text-sm">この月の記録はありません</p>
          </div>
        ) : monthDates.map((date) => {
          const dayPkgs = byDate[date].sort((a, b) => a.routeOrder - b.routeOrder);
          const dlv = dayPkgs.filter(p => p.delivered).length;
          const cool = dayPkgs.filter(p => p.cool !== 'none').length;
          const collect = dayPkgs.filter(p => p.collect).length;
          const done = dlv === dayPkgs.length && dayPkgs.length > 0;
          const expanded = expandedDate === date;
          const d = parseISO(date);
          const dow = format(d, 'EEE', { locale: ja });
          const isSat = format(d, 'e') === '7';
          const isSun = format(d, 'e') === '1';

          return (
            <div key={date} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
              <button className="w-full flex items-center gap-3 px-4 py-3 text-left"
                onClick={() => setExpandedDate(expanded ? null : date)}
                style={{ background: 'transparent' }}>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span style={{ fontFamily: 'var(--font-serif)', color: 'var(--ink)', fontSize: 15, fontWeight: 700 }}>
                      {format(d, 'M月d日', { locale: ja })}
                    </span>
                    <span style={{ fontSize: 13, color: isSun ? '#C0392B' : isSat ? '#2980B9' : 'var(--ink-muted)', fontFamily: 'var(--font-sans)' }}>
                      （{dow}）
                    </span>
                    {done && (
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, border: '1px solid var(--delivered)', color: 'var(--delivered)', fontFamily: 'var(--font-sans)' }}>完了</span>
                    )}
                  </div>
                  <div className="flex gap-3 mt-1">
                    {[
                      { label: '持出し', value: dayPkgs.length, color: 'var(--ink)' },
                      { label: '配達済', value: dlv, color: 'var(--delivered)' },
                      ...(cool > 0 ? [{ label: 'クール', value: cool, color: 'var(--cool)' }] : []),
                      ...(collect > 0 ? [{ label: 'コレクト', value: collect, color: 'var(--accent)' }] : []),
                    ].map(({ label, value, color }) => (
                      <span key={label} style={{ fontSize: 11, color: 'var(--ink-muted)', fontFamily: 'var(--font-sans)' }}>
                        {label} <b style={{ color, fontFamily: 'var(--font-mono)' }}>{value}</b>件
                      </span>
                    ))}
                  </div>
                </div>
                <span style={{ color: 'var(--ink-muted)', fontSize: 12 }}>{expanded ? '▲' : '▼'}</span>
              </button>

              {expanded && (
                <div style={{ borderTop: '1px solid var(--border)' }}>
                  {/* Size summary */}
                  <div style={{ background: 'var(--washi)' }} className="px-4 py-2 flex flex-wrap gap-1.5">
                    {Object.entries(
                      dayPkgs.reduce<Record<number, number>>((a, p) => ({ ...a, [p.size]: (a[p.size] ?? 0) + 1 }), {})
                    ).sort(([a], [b]) => +a - +b).map(([s, c]) => (
                      <span key={s} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, border: '1px solid var(--border)', color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)', background: 'var(--surface)' }}>
                        {s}s × {c}
                      </span>
                    ))}
                  </div>
                  {/* Packages */}
                  {dayPkgs.map((pkg, idx) => (
                    <div key={pkg.id}
                      style={{ borderTop: '1px solid var(--border)', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8, opacity: pkg.delivered ? 0.6 : 1 }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${pkg.delivered ? 'var(--delivered)' : 'var(--border)'}`, color: pkg.delivered ? 'var(--delivered)' : 'var(--ink-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                        {idx + 1}
                      </div>
                      <span style={{ flex: 1, fontFamily: 'var(--font-sans)', color: 'var(--ink)', fontSize: 13, textDecoration: pkg.delivered ? 'line-through' : 'none' }} className="truncate">
                        {pkg.customerName}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-muted)', fontSize: 11 }}>{pkg.size}s</span>
                      {pkg.cool !== 'none' && <span style={{ fontSize: 11, color: pkg.cool === 'frozen' ? 'var(--frozen)' : 'var(--cool)', fontFamily: 'var(--font-sans)' }}>{pkg.cool === 'frozen' ? '冷凍' : '冷蔵'}</span>}
                      {pkg.collect && <span style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--font-sans)' }}>¥</span>}
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid var(--border)', padding: '8px 16px', textAlign: 'right' }}>
                    <button onClick={() => { setSelectedDate(date); setActiveTab('packages'); }}
                      style={{ fontSize: 12, color: 'var(--accent)', fontFamily: 'var(--font-sans)', background: 'transparent' }}>
                      この日の詳細 →
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
