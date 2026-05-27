import { useAppStore } from '../store/useAppStore';
import { TabType } from '../types';

const tabs: { id: TabType; label: string; icon: string }[] = [
  { id: 'map', label: '地図', icon: '🗺️' },
  { id: 'packages', label: '荷物', icon: '📦' },
  { id: 'route', label: 'ルート', icon: '🔀' },
  { id: 'history', label: '記録', icon: '📋' },
];

export default function Navbar() {
  const { activeTab, setActiveTab, currentUser, logout } = useAppStore();

  return (
    <div id="app-navbar" className="bg-white border-t border-slate-200 shadow-lg">
      <div className="flex items-center">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors ${
              activeTab === tab.id
                ? 'text-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className="text-xs font-medium">{tab.label}</span>
            {activeTab === tab.id && (
              <div className="absolute bottom-0 w-8 h-0.5 bg-blue-600 rounded-t" />
            )}
          </button>
        ))}
        <button
          onClick={logout}
          className="flex flex-col items-center py-2.5 gap-0.5 px-3 text-slate-400 hover:text-slate-600"
          title={`${currentUser}さん`}
        >
          <span className="text-xl">👤</span>
          <span className="text-xs">退出</span>
        </button>
      </div>
    </div>
  );
}
