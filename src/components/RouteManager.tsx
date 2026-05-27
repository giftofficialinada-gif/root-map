import { useAppStore } from '../store/useAppStore';
import { Package, COOL_LABELS } from '../types';

export default function RouteManager() {
  const { selectedDate, setSelectedDate, getByDate, movePackage, setDelivered } = useAppStore();
  const packages = getByDate(selectedDate);
  const delivered = packages.filter(p => p.delivered).length;
  const remaining = packages.length - delivered;
  const pct = packages.length > 0 ? (delivered / packages.length) * 100 : 0;

  const copyRoute = () => {
    const lines = packages.map((p, i) =>
      `${i + 1}. ${p.customerName}（${p.address}）${p.cool !== 'none' ? `[${COOL_LABELS[p.cool]}]` : ''}${p.collect ? '[コレクト]' : ''}${p.delivered ? ' ✓' : ''}`
    );
    navigator.clipboard.writeText(lines.join('\n'));
  };

  return (
    <div style={{ background: 'var(--washi)' }} className="flex flex-col h-full">
      {/* Header */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }} className="px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
            style={{ border: '1px solid var(--border)', background: 'var(--washi)', color: 'var(--ink)', fontFamily: 'var(--font-sans)', fontSize: 13, borderRadius: 8, flex: 1 }}
            className="px-3 py-1.5 outline-none" />
          {packages.length > 0 && (
            <button onClick={copyRoute}
              style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--ink-muted)', fontFamily: 'var(--font-sans)', fontSize: 12, borderRadius: 20 }}
              className="px-3 py-1.5 whitespace-nowrap">
              📋 コピー
            </button>
          )}
        </div>
        {packages.length > 0 && (
          <div>
            <div className="flex justify-between mb-1">
              <span style={{ fontSize: 12, color: 'var(--ink-muted)', fontFamily: 'var(--font-sans)' }}>配達進捗</span>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>
                <span style={{ color: 'var(--delivered)' }}>{delivered}</span> / {packages.length}件
                （残り <span style={{ color: 'var(--accent)' }}>{remaining}</span>件）
              </span>
            </div>
            <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'var(--delivered)', borderRadius: 2, transition: 'width 0.4s' }} />
            </div>
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {packages.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">↕</div>
            <p style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-sans)' }} className="text-sm">荷物がありません</p>
          </div>
        ) : packages.map((pkg, idx) => (
          <RouteItem key={pkg.id} pkg={pkg} routeNo={idx + 1}
            isFirst={idx === 0} isLast={idx === packages.length - 1}
            onUp={() => movePackage(pkg.id, 'up')}
            onDown={() => movePackage(pkg.id, 'down')}
            onToggle={() => setDelivered(pkg.id, !pkg.delivered)}
          />
        ))}
      </div>

      {/* Footer summary */}
      {packages.length > 0 && (
        <div style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }} className="px-4 py-3 flex-shrink-0">
          <p style={{ fontSize: 11, color: 'var(--ink-muted)', fontFamily: 'var(--font-sans)', marginBottom: 6, letterSpacing: '0.05em' }}>サイズ内訳</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(
              packages.reduce<Record<number, number>>((a, p) => ({ ...a, [p.size]: (a[p.size] ?? 0) + 1 }), {})
            ).sort(([a], [b]) => +a - +b).map(([s, c]) => (
              <span key={s}
                style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, border: '1px solid var(--border)', color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)', background: 'var(--washi)' }}>
                {s}s × {c}
              </span>
            ))}
            {packages.filter(p => p.cool !== 'none').length > 0 && (
              <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, border: '1px solid var(--cool)', color: 'var(--cool)', fontFamily: 'var(--font-sans)', background: 'var(--washi)' }}>
                クール × {packages.filter(p => p.cool !== 'none').length}
              </span>
            )}
            {packages.filter(p => p.collect).length > 0 && (
              <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, border: '1px solid var(--accent)', color: 'var(--accent)', fontFamily: 'var(--font-sans)', background: 'var(--washi)' }}>
                コレクト × {packages.filter(p => p.collect).length}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RouteItem({ pkg, routeNo, isFirst, isLast, onUp, onDown, onToggle }: {
  pkg: Package; routeNo: number; isFirst: boolean; isLast: boolean;
  onUp: () => void; onDown: () => void; onToggle: () => void;
}) {
  const borderColor = pkg.delivered ? 'var(--delivered)' :
    pkg.cool === 'frozen' ? 'var(--frozen)' :
    pkg.cool === 'refrigerated' ? 'var(--cool)' : 'var(--border)';

  return (
    <div style={{ background: 'var(--surface)', border: `1px solid ${borderColor}`, borderRadius: 14, opacity: pkg.delivered ? 0.65 : 1 }}
      className="flex items-center gap-2 px-3 py-2.5">
      {/* Up/down */}
      <div className="flex flex-col gap-0.5">
        <button onClick={onUp} disabled={isFirst}
          style={{ color: 'var(--ink-muted)', fontSize: 16, lineHeight: 1, width: 24, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, background: 'transparent' }}
          className="disabled:opacity-20 hover:bg-black/5">▲</button>
        <button onClick={onDown} disabled={isLast}
          style={{ color: 'var(--ink-muted)', fontSize: 16, lineHeight: 1, width: 24, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, background: 'transparent' }}
          className="disabled:opacity-20 hover:bg-black/5">▼</button>
      </div>

      {/* Number badge */}
      <div style={{ width: 30, height: 30, borderRadius: '50%', border: `2.5px solid ${borderColor}`, color: borderColor, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
        {pkg.collect ? '¥' : routeNo}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <span style={{ fontFamily: 'var(--font-serif)', color: 'var(--ink)', fontSize: 14, fontWeight: 600, textDecoration: pkg.delivered ? 'line-through' : 'none', opacity: pkg.delivered ? 0.5 : 1 }}
          className="truncate block">{pkg.customerName}</span>
        <p style={{ color: 'var(--ink-muted)', fontSize: 11, fontFamily: 'var(--font-sans)' }} className="truncate">{pkg.address}</p>
        <div className="flex gap-2 mt-0.5">
          <span style={{ fontSize: 10, color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }}>{pkg.size}s</span>
          {pkg.cool !== 'none' && <span style={{ fontSize: 10, color: pkg.cool === 'frozen' ? 'var(--frozen)' : 'var(--cool)', fontFamily: 'var(--font-sans)' }}>{COOL_LABELS[pkg.cool]}</span>}
          {pkg.collect && <span style={{ fontSize: 10, color: 'var(--accent)', fontFamily: 'var(--font-sans)' }}>コレクト</span>}
        </div>
      </div>

      {/* Check button */}
      <button onClick={onToggle}
        style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, border: `2px solid ${pkg.delivered ? 'var(--delivered)' : 'var(--border)'}`, background: pkg.delivered ? 'var(--delivered)' : 'transparent', color: pkg.delivered ? '#fff' : 'var(--border)', transition: 'all 0.2s' }}>
        ✓
      </button>
    </div>
  );
}
