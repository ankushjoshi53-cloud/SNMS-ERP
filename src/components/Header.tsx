import { useState, useEffect } from 'react';
import { Bell, Sun, Moon, LogOut, ShieldCheck, Factory, UserCheck, Menu } from 'lucide-react';
import { api } from '../lib/api';
import { Notification } from '../types';

interface HeaderProps {
  user: { name: string; email: string; role: string; plant: string } | null;
  onLogout: () => void;
  dark: boolean;
  setDark: (val: boolean) => void;
  currentTab?: string;
  onToggleSidebar?: () => void;
}

export default function Header({ user, onLogout, dark, setDark, currentTab, onToggleSidebar }: HeaderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [environment, setEnvironment] = useState<'demo' | 'live'>('demo');
  const [showEnvConfirm, setShowEnvConfirm] = useState(false);

  const tabTitles: Record<string, string> = {
    dashboard: 'Dashboard Overview',
    plants: 'Plant Management',
    models: 'Battery Model Master',
    customers: 'Customer Master',
    users: 'User Directory',
    allotments: 'Range Allotment Control',
    production: 'Packing Line Consumption',
    pdi: 'PDI Quality Check',
    transfers: 'Inter-Plant Transfer Log',
    dispatches: 'Dispatch Control',
    traceability: 'Serial Traceability Engine',
    reports: 'Enterprise Analytics Reports',
    'audit-logs': 'Security Audit Trail'
  };

  const title = tabTitles[currentTab || ''] || 'Dashboard Overview';

  useEffect(() => {
    if (user) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 10000); // Check every 10s
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    api.environment.get().then(res => {
      if (res && res.environment) {
        setEnvironment(res.environment);
      }
    }).catch(console.error);
  }, []);

  const handleToggleEnvironment = () => {
    setShowEnvConfirm(true);
  };

  const confirmEnvironmentSwitch = async () => {
    const targetEnv = environment === 'demo' ? 'live' : 'demo';
    try {
      await api.environment.set(targetEnv);
      setEnvironment(targetEnv);
      setShowEnvConfirm(false);
      window.location.reload();
    } catch (err) {
      console.error(err);
    }
  };

  const loadNotifications = async () => {
    try {
      const data = await api.notifications.list();
      setNotifications(data);
    } catch (e) {
      console.error(e);
    }
  };

  const markRead = async (id: string) => {
    try {
      await api.notifications.read(id);
      loadNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 md:px-8 flex items-center justify-between shrink-0 transition-colors duration-200">
      <div className="flex items-center space-x-3">
        {/* Mobile Sidebar Hamburger Toggle */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h2 className="font-semibold text-sm md:text-lg text-slate-800 dark:text-white font-display tracking-tight truncate max-w-[120px] xs:max-w-[180px] sm:max-w-none">
          {title}
        </h2>
        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          System Online
        </span>

        {/* Environment Toggle Button */}
        <button
          onClick={handleToggleEnvironment}
          className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border cursor-pointer transition-all duration-200 ${
            environment === 'live'
              ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-950/40'
              : 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-950/40'
          }`}
          title="Toggle between Live (Pristine) and Demo (Learning) databases"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${environment === 'live' ? 'bg-amber-500 animate-pulse' : 'bg-indigo-500 animate-pulse'}`}></span>
          Environment: {environment === 'live' ? 'Live (Pristine)' : 'Demo (Learning)'}
        </button>
      </div>

      <div className="flex items-center space-x-4">
        {/* Plant Indicator */}
        {user && (
          <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 bg-cyan-50 dark:bg-slate-800 text-cyan-700 dark:text-cyan-400 rounded-lg text-xs font-medium border border-cyan-100 dark:border-slate-700">
            <Factory className="w-3.5 h-3.5" />
            <span>Plant: {user.plant}</span>
          </div>
        )}

        {/* Theme Toggle */}
        <button
          onClick={() => setDark(!dark)}
          className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition"
          title="Toggle theme"
        >
          {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Notifications */}
        {user && (
          <div className="relative">
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition relative"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="p-3 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-slate-950">
                  <span className="font-semibold text-xs text-gray-900 dark:text-white">ERP Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded font-medium">
                      {unreadCount} New
                    </span>
                  )}
                </div>

                <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-xs text-gray-500">No recent notifications</div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        className={`p-3 text-xs transition ${n.read ? 'opacity-60' : 'bg-blue-50/40 dark:bg-slate-800/20'}`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className={`font-semibold ${
                            n.type === 'danger' ? 'text-rose-600 dark:text-rose-400' :
                            n.type === 'warning' ? 'text-amber-600 dark:text-amber-400' :
                            n.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' :
                            'text-indigo-600 dark:text-indigo-400'
                          }`}>
                            {n.type.toUpperCase()}
                          </span>
                          {!n.read && (
                            <button
                              onClick={() => markRead(n.id)}
                              className="text-[10px] text-cyan-600 dark:text-cyan-400 hover:underline"
                            >
                              Mark Read
                            </button>
                          )}
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 mb-1">{n.message}</p>
                        <span className="text-[10px] text-gray-400">{new Date(n.date).toLocaleString()}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* User Badge */}
        {user && (
          <div className="flex items-center space-x-3 pl-2 border-l border-gray-200 dark:border-gray-800">
            <div className="hidden lg:block text-right">
              <p className="text-sm font-semibold text-gray-950 dark:text-white leading-tight">{user.name}</p>
              <div className="flex items-center justify-end space-x-1">
                <ShieldCheck className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                <span className="text-[10px] text-gray-500 font-medium">{user.role}</span>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 transition"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}

        {showEnvConfirm && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <h3 className="text-base font-bold text-gray-950 dark:text-white">
                Switch to {environment === 'demo' ? 'LIVE Pristine' : 'DEMO Learning'} Environment?
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                {environment === 'demo' ? (
                  <>
                    The <strong>LIVE</strong> database is completely clean and ready from scratch. Register your Plants, Models, and Customers to start authentic, real-time tracking.
                    <br /><br />
                    <em>*Your Demo sandbox data will be preserved separately.*</em>
                  </>
                ) : (
                  <>
                    The <strong>DEMO</strong> database loads preloaded mock records and checklists. This is ideal for testing features, learning flows, and exploring sample reports safely.
                  </>
                )}
              </p>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEnvConfirm(false)}
                  className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-semibold hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmEnvironmentSwitch}
                  className={`px-4 py-2 rounded-lg text-xs font-bold text-white cursor-pointer ${
                    environment === 'demo'
                      ? 'bg-amber-600 hover:bg-amber-500'
                      : 'bg-indigo-600 hover:bg-indigo-500'
                  }`}
                >
                  Yes, Switch Environment
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
