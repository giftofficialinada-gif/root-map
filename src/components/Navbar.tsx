import { Home, Map, Package, ArrowUpDown, BookOpen, type LucideIcon } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { TabType } from '../types';

const tabs: { id: TabType; label: string; Icon: LucideIcon }[] = [
  { id: 'home',     label: 'ホーム',  Icon: Home },
  { id: 'map',      label: '地図',    Icon: Map },
  { id: 'packages', label: '荷物',    Icon: Package },
  { id: 'route',    label: 'ルート',  Icon: ArrowUpDown },
  { id: 'history',  label: '記録',    Icon: BookOpen },
];

export default function Navbar() {
  const { activeTab, setActiveTab } = useAppStore();

  return (
    <div id="app-navbar"
      style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}
      className="flex items-stretch">
      {tabs.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              color: active ? 'var(--accent)' : 'var(--ink-muted)',
              fontFamily: 'var(--font-sans)',
              borderTop: active ? '2px solid var(--accent)' : '2px solid transparent',
              background: 'transparent',
            }}
            className="flex-1 flex flex-col items-center pt-2 pb-3 gap-0.5 transition-colors"
          >
            <tab.Icon size={18} strokeWidth={active ? 2 : 1.5} />
            <span style={{ fontSize: 10 }} className="font-medium">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
