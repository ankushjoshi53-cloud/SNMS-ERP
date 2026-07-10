import { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import PlantMaster from './components/PlantMaster';
import ModelMaster from './components/ModelMaster';
import CustomerMaster from './components/CustomerMaster';
import UserMaster from './components/UserMaster';
import SerialAllotment from './components/SerialAllotment';
import ProductionModule from './components/ProductionModule';
import PDIModule from './components/PDIModule';
import TransferModule from './components/TransferModule';
import DispatchModule from './components/DispatchModule';
import SearchModule from './components/SearchModule';
import ReportsModule from './components/ReportsModule';
import AuditLogViewer from './components/AuditLogViewer';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });

  // Load existing session on boot
  useEffect(() => {
    const savedToken = localStorage.getItem('erp_token');
    const savedUser = localStorage.getItem('erp_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // Update theme class on HTML element
  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);

  const handleLoginSuccess = (usr: any, tkn: string) => {
    setUser(usr);
    setToken(tkn);
  };

  const handleLogout = () => {
    localStorage.removeItem('erp_token');
    localStorage.removeItem('erp_user');
    setUser(null);
    setToken(null);
    setCurrentTab('dashboard');
  };

  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
    setSidebarOpen(false);
  };

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Render correct workspace module matching currentTab
  const renderTabContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'plants':
        return <PlantMaster currentUser={user} />;
      case 'models':
        return <ModelMaster currentUser={user} />;
      case 'customers':
        return <CustomerMaster currentUser={user} />;
      case 'users':
        return <UserMaster currentUser={user} />;
      case 'allotments':
        return <SerialAllotment currentUser={user} />;
      case 'production':
        return <ProductionModule currentUser={user} />;
      case 'pdi':
        return <PDIModule currentUser={user} />;
      case 'transfers':
        return <TransferModule userRole={user.role} currentUser={user} />;
      case 'dispatches':
        return <DispatchModule currentUser={user} />;
      case 'traceability':
        return <SearchModule />;
      case 'reports':
        return <ReportsModule />;
      case 'audit-logs':
        return <AuditLogViewer />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="h-screen w-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex overflow-hidden font-sans transition-colors duration-200">
      <Sidebar currentTab={currentTab} onChangeTab={handleTabChange} currentUser={user} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header user={user} onLogout={handleLogout} dark={dark} setDark={setDark} currentTab={currentTab} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto bg-slate-50/30 dark:bg-slate-950/20">
          {renderTabContent()}
        </main>
      </div>
    </div>
  );
}
