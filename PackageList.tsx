import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Package, COOL_LABELS } from '../types';
import PackageModal from './PackageModal';

export default function PackageList() {
  const { selectedDate, setSelectedDate, getByDate, addPackage, updatePackage, deletePackage } =
    useAppStore();
  const packages = getByDate(selectedDate);

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Package | undefined>();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const stats = {
    total: packages.length,
    delivered: packages.filter((p) => p.delivered).length,
    cool: packages.filter((p) => p.cool !== 'none').length,
    collect: packages.filter((p) => p.collect).length,
    noGeo: packages.filter((p) => !p.lat).length,
  };

  const handleSave = (data: Omit<Package, 'id' | 'routeOrder'>) => {
    if (editTarget) {
      updatePackage(editTarget.id, data);
    } else {
      addPackage(data);
    }
    setShowModal(false);
    setEditTarget(undefined);
  };

  const openEdit = (pkg: Package) => {
    setEditTarget(pkg);
    setShowModal(true);
  };

  const openAdd = () => {
    setEditTarget(undefined);
    setShowModal(true);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
          />
          <button
            onClick={openAdd}
            className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-blue-700 whitespace-nowrap"
          >
            ＋ 追加
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          <StatBadge label="合計" value={stats.total} unit="件" color="blue" />
          <StatBadge label="配達済" value={stats.delivered} unit="件" color="green" />
          <StatBadge label="クール" value={stats.cool} unit="件" color="cyan" />
          <StatBadge label="コレクト" value={stats.collect} unit="件" color="amber" />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {packages.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <div className="text-5xl mb-3">📦</div>
            <p className="text-sm">荷物がありません</p>
            <p className="text-xs mt-1">「＋ 追加」から追加してください</p>
          </div>
        ) : (
          packages.map((pkg, idx) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              routeNo={idx + 1}
              onEdit={() => openEdit(pkg)}
              onDelete={() => setConfirmDelete(pkg.id)}
            />
          ))
        )}
      </div>

      {showModal && (
        <PackageModal
          pkg={editTarget}
          defaultDate={selectedDate}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditTarget(undefined); }}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          message="この荷物を削除しますか？"
          onConfirm={() => { deletePackage(confirmDelete); setConfirmDelete(null); }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

function PackageCard({
  pkg,
  routeNo,
  onEdit,
  onDelete,
}: {
  pkg: Package;
  routeNo: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { setDelivered } = useAppStore();

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border px-3 py-3 ${
        pkg.delivered ? 'border-green-200 opacity-75' : 'border-slate-200'
      }`}
    >
      <div className="flex items-start gap-2">
        {/* Route number */}
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5 ${
            pkg.delivered
              ? 'bg-green-500'
              : pkg.cool === 'frozen'
              ? 'bg-purple-600'
              : pkg.cool === 'refrigerated'
              ? 'bg-cyan-600'
              : 'bg-blue-600'
          }`}
        >
          {routeNo}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 truncate">{pkg.customerName}</span>
            {pkg.delivered && <span className="text-xs text-green-600 font-medium">✓配達済</span>}
          </div>
          <p className="text-xs text-slate-500 mt-0.5 truncate">{pkg.address}</p>
          <div className="flex flex-wrap gap-1 mt-1.5">
            <Tag>{pkg.size}s</Tag>
            {pkg.cool !== 'none' && (
              <Tag color={pkg.cool === 'frozen' ? 'purple' : 'cyan'}>{COOL_LABELS[pkg.cool]}</Tag>
            )}
            {pkg.collect && (
              <Tag color="amber">
                ¥コレクト{pkg.collectAmount ? ` ${pkg.collectAmount.toLocaleString()}` : ''}
              </Tag>
            )}
            {!pkg.lat && <Tag color="red">📍未取得</Tag>}
          </div>
          {pkg.notes && <p className="text-xs text-slate-400 mt-1">📝 {pkg.notes}</p>}
        </div>

        <div className="flex flex-col gap-1 flex-shrink-0">
          <button
            onClick={() => setDelivered(pkg.id, !pkg.delivered)}
            className={`text-xs px-2 py-1 rounded font-medium transition-colors ${
              pkg.delivered
                ? 'bg-slate-100 text-slate-600'
                : 'bg-green-100 text-green-700'
            }`}
          >
            {pkg.delivered ? '戻す' : '✓'}
          </button>
          <button onClick={onEdit} className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200">
            編集
          </button>
          <button onClick={onDelete} className="text-xs px-2 py-1 rounded bg-red-50 text-red-500 hover:bg-red-100">
            削除
          </button>
        </div>
      </div>
    </div>
  );
}

const tagColors: Record<string, string> = {
  default: 'bg-slate-100 text-slate-600',
  cyan: 'bg-cyan-100 text-cyan-700',
  purple: 'bg-purple-100 text-purple-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-500',
};

function Tag({ color = 'default', children }: { color?: string; children: React.ReactNode }) {
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${tagColors[color] ?? tagColors.default}`}>
      {children}
    </span>
  );
}

function StatBadge({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color: 'blue' | 'green' | 'cyan' | 'amber';
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    cyan: 'bg-cyan-50 text-cyan-700',
    amber: 'bg-amber-50 text-amber-700',
  };
  return (
    <div className={`rounded-lg px-2 py-1.5 text-center ${colors[color]}`}>
      <div className="text-lg font-bold leading-tight">
        {value}
        <span className="text-xs font-normal">{unit}</span>
      </div>
      <div className="text-xs opacity-80">{label}</div>
    </div>
  );
}

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
        <p className="text-slate-800 font-medium text-center mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 border border-slate-300 text-slate-700 py-2.5 rounded-xl font-medium">
            キャンセル
          </button>
          <button onClick={onConfirm} className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-medium">
            削除する
          </button>
        </div>
      </div>
    </div>
  );
}
