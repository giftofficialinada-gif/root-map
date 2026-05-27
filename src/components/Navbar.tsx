import { useAppStore } from '../store/useAppStore';
import { TabType } from '../types';

const tabs: { id: TabType; label: string; icon: string }[] = [
  { id: 'map',      label: '地図',  icon: '🗺' },
  { id: 'packages', label: '荷物',  icon: '📦' },
  { id: 'route',    label: 'ルート', icon: '↕' },
  { id: 'history',  label: '記録',  icon: '冊' },
];

export default function Navbar() {
  const { activeTab, setActiveTab, logout } = useAppStore();

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
            <span className="text-lg leading-none">{tab.icon}</span>
            <span className="text-xs font-medium">{tab.label}</span>
          </button>
        );
      })}
      <button
        onClick={logout}
        style={{ color: 'var(--ink-muted)', fontFamily: 'var(--font-sans)', background: 'transparent', borderTop: '2px solid transparent' }}
        className="flex flex-col items-center pt-2 pb-3 gap-0.5 px-3 hover:opacity-70 transition-opacity"
      >
        <span className="text-lg leading-none">👤</span>
        <span className="text-xs">退出</span>
      </button>
    </div>
  );
}
