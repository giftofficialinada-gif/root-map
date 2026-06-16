import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import {
  Package, COOL_LABELS, TimeSlot, TIME_SLOT_LABELS, TIME_SLOT_COLORS, TIME_SLOT_ORDER,
  DeliveryStatus, DELIVERY_STATUS_LABELS, DELIVERY_STATUS_COLORS, DELIVERY_STATUS_ICONS,
  getEffectiveStatus,
} from '../types';

const CYCLE_ORDER: DeliveryStatus[] = ['pending', 'delivered', 'absent', 'redelivery'];

export default function RouteManager() {
  const { selectedDate, setSelectedDate, getByDate, movePackage, setDeliveryStatus, autoRoutePackages } = useAppStore();
  const packages = getByDate(selectedDate);
  const [slotFilter, setSlotFilter] = useState<TimeSlot | 'all'>('all');
  const [autoRouting, setAutoRouting] = useState(false);

  const delivered = packages.filter(p => getEffectiveStatus(p) === 'delivered').length;
  const remaining = packages.filter(p => getEffectiveStatus(p) === 'pending').length;
  const pct = packages.length > 0 ? (delivered / packages.length) * 100 : 0;

  const visiblePackages = slotFilter === 'all'
    ? packages
    : packages.filter(p => p.timeSlot === slotFilter);

  const handleAutoRoute = async () => {
    setAutoRouting(true);
    await autoRoutePackages(selectedDate);
    setAutoRouting(false);
  };

  const copyRoute = () => {
    const lines = packages.map((p, i) =>
      `${i + 1}. ${p.customerName}（${p.address}）${p.cool !== 'none' ? `[${COOL_LABELS[p.cool]}]` : ''}${p.collect ? '[コレクト]' : ''}${p.cashOnDelivery ? '[着払い]' : ''}${p.nekoposu ? '[ネコポス]' : ''}${p.timeSlot ? `[${TIME_SLOT_LABELS[p.timeSlot]}]` : ''}${p.delivered ? ' ✓' : ''}`
    );
    navigator.clipboard.writeText(lines.join('\n'));
  };

  const hasGeocodedPkgs = packages.filter(p => p.lat !== undefined && p.lng !== undefined).length >= 2;

  return (
    <div style={{ background: 'var(--washi)' }} className="flex flex-col h-full">
      {/* Header */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }} className="px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
            style={{ border: '1px solid var(--border)', background: 'var(--washi)', color: 'var(--ink)', fontFamily: 'var(--font-sans)', fontSize: 13, borderRadius: 8, flex: 1 }}
            className="px-3 py-1.5 outline-none" />
          {packages.length > 0 && (
            <button onClick={copyRoute}
              style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--ink-muted)', fontFamily: 'var(--font-sans)', fontSize: 12, borderRadius: 20 }}
              className="px-3 py-1.5 whitespace-nowrap">
              📋
            </button>
          )}
        </div>

        {/* Auto route button */}
        {packages.length > 1 && (
          <button onClick={handleAutoRoute} disabled={autoRouting || !hasGeocodedPkgs}
            style={{
              width: '100%', padding: '8px 0', borderRadius: 10, fontSize: 13, fontFamily: 'var(--font-sans)', fontWeight: 600, marginBottom: 8,
              background: hasGeocodedPkgs ? 'var(--ink)' : 'var(--border)',
              color: '#fff', border: 'none', cursor: hasGeocodedPkgs ? 'pointer' : 'not-allowed', opacity: autoRouting ? 0.7 : 1,
            }}>
            {autoRouting ? '🔄 道路ネットワークで計算中…' : hasGeocodedPkgs ? '✦ 自動ルート（車道・時間帯優先）' : '📍 座標未取得のため自動ルート不可'}
          </button>
        )}

        {packages.length > 0 && (
          <>
            <div className="flex justify-between mb-1">
              <span style={{ fontSize: 12, color: 'var(--ink-muted)', fontFamily: 'var(--font-sans)' }}>配達進捗</span>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>
                <span style={{ color: 'var(--delivered)' }}>{delivered}</span> / {packages.length}件
                （未配達 <span style={{ color: 'var(--accent)' }}>{remaining}</span>件）
              </span>
            </div>
            <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'var(--delivered)', borderRadius: 2, transition: 'width 0.4s' }} />
            </div>
          </>
        )}

        {/* Time slot filter */}
        {packages.some(p => p.timeSlot) && (
          <div className="flex gap-1 mt-2 overflow-x-auto pb-0.5">
            <button onClick={() => setSlotFilter('all')}
              style={{ flexShrink: 0, fontSize: 11, padding: '4px 10px', borderRadius: 20, fontFamily: 'var(--font-sans)', background: slotFilter === 'all' ? 'var(--ink)' : 'transparent', color: slotFilter === 'all' ? '#fff' : 'var(--ink-muted)', border: `1px solid ${slotFilter === 'all' ? 'var(--ink)' : 'var(--border)'}` }}>
              全て
            </button>
            {TIME_SLOT_ORDER.filter(s => packages.some(p => p.timeSlot === s)).map(slot => (
              <button key={slot} onClick={() => setSlotFilter(slotFilter === slot ? 'all' : slot)}
                style={{ flexShrink: 0, fontSize: 11, padding: '4px 10px', borderRadius: 20, fontFamily: 'var(--font-sans)', background: slotFilter === slot ? TIME_SLOT_COLORS[slot] : 'transparent', color: slotFilter === slot ? '#fff' : TIME_SLOT_COLORS[slot], border: `1px solid ${TIME_SLOT_COLORS[slot]}` }}>
                {TIME_SLOT_LABELS[slot]}
              </button>
            ))}
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
        ) : visiblePackages.length === 0 ? (
          <div className="text-center py-16">
            <p style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-sans)' }} className="text-sm">この時間帯の荷物はありません</p>
          </div>
        ) : visiblePackages.map((pkg) => {
          const allIdx = packages.findIndex(p => p.id === pkg.id);
          const status = getEffectiveStatus(pkg);
          const nextStatus = CYCLE_ORDER[(CYCLE_ORDER.indexOf(status) + 1) % CYCLE_ORDER.length];
          return (
            <RouteItem key={pkg.id} pkg={pkg} routeNo={allIdx + 1}
              isFirst={allIdx === 0} isLast={allIdx === packages.length - 1}
              onUp={() => movePackage(pkg.id, 'up')}
              onDown={() => movePackage(pkg.id, 'down')}
              onCycle={() => setDeliveryStatus(pkg.id, nextStatus)}
            />
          );
        })}
      </div>

      {/* Footer summary */}
      {packages.length > 0 && (
        <div style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }} className="px-4 py-3 flex-shrink-0">
          <p style={{ fontSize: 11, color: 'var(--ink-muted)', fontFamily: 'var(--font-sans)', marginBottom: 6, letterSpacing: '0.05em' }}>サイズ内訳</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(
              packages.reduce<Record<string, number>>((a, p) => {
                const key = p.nekoposu ? 'ネコポス' : p.kogire ? `小物${p.size}s` : `${p.size}s`;
                return { ...a, [key]: (a[key] ?? 0) + 1 };
              }, {})
            ).sort(([a], [b]) => a.localeCompare(b)).map(([s, c]) => (
              <span key={s}
                style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, border: '1px solid var(--border)', color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)', background: 'var(--washi)' }}>
                {s} × {c}
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
            {packages.filter(p => p.cashOnDelivery).length > 0 && (
              <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, border: '1px solid #555', color: '#555', fontFamily: 'var(--font-sans)', background: 'var(--washi)' }}>
                着払い × {packages.filter(p => p.cashOnDelivery).length}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RouteItem({ pkg, routeNo, isFirst, isLast, onUp, onDown, onCycle }: {
  pkg: Package; routeNo: number; isFirst: boolean; isLast: boolean;
  onUp: () => void; onDown: () => void; onCycle: () => void;
}) {
  const status = getEffectiveStatus(pkg);
  const statusColor = DELIVERY_STATUS_COLORS[status];
  const slotColor = pkg.timeSlot ? TIME_SLOT_COLORS[pkg.timeSlot] : null;
  const borderColor = status !== 'pending' ? statusColor :
    slotColor ? slotColor :
    pkg.cool === 'frozen' ? 'var(--frozen)' :
    pkg.cool === 'refrigerated' ? 'var(--cool)' : 'var(--border)';
  const isDone = status !== 'pending';

  return (
    <div style={{ background: 'var(--surface)', border: `1px solid ${borderColor}`, borderRadius: 14, opacity: isDone ? 0.7 : 1 }}
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
        {status !== 'pending' ? DELIVERY_STATUS_ICONS[status] : (pkg.collect ? '¥' : routeNo)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span style={{ fontFamily: 'var(--font-serif)', color: 'var(--ink)', fontSize: 14, fontWeight: 600, textDecoration: status === 'delivered' ? 'line-through' : 'none', opacity: isDone ? 0.6 : 1 }}
            className="truncate">{pkg.customerName}</span>
          {status !== 'pending' && (
            <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 10, background: statusColor, color: '#fff', fontFamily: 'var(--font-sans)', flexShrink: 0 }}>
              {DELIVERY_STATUS_LABELS[status]}
            </span>
          )}
          {pkg.timeSlot && status === 'pending' && (
            <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 10, background: TIME_SLOT_COLORS[pkg.timeSlot], color: '#fff', fontFamily: 'var(--font-sans)', flexShrink: 0 }}>
              {TIME_SLOT_LABELS[pkg.timeSlot]}
            </span>
          )}
        </div>
        <p style={{ color: 'var(--ink-muted)', fontSize: 11, fontFamily: 'var(--font-sans)' }} className="truncate">{pkg.address}</p>
        <div className="flex gap-2 mt-0.5 flex-wrap">
          {pkg.nekoposu
            ? <span style={{ fontSize: 10, color: 'var(--ink)', fontFamily: 'var(--font-sans)' }}>ネコポス</span>
            : pkg.kogire
              ? <><span style={{ fontSize: 10, color: '#6B7280', fontFamily: 'var(--font-sans)' }}>小物</span><span style={{ fontSize: 10, color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }}> {pkg.size}s</span></>
              : <span style={{ fontSize: 10, color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }}>{pkg.size}s</span>
          }
          {pkg.cool !== 'none' && <span style={{ fontSize: 10, color: pkg.cool === 'frozen' ? 'var(--frozen)' : 'var(--cool)', fontFamily: 'var(--font-sans)' }}>{COOL_LABELS[pkg.cool]}</span>}
          {pkg.collect && <span style={{ fontSize: 10, color: 'var(--accent)', fontFamily: 'var(--font-sans)' }}>コレクト{pkg.collectAmount ? ` ¥${pkg.collectAmount.toLocaleString()}` : ''}</span>}
          {pkg.cashOnDelivery && <span style={{ fontSize: 10, color: '#555', fontFamily: 'var(--font-sans)' }}>着払い{pkg.cashOnDeliveryAmount ? ` ¥${pkg.cashOnDeliveryAmount.toLocaleString()}` : ''}</span>}
        </div>
      </div>

      {/* Status cycle button: tap to cycle pending→delivered→absent→redelivery→pending */}
      <button onClick={onCycle}
        style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          border: `2px solid ${isDone ? statusColor : 'var(--border)'}`,
          background: isDone ? statusColor : 'transparent',
          color: isDone ? '#fff' : 'var(--ink-muted)',
          transition: 'all 0.2s', gap: 0,
        }}>
        <span style={{ fontSize: isDone ? 16 : 14, lineHeight: 1 }}>{isDone ? DELIVERY_STATUS_ICONS[status] : '○'}</span>
      </button>
    </div>
  );
}
