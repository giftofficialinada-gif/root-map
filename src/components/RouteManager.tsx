import { useAppStore } from '../store/useAppStore';
import { Package, COOL_LABELS } from '../types';

export default function RouteManager() {
  const { selectedDate, setSelectedDate, getByDate, movePackage, setDelivered } = useAppStore();
  const packages = getByDate(selectedDate);

  const copyRouteText = () => {
    const lines = packages.map(
      (p, i) =>
        `${i + 1}. ${p.customerName}（${p.address}）${p.cool !== 'none' ? `[${COOL_LABELS[p.cool]}]` : ''}${p.collect ? '[コレクト]' : ''}${p.delivered ? '✓' : ''}`
    );
    navigator.clipboard.writeText(lines.join('\n'));
  };

  const total = packages.length;
  const delivered = packages.filter((p) => p.delivered).length;
  const remaining = total - delivered;

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
          {packages.length > 0 && (
            <button
              onClick={copyRouteText}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium"
            >
              📋 コピー
            </button>
          )}
        </div>

        {/* Progress */}
        {total > 0 && (
          <div>
            <div className="flex justify-between text-xs text-slate-600 mb-1">
              <span>配達進捗</span>
              <span>
                <span className="font-bold text-green-600">{delivered}</span> / {total}件
                （残り <span className="font-bold text-blue-600">{remaining}</span>件）
              </span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${total > 0 ? (delivered / total) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {packages.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <div className="text-5xl mb-3">🔀</div>
            <p className="text-sm">この日の荷物がありません</p>
            <p className="text-xs mt-1">「荷物」タブから追加してください</p>
          </div>
        ) : (
          packages.map((pkg, idx) => (
            <RouteItem
              key={pkg.id}
              pkg={pkg}
              routeNo={idx + 1}
              isFirst={idx === 0}
              isLast={idx === packages.length - 1}
              onMoveUp={() => movePackage(pkg.id, 'up')}
              onMoveDown={() => movePackage(pkg.id, 'down')}
              onToggleDelivered={() => setDelivered(pkg.id, !pkg.delivered)}
            />
          ))
        )}
      </div>

      {/* Summary footer */}
      {total > 0 && (
        <div className="bg-white border-t border-slate-200 px-4 py-3 flex-shrink-0">
          <SizeSummary packages={packages} />
        </div>
      )}
    </div>
  );
}

function RouteItem({
  pkg,
  routeNo,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onToggleDelivered,
}: {
  pkg: Package;
  routeNo: number;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleDelivered: () => void;
}) {
  return (
    <div
      className={`bg-white rounded-xl shadow-sm border flex items-center gap-2 px-3 py-3 ${
        pkg.delivered ? 'border-green-200 bg-green-50/30' : 'border-slate-200'
      }`}
    >
      {/* Reorder buttons */}
      <div className="flex flex-col gap-0.5">
        <button
          onClick={onMoveUp}
          disabled={isFirst}
          className="w-7 h-6 flex items-center justify-center rounded text-slate-400 hover:bg-slate-100 disabled:opacity-20 text-lg"
        >
          ▲
        </button>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          className="w-7 h-6 flex items-center justify-center rounded text-slate-400 hover:bg-slate-100 disabled:opacity-20 text-lg"
        >
          ▼
        </button>
      </div>

      {/* Route number */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${
          pkg.delivered
            ? 'bg-green-500'
            : pkg.cool === 'frozen'
            ? 'bg-purple-600'
            : pkg.cool === 'refrigerated'
            ? 'bg-cyan-600'
            : 'bg-blue-600'
        }`}
      >
        {pkg.collect ? '¥' : routeNo}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`font-semibold text-sm truncate ${pkg.delivered ? 'line-through text-slate-400' : 'text-slate-800'}`}>
            {pkg.customerName}
          </span>
        </div>
        <p className="text-xs text-slate-500 truncate">{pkg.address}</p>
        <div className="flex flex-wrap gap-1 mt-1">
          <span className="text-xs text-slate-500">{pkg.size}s</span>
          {pkg.cool !== 'none' && (
            <span className={`text-xs font-medium ${pkg.cool === 'frozen' ? 'text-purple-600' : 'text-cyan-600'}`}>
              {COOL_LABELS[pkg.cool]}
            </span>
          )}
          {pkg.collect && <span className="text-xs font-medium text-amber-600">コレクト</span>}
        </div>
      </div>

      {/* Delivered toggle */}
      <button
        onClick={onToggleDelivered}
        className={`w-9 h-9 rounded-full flex items-center justify-center text-xl flex-shrink-0 border-2 transition-colors ${
          pkg.delivered
            ? 'bg-green-500 border-green-500 text-white'
            : 'border-slate-300 text-slate-300 hover:border-green-400 hover:text-green-400'
        }`}
      >
        ✓
      </button>
    </div>
  );
}

function SizeSummary({ packages }: { packages: Package[] }) {
  const sizes = packages.reduce<Record<number, number>>((acc, p) => {
    acc[p.size] = (acc[p.size] ?? 0) + 1;
    return acc;
  }, {});

  const entries = Object.entries(sizes).sort(([a], [b]) => parseInt(a) - parseInt(b));

  return (
    <div>
      <p className="text-xs text-slate-500 mb-1.5 font-medium">サイズ内訳</p>
      <div className="flex flex-wrap gap-1.5">
        {entries.map(([size, count]) => (
          <span key={size} className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-medium">
            {size}s × {count}
          </span>
        ))}
        {packages.filter(p => p.cool !== 'none').length > 0 && (
          <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full font-medium">
            クール × {packages.filter(p => p.cool !== 'none').length}
          </span>
        )}
        {packages.filter(p => p.collect).length > 0 && (
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
            コレクト × {packages.filter(p => p.collect).length}
          </span>
        )}
      </div>
    </div>
  );
}
