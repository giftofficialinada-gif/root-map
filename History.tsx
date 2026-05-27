import { useState, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Package } from '../types';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';

export default function History() {
  const { packages, setSelectedDate, setActiveTab } = useAppStore();
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [viewMonth, setViewMonth] = useState(() => format(new Date(), 'yyyy-MM'));

  // Group packages by date
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
  const monthDates = allDates.filter((d) => d.startsWith(viewMonth));

  // Monthly totals
  const monthTotal = monthDates.reduce((sum, d) => sum + byDate[d].length, 0);
  const monthDelivered = monthDates.reduce(
    (sum, d) => sum + byDate[d].filter((p) => p.delivered).length,
    0
  );

  const navigateToDate = (date: string) => {
    setSelectedDate(date);
    setActiveTab('packages');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => {
              const d = new Date(monthStart);
              d.setMonth(d.getMonth() - 1);
              setViewMonth(format(d, 'yyyy-MM'));
            }}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
          >
            ◀
          </button>
          <span className="flex-1 text-center font-bold text-slate-800">
            {format(monthStart, 'yyyy年M月', { locale: ja })}
          </span>
          <button
            onClick={() => {
              const d = new Date(monthStart);
              d.setMonth(d.getMonth() + 1);
              setViewMonth(format(d, 'yyyy-MM'));
            }}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
          >
            ▶
          </button>
        </div>

        {/* Month summary */}
        <div className="grid grid-cols-3 gap-2">
          <SummaryBox label="持出し合計" value={monthTotal} unit="件" color="blue" />
          <SummaryBox label="配達済" value={monthDelivered} unit="件" color="green" />
          <SummaryBox label="稼働日数" value={monthDates.length} unit="日" color="slate" />
        </div>
      </div>

      {/* Day list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {monthDates.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <div className="text-5xl mb-3">📋</div>
            <p className="text-sm">この月の記録はありません</p>
          </div>
        ) : (
          monthDates.map((date) => {
            const dayPkgs = byDate[date].sort((a, b) => a.routeOrder - b.routeOrder);
            const delivered = dayPkgs.filter((p) => p.delivered).length;
            const cool = dayPkgs.filter((p) => p.cool !== 'none').length;
            const collect = dayPkgs.filter((p) => p.collect).length;
            const isExpanded = expandedDate === date;

            return (
              <div key={date} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Day header */}
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
                  onClick={() => setExpandedDate(isExpanded ? null : date)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">
                        {format(parseISO(date), 'M月d日（EEE）', { locale: ja })}
                      </span>
                      {delivered === dayPkgs.length && delivered > 0 && (
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                          完了
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3 mt-1 text-xs text-slate-500">
                      <span>持出し <b className="text-blue-600">{dayPkgs.length}</b>件</span>
                      <span>配達済 <b className="text-green-600">{delivered}</b>件</span>
                      {cool > 0 && <span>クール <b className="text-cyan-600">{cool}</b>件</span>}
                      {collect > 0 && <span>コレクト <b className="text-amber-600">{collect}</b>件</span>}
                    </div>
                  </div>
                  <div className="text-slate-400 text-sm">{isExpanded ? '▲' : '▼'}</div>
                </button>

                {/* Expanded: package list */}
                {isExpanded && (
                  <div className="border-t border-slate-100">
                    <SizeSummaryRow packages={dayPkgs} />
                    {dayPkgs.map((pkg, idx) => (
                      <div
                        key={pkg.id}
                        className={`flex items-center gap-2 px-4 py-2 text-sm border-t border-slate-50 ${
                          pkg.delivered ? 'text-slate-400' : 'text-slate-700'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-xs text-white font-bold flex-shrink-0 ${
                            pkg.delivered ? 'bg-green-400' : 'bg-blue-500'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <span className={`flex-1 truncate ${pkg.delivered ? 'line-through' : ''}`}>
                          {pkg.customerName}
                        </span>
                        <span className="text-xs text-slate-400">{pkg.size}s</span>
                        {pkg.cool !== 'none' && (
                          <span className={`text-xs font-medium ${pkg.cool === 'frozen' ? 'text-purple-500' : 'text-cyan-500'}`}>
                            {pkg.cool === 'frozen' ? '冷凍' : '冷蔵'}
                          </span>
                        )}
                        {pkg.collect && <span className="text-xs text-amber-500 font-medium">¥</span>}
                      </div>
                    ))}
                    <div className="px-4 py-2 flex justify-end">
                      <button
                        onClick={() => navigateToDate(date)}
                        className="text-xs text-blue-600 font-medium hover:underline"
                      >
                        この日の詳細を見る →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function SizeSummaryRow({ packages }: { packages: Package[] }) {
  const sizes = packages.reduce<Record<number, number>>((acc, p) => {
    acc[p.size] = (acc[p.size] ?? 0) + 1;
    return acc;
  }, {});
  const entries = Object.entries(sizes).sort(([a], [b]) => parseInt(a) - parseInt(b));

  return (
    <div className="px-4 py-2 flex flex-wrap gap-1.5 bg-slate-50">
      {entries.map(([size, count]) => (
        <span key={size} className="text-xs bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
          {size}s × {count}
        </span>
      ))}
    </div>
  );
}

function SummaryBox({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color: 'blue' | 'green' | 'slate';
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    slate: 'bg-slate-100 text-slate-700',
  };
  return (
    <div className={`rounded-xl px-2 py-2 text-center ${colors[color]}`}>
      <div className="text-xl font-bold leading-tight">
        {value}
        <span className="text-xs font-normal ml-0.5">{unit}</span>
      </div>
      <div className="text-xs opacity-70 mt-0.5">{label}</div>
    </div>
  );
}
