import { useState } from 'react';
import { useAppStore } from './store/useAppStore';
import Login from './components/Login';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import Navbar from './components/Navbar';
import MapView from './components/MapView';
import PackageList from './components/PackageList';
import RouteManager from './components/RouteManager';
import History from './components/History';
import Home from './components/Home';
import SplashScreen from './components/SplashScreen';

export default function App() {
  const { currentUser, activeTab, isAdminLoggedIn } = useAppStore();
  const [splash, setSplash] = useState(true);
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  if (splash) return <SplashScreen onDone={() => setSplash(false)} />;
  if (isAdminLoggedIn) return <AdminDashboard />;
  if (!currentUser) {
    if (showAdminLogin) return <AdminLogin onBack={() => setShowAdminLogin(false)} />;
    return <Login onAdminLogin={() => setShowAdminLogin(true)} />;
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'home' && <Home />}
        {activeTab === 'map' && <MapView />}
        {activeTab === 'packages' && <PackageList />}
        {activeTab === 'route' && <RouteManager />}
        {activeTab === 'history' && <History />}
      </div>
      <Navbar />
    </div>
  );
}
