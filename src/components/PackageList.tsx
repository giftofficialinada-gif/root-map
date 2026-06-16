import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import {
  Package, COOL_LABELS, TIME_SLOT_LABELS, TIME_SLOT_COLORS,
  DeliveryStatus, DELIVERY_STATUS_LABELS, DELIVERY_STATUS_COLORS, DELIVERY_STATUS_ICONS,
  getEffectiveStatus,
} from '../types';
import PackageModal from './PackageModal';
import BarcodeScanner from './BarcodeScanner';

export default function PackageList() {
  const { selectedDate, setSelectedDate, getByDate, addPackage, updatePackage, deletePackage, setDeliveryStatus } = useAppStore();
  const packages = getByDate(selectedDate);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Package | undefined>();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | undefined>();

  const delivered = packages.filter(p => getEffectiveStatus(p) === 'delivered').length;
  const absent = packages.filter(p => getEffectiveStatus(p) === 'absent').length;
  const redelivery = packages.filter(p => getEffectiveStatus(p) === 'redelivery').length;
  const stats = {
    total: packages.length,
    delivered,
    absent,
    redelivery,
    cool: packages.filter(p => p.cool !== 'none').length,
  };

  const handleSave = (data: Omit<Package, 'id' | 'routeOrder' | 'userId'>) => {
    if (editTarget) updatePackage(editTarget.id, data);
    else addPackage(data);
    setShowModal(false); setEditTarget(undefined); setScannedCode(undefined);
  };

  const handleScan = (text: string) => {
    setShowScanner(false);
    setScannedCode(text);
    setEditTarget(undefined);
    setShowModal(true);
  };

  return (
    <div style={{ background: 'var(--washi)' }} className="flex flex-col h-full">
      {/* Header */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }} className="px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
            style={{ border: '1px solid var(--border)', background: 'var(--washi)', color: 'var(--ink)', fontFamily: 'var(--font-sans)', fontSize: 13, borderRadius: 8, flex: 1 }}
            className="px-3 py-1.5 outline-none" />
          <button onClick={() => setShowScanner(true)}
            style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--ink-muted)', borderRadius: 20, fontFamily: 'var(--font-sans)', fontSize: 13 }}
            className="px-3 py-1.5 whitespace-nowrap">
            ▦ スキャン
          </button>
          <button onClick={() => { setEditTarget(undefined); setScannedCode(undefined); setShowModal(true); }}
            style={{ background: 'var(--ink)', color: '#fff', borderRadius: 20, fontFamily: 'var(--font-sans)', fontSize: 13 }}
            className="px-4 py-1.5 font-medium whitespace-nowrap">
            ＋ 追加
          </button>
        </div>
        {/* Stats */}
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${2 + (stats.absent > 0 ? 1 : 0) + (stats.redelivery > 0 ? 1 : 0)}, 1fr)` }}>
          {[
            { label: '合計', value: stats.total, color: 'var(--ink)' },
            { label: '配達済', value: stats.delivered, color: 'var(--delivered)' },
            ...(stats.absent > 0 ? [{ label: '不在', value: stats.absent, color: '#E74C3C' }] : []),
            ...(stats.redelivery > 0 ? [{ label: '再配達', value: stats.redelivery, color: '#8E44AD' }] : []),
          ].map(({ label, value, color }) => (
            <div key={label} style={{ border: '1px solid var(--border)', borderRadius: 10, background: 'var(--washi)' }}
              className="text-center py-2">
              <div style={{ fontFamily: 'var(--font-mono)', color, fontSize: 20, lineHeight: 1.1 }}>{value}
                <span style={{ fontSize: 10, color: 'var(--ink-muted)', fontFamily: 'var(--font-sans)', marginLeft: 1 }}>件</span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--ink-muted)', fontFamily: 'var(--font-sans)', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {packages.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">📦</div>
            <p style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-sans)' }} className="text-sm">荷物がありません</p>
          </div>
        ) : packages.map((pkg, idx) => (
          <PackageCard key={pkg.id} pkg={pkg} routeNo={idx + 1}
            onEdit={() => { setEditTarget(pkg); setShowModal(true); }}
            onDelete={() => setConfirmDelete(pkg.id)}
            onStatusChange={(s) => setDeliveryStatus(pkg.id, s)}
          />
        ))}
      </div>

      {showScanner && (
        <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
      )}
      {showModal && (
        <PackageModal pkg={editTarget} defaultDate={selectedDate} scannedCode={scannedCode}
          onSave={handleSave} onClose={() => { setShowModal(false); setEditTarget(undefined); setScannedCode(undefined); }} />
      )}
      {confirmDelete && (
        <ConfirmDialog
          onConfirm={() => { deletePackage(confirmDelete); setConfirmDelete(null); }}
          onCancel={() => setConfirmDelete(null)} />
      )}
    </div>
  );
}

const STATUS_OPTIONS: DeliveryStatus[] = ['delivered', 'absent', 'redelivery'];

function PackageCard({ pkg, routeNo, onEdit, onDelete, onStatusChange }: {
  pkg: Package; routeNo: number;
  onEdit: () => void; onDelete: () => void; onStatusChange: (s: DeliveryStatus) => void;
}) {
  const status = getEffectiveStatus(pkg);
  const statusColor = DELIVERY_STATUS_COLORS[status];
  const borderColor = status !== 'pending' ? statusColor :
    pkg.cool === 'frozen' ? 'var(--frozen)' :
    pkg.cool === 'refrigerated' ? 'var(--cool)' : 'var(--border)';

  return (
    <div style={{ background: 'var(--surface)', border: `1px solid ${borderColor}`, borderRadius: 14, opacity: status === 'delivered' ? 0.72 : 1 }}
      className="px-3 py-3">
      <div className="flex items-start gap-3">
        {/* Number circle */}
        <div style={{ width: 28, height: 28, borderRadius: '50%', border: `2px solid ${borderColor}`, color: borderColor, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: 2 }}>
          {status !== 'pending' ? DELIVERY_STATUS_ICONS[status] : routeNo}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span style={{ fontFamily: 'var(--font-serif)', color: 'var(--ink)', fontWeight: 600, fontSize: 15, textDecoration: status === 'delivered' ? 'line-through' : 'none' }}
              className="truncate">{pkg.customerName}</span>
            {status !== 'pending' && (
              <span style={{ fontSize: 10, color: statusColor, fontFamily: 'var(--font-sans)', fontWeight: 600, flexShrink: 0 }}>
                {DELIVERY_STATUS_LABELS[status]}
              </span>
            )}
          </div>
          <p style={{ color: 'var(--ink-muted)', fontSize: 12, fontFamily: 'var(--font-sans)' }} className="truncate mt-0.5">{pkg.address}</p>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {pkg.nekoposu
              ? <Chip color="var(--ink)">ネコポス</Chip>
              : pkg.kogire
                ? <><Chip color="#6B7280">小物</Chip><Chip>{pkg.size}s</Chip></>
                : <Chip>{pkg.size}s</Chip>
            }
            {pkg.cool !== 'none' && <Chip color={pkg.cool === 'frozen' ? 'var(--frozen)' : 'var(--cool)'}>{COOL_LABELS[pkg.cool]}</Chip>}
            {pkg.collect && <Chip color="var(--accent)">コレクト{pkg.collectAmount ? ` ¥${pkg.collectAmount.toLocaleString()}` : ''}</Chip>}
            {pkg.cashOnDelivery && <Chip color="#555">着払い{pkg.cashOnDeliveryAmount ? ` ¥${pkg.cashOnDeliveryAmount.toLocaleString()}` : ''}</Chip>}
            {pkg.timeSlot && <Chip color={TIME_SLOT_COLORS[pkg.timeSlot]}>{TIME_SLOT_LABELS[pkg.timeSlot]}</Chip>}
            {!pkg.lat && <Chip color="var(--accent)">📍未取得</Chip>}
          </div>
          {pkg.notes && <p style={{ color: 'var(--ink-muted)', fontSize: 11, marginTop: 4 }}>📝 {pkg.notes}</p>}

          {/* Status selector */}
          <div className="flex gap-1.5 mt-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
            {STATUS_OPTIONS.map(s => {
              const active = status === s;
              const col = DELIVERY_STATUS_COLORS[s];
              return (
                <button key={s} type="button"
                  onClick={() => onStatusChange(active ? 'pending' : s)}
                  style={{
                    flex: 1, padding: '5px 0', borderRadius: 8, fontSize: 11, fontFamily: 'var(--font-sans)',
                    background: active ? col : 'transparent',
                    color: active ? '#fff' : col,
                    border: `1.5px solid ${col}`,
                    fontWeight: active ? 700 : 400,
                  }}>
                  {DELIVERY_STATUS_ICONS[s]} {DELIVERY_STATUS_LABELS[s]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1 flex-shrink-0">
          <button onClick={onEdit}
            style={{ fontSize: 11, padding: '4px 8px', borderRadius: 8, fontFamily: 'var(--font-sans)', background: 'transparent', color: 'var(--ink-muted)', border: '1px solid var(--border)' }}>
            編集
          </button>
          <button onClick={onDelete}
            style={{ fontSize: 11, padding: '4px 8px', borderRadius: 8, fontFamily: 'var(--font-sans)', background: 'transparent', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
            削除
          </button>
        </div>
      </div>
    </div>
  );
}

function Chip({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 20, border: `1px solid ${color ?? 'var(--border)'}`, color: color ?? 'var(--ink-muted)', fontFamily: 'var(--font-sans)' }}>
      {children}
    </span>
  );
}

function ConfirmDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ background: 'rgba(28,25,23,0.4)' }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20 }} className="p-6 max-w-sm w-full">
        <p style={{ fontFamily: 'var(--font-serif)', color: 'var(--ink)', textAlign: 'center' }} className="mb-6 text-base">この荷物を削除しますか？</p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            style={{ flex: 1, padding: '10px 0', borderRadius: 12, border: '1px solid var(--border)', color: 'var(--ink-muted)', fontFamily: 'var(--font-sans)' }}>
            キャンセル
          </button>
          <button onClick={onConfirm}
            style={{ flex: 1, padding: '10px 0', borderRadius: 12, background: 'var(--ink)', color: '#fff', fontFamily: 'var(--font-sans)' }}>
            削除する
          </button>
        </div>
      </div>
    </div>
  );
}
