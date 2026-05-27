import { useState } from 'react';
import { useAppStore } from './store/useAppStore';
import Login from './components/Login';
import Navbar from './components/Navbar';
import MapView from './components/MapView';
import PackageList from './components/PackageList';
import RouteManager from './components/RouteManager';
import History from './components/History';
import SplashScreen from './components/SplashScreen';

export default function App() {
  const { currentUser, activeTab } = useAppStore();
  const [splash, setSplash] = useState(true);

  if (splash) return <SplashScreen onDone={() => setSplash(false)} />;
  if (!currentUser) return <Login />;

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'map' && <MapView />}
        {activeTab === 'packages' && <PackageList />}
        {activeTab === 'route' && <RouteManager />}
        {activeTab === 'history' && <History />}
      </div>
      <Navbar />
    </div>
  );
}
