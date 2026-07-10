import React, { useState, useEffect } from 'react';
import { Bell, Sun, Moon, LogOut, ShieldCheck, Factory, UserCheck, Menu, Database, Download, Upload, Trash2, Calendar, AlertTriangle, CheckCircle2, RefreshCw, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
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

  // Database administration & offline recovery states
  const [showDbConsole, setShowDbConsole] = useState(false);
  const [dbConsoleLoading, setDbConsoleLoading] = useState(false);
  const [dbConsoleSuccess, setDbConsoleSuccess] = useState<string | null>(null);
  const [dbConsoleError, setDbConsoleError] = useState<string | null>(null);
  const [parsedBackupData, setParsedBackupData] = useState<any | null>(null);
  const [importOption, setImportOption] = useState<'full' | 'date-wise'>('date-wise');
  const [importStartDate, setImportStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // Default to first day of current month
    return d.toISOString().split('T')[0];
  });
  const [showConfirmClearAll, setShowConfirmClearAll] = useState(false);
  const [showConfirmClearOperational, setShowConfirmClearOperational] = useState(false);
  const [showConfirmImport, setShowConfirmImport] = useState(false);

  const handleExportJson = async () => {
    setDbConsoleLoading(true);
    setDbConsoleError(null);
    setDbConsoleSuccess(null);
    try {
      const res = await api.admin.backup();
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.database, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `SNMS_ERP_Backup_${environment.toUpperCase()}_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setDbConsoleSuccess(`Active ${environment.toUpperCase()} database successfully exported as JSON.`);
    } catch (err: any) {
      console.error(err);
      setDbConsoleError(err.message || "Failed to download JSON backup.");
    } finally {
      setDbConsoleLoading(false);
    }
  };

  const handleExportExcel = async () => {
    setDbConsoleLoading(true);
    setDbConsoleError(null);
    setDbConsoleSuccess(null);
    try {
      const res = await api.admin.backup();
      const db = res.database;
      
      const wb = XLSX.utils.book_new();
      
      const addSheet = (arr: any[], name: string) => {
        const ws = XLSX.utils.json_to_sheet(arr && arr.length ? arr : [{ status: 'No Data' }]);
        XLSX.utils.book_append_sheet(wb, ws, name);
      };
      
      addSheet(db.users || [], "Users");
      addSheet(db.plants || [], "Plants");
      addSheet(db.models || [], "Battery Models");
      addSheet(db.customers || [], "Customers");
      addSheet(db.serialRanges || [], "Serial Ranges");
      addSheet(db.serialNumbers || [], "Serial Numbers");
      addSheet(db.production || [], "Production Logs");
      addSheet(db.pdi || [], "PDI Logs");
      addSheet(db.transfers || [], "Transfers");
      addSheet(db.dispatches || [], "Dispatches");
      addSheet(db.pdiOffered || [], "PDI Offered");
      addSheet(db.auditLogs || [], "Audit Trail");
      
      XLSX.writeFile(wb, `SNMS_ERP_Backup_${environment.toUpperCase()}_${new Date().toISOString().split('T')[0]}.xlsx`);
      setDbConsoleSuccess(`Active ${environment.toUpperCase()} database successfully exported as a multi-sheet Excel workbook.`);
    } catch (err: any) {
      console.error(err);
      setDbConsoleError(err.message || "Failed to generate Excel backup.");
    } finally {
      setDbConsoleLoading(false);
    }
  };

  const handleClearOperationalData = async () => {
    setDbConsoleLoading(true);
    setDbConsoleError(null);
    setDbConsoleSuccess(null);
    try {
      const res = await api.admin.clearSerialData();
      setDbConsoleSuccess(res.message || "Successfully cleared all operational and serial transactions.");
      setShowConfirmClearOperational(false);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setDbConsoleError(err.message || "Failed to clear operational transaction data.");
    } finally {
      setDbConsoleLoading(false);
    }
  };

  const handleClearAllData = async () => {
    setDbConsoleLoading(true);
    setDbConsoleError(null);
    setDbConsoleSuccess(null);
    try {
      const res = await api.admin.clearAllData();
      setDbConsoleSuccess(res.message || "Successfully performed complete factory reset of database.");
      setShowConfirmClearAll(false);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setDbConsoleError(err.message || "Failed to perform database clear reset.");
    } finally {
      setDbConsoleLoading(false);
    }
  };

  const handleBackupFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const db = json.database || json;
        if (!db.users || !db.plants || !db.models) {
          throw new Error("Invalid backup file: Core database tables are missing.");
        }
        setParsedBackupData(db);
        setDbConsoleError(null);
      } catch (err: any) {
        console.error(err);
        setDbConsoleError(err.message || "Invalid backup JSON file format.");
        setParsedBackupData(null);
      }
    };
    reader.readAsText(file);
  };

  const handleImportRestore = async () => {
    if (!parsedBackupData) return;
    setDbConsoleLoading(true);
    setDbConsoleError(null);
    setDbConsoleSuccess(null);
    
    try {
      let finalDB: any;
      
      if (importOption === 'full') {
        finalDB = parsedBackupData;
      } else {
        const res = await api.admin.backup();
        const currentDB = res.database;
        
        const filterDate = new Date(importStartDate);
        const isOnOrAfter = (dateStr?: string) => {
          if (!dateStr) return false;
          const dPart = dateStr.split('T')[0];
          return new Date(dPart) >= filterDate;
        };
        
        const mergeArrays = (currentArr: any[] = [], backupArr: any[] = [], key: string = 'id', dateKey?: string) => {
          const mergedMap = new Map();
          currentArr.forEach(item => {
            mergedMap.set(item[key], item);
          });
          backupArr.forEach(item => {
            const itemDate = item[dateKey || 'createdAt'] || item.date || item.timestamp || item.inspectionDate || item.transferDate || item.invoiceDate || item.offeredDate;
            if (isOnOrAfter(itemDate)) {
              mergedMap.set(item[key], item);
            }
          });
          return Array.from(mergedMap.values());
        };
        
        finalDB = {
          users: mergeArrays(currentDB.users, parsedBackupData.users, 'id', 'createdAt'),
          plants: mergeArrays(currentDB.plants, parsedBackupData.plants, 'id', 'createdAt'),
          models: mergeArrays(currentDB.models, parsedBackupData.models, 'id', 'createdAt'),
          customers: mergeArrays(currentDB.customers, parsedBackupData.customers, 'id', 'createdAt'),
          serialRanges: mergeArrays(currentDB.serialRanges, parsedBackupData.serialRanges, 'id', 'date'),
          serialNumbers: mergeArrays(currentDB.serialNumbers, parsedBackupData.serialNumbers, 'serialNumber', 'createdAt'),
          production: mergeArrays(currentDB.production, parsedBackupData.production, 'id', 'date'),
          transfers: mergeArrays(currentDB.transfers, parsedBackupData.transfers, 'id', 'transferDate'),
          dispatches: mergeArrays(currentDB.dispatches, parsedBackupData.dispatches, 'id', 'invoiceDate'),
          pdi: mergeArrays(currentDB.pdi, parsedBackupData.pdi, 'id', 'inspectionDate'),
          pdiOffered: mergeArrays(currentDB.pdiOffered, parsedBackupData.pdiOffered, 'id', 'offeredDate'),
          firstTimeHoldHistory: mergeArrays(currentDB.firstTimeHoldHistory || [], parsedBackupData.firstTimeHoldHistory || [], 'id', 'createdAt'),
          notifications: mergeArrays(currentDB.notifications || [], parsedBackupData.notifications || [], 'id', 'date'),
          auditLogs: mergeArrays(currentDB.auditLogs || [], parsedBackupData.auditLogs || [], 'id', 'timestamp'),
        };
      }
      
      await api.admin.restore(finalDB);
      setDbConsoleSuccess(
        importOption === 'full' 
          ? "Full database backup successfully restored!" 
          : `Database merged with backup data matching date range (from ${importStartDate})!`
      );
      setParsedBackupData(null);
      setShowConfirmImport(false);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setDbConsoleError(err.message || "Failed to restore / merge database backup.");
    } finally {
      setDbConsoleLoading(false);
    }
  };

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

        {/* Database Console (Super Admin only) */}
        {user && user.role === 'Super Admin' && (
          <button
            onClick={() => {
              setShowDbConsole(true);
              setDbConsoleSuccess(null);
              setDbConsoleError(null);
              setParsedBackupData(null);
            }}
            className="p-2 text-indigo-600 hover:text-indigo-950 dark:text-indigo-400 dark:hover:text-indigo-300 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition cursor-pointer"
            title="Database Control & Offline Recovery"
          >
            <Database className="w-5 h-5" />
          </button>
        )}

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

        {showDbConsole && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[90] p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-6 my-8">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-950 rounded-lg text-indigo-600 dark:text-indigo-400">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-950 dark:text-white">
                      Database Maintenance & Offline Recovery Console
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Active Workspace Environment: <span className="font-bold text-indigo-600 dark:text-indigo-400 uppercase">{environment}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDbConsole(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Close
                </button>
              </div>

              {/* Console Notifications / Messages */}
              {dbConsoleSuccess && (
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{dbConsoleSuccess}</span>
                </div>
              )}
              {dbConsoleError && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900 text-rose-800 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>{dbConsoleError}</span>
                </div>
              )}

              {/* Actions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 1. Offline Backups Card */}
                <div className="border border-gray-100 dark:border-slate-800 rounded-xl p-4 bg-gray-50/50 dark:bg-slate-900/40 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-gray-950 dark:text-white font-semibold text-sm">
                      <Download className="w-4 h-4 text-indigo-500" />
                      <span>Download Offline Backups</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      Securely export and save your database files locally. Keep backups safe in case of accidental cloud data loss or for local offline bookkeeping.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={dbConsoleLoading}
                      onClick={handleExportJson}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-700 dark:text-slate-300 rounded-lg text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download JSON
                    </button>
                    <button
                      type="button"
                      disabled={dbConsoleLoading}
                      onClick={handleExportExcel}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      Download Excel
                    </button>
                  </div>
                </div>

                {/* 2. Destructive Operations Card */}
                <div className="border border-rose-100 dark:border-rose-950 rounded-xl p-4 bg-rose-50/10 dark:bg-rose-950/5 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-rose-800 dark:text-rose-400 font-semibold text-sm">
                      <Trash2 className="w-4 h-4 text-rose-500" />
                      <span>System Factory Reset</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      Wipe the transaction databases or reset the entire workspace. Use this to clear test runs or when starting a clean industrial tracking period.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={dbConsoleLoading}
                      onClick={() => setShowConfirmClearOperational(true)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 border border-rose-200 hover:bg-rose-50 dark:border-rose-950 dark:hover:bg-rose-950/20 text-rose-700 dark:text-rose-400 rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Wipe Operational
                    </button>
                    <button
                      type="button"
                      disabled={dbConsoleLoading}
                      onClick={() => setShowConfirmClearAll(true)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      Wipe All Data
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. Offline Data Restore & Date-Wise Upload */}
              <div className="border border-gray-100 dark:border-slate-800 rounded-xl p-5 bg-slate-50/30 dark:bg-slate-900/10 space-y-4">
                <div className="flex items-center gap-2 text-gray-950 dark:text-white font-semibold text-sm">
                  <Upload className="w-4 h-4 text-indigo-500" />
                  <span>Offline Data Restore & Date-Wise Upload</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Upload a previously backed-up JSON file to restore settings or load transactions offline. You can upload everything, or selectively import only items created on or after a chosen date.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  {/* Dropzone / Upload area */}
                  <div className="border-2 border-dashed border-gray-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 rounded-xl p-4 flex flex-col items-center justify-center text-center transition relative bg-white dark:bg-slate-900 min-h-[140px]">
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {parsedBackupData ? "Backup File Loaded ✓" : "Choose Backup JSON File"}
                    </span>
                    <span className="text-[10px] text-gray-400 mt-1">
                      {parsedBackupData ? "Click to change file" : "Drag and drop or click to browse"}
                    </span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleBackupFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>

                  {/* Restore Configuration Settings */}
                  <div className="space-y-3.5 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-4 rounded-xl">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                      Choose Restore Scope:
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 cursor-pointer">
                        <input
                          type="radio"
                          name="importScope"
                          checked={importOption === 'full'}
                          onChange={() => setImportOption('full')}
                          className="text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                        />
                        <span>Full Restore (Overwrites entire active database)</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 cursor-pointer">
                        <input
                          type="radio"
                          name="importScope"
                          checked={importOption === 'date-wise'}
                          onChange={() => setImportOption('date-wise')}
                          className="text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                        />
                        <span>Date-wise Merge Upload (Add/update new records)</span>
                      </label>
                    </div>

                    {importOption === 'date-wise' && (
                      <div className="pt-2 border-t border-gray-100 dark:border-slate-800 space-y-1.5">
                        <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Only Import Records On or After Date:</span>
                        </label>
                        <input
                          type="date"
                          value={importStartDate}
                          onChange={(e) => setImportStartDate(e.target.value)}
                          className="w-full text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-2.5 py-2 focus:ring-1 focus:ring-indigo-500 outline-none text-gray-800 dark:text-gray-200"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {parsedBackupData && (
                  <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 p-4 rounded-xl space-y-3">
                    <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-300">
                      Backup File Record Summary (Unfiltered):
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono text-gray-600 dark:text-gray-400">
                      <div>Plants: <span className="font-bold text-indigo-600 dark:text-indigo-400">{parsedBackupData.plants?.length || 0}</span></div>
                      <div>Models: <span className="font-bold text-indigo-600 dark:text-indigo-400">{parsedBackupData.models?.length || 0}</span></div>
                      <div>Customers: <span className="font-bold text-indigo-600 dark:text-indigo-400">{parsedBackupData.customers?.length || 0}</span></div>
                      <div>Serial Numbers: <span className="font-bold text-indigo-600 dark:text-indigo-400">{parsedBackupData.serialNumbers?.length || 0}</span></div>
                      <div>Production Entries: <span className="font-bold text-indigo-600 dark:text-indigo-400">{parsedBackupData.production?.length || 0}</span></div>
                      <div>PDI Records: <span className="font-bold text-indigo-600 dark:text-indigo-400">{parsedBackupData.pdi?.length || 0}</span></div>
                      <div>Transfers: <span className="font-bold text-indigo-600 dark:text-indigo-400">{parsedBackupData.transfers?.length || 0}</span></div>
                      <div>Dispatches: <span className="font-bold text-indigo-600 dark:text-indigo-400">{parsedBackupData.dispatches?.length || 0}</span></div>
                    </div>
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setShowConfirmImport(true)}
                        disabled={dbConsoleLoading}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition disabled:opacity-50 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Execute Upload & Restore
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SUB-MODAL: Confirm Clear All (Destructive Reset) */}
        {showConfirmClearAll && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-950 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-2.5 text-rose-600">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
                <h3 className="text-base font-bold">
                  CRITICAL: Full Database Reset?
                </h3>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed space-y-2">
                <p>You are about to perform a <strong>COMPLETE FACTORY RESET</strong>.</p>
                <p>This will permanently wipe all plants, models, customers, serial registers, dispatches, quality metrics, and transactions in the <strong>{environment.toUpperCase()}</strong> database.</p>
                <p className="font-bold text-rose-500">Only your Super Admin account will remain active so you can register fresh setups. This cannot be undone.</p>
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmClearAll(false)}
                  className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-semibold hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleClearAllData}
                  disabled={dbConsoleLoading}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {dbConsoleLoading ? 'Processing...' : 'Yes, WIPE ALL DATA'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SUB-MODAL: Confirm Clear Operational Data */}
        {showConfirmClearOperational && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-950 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-2.5 text-rose-600">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="text-base font-bold">
                  Confirm Operational Data Wipe?
                </h3>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                This will permanently delete all <strong>serial range allotments, serial numbers, production entries, transfers, PDI quality records, and dispatch transactions</strong> in the <strong>{environment.toUpperCase()}</strong> workspace.
                <br /><br />
                <span className="font-bold text-indigo-600 dark:text-indigo-400">Master configurations (Plants, Battery Models, Customers, and Users) will remain perfectly untouched.</span>
              </p>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmClearOperational(false)}
                  className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-semibold hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleClearOperationalData}
                  disabled={dbConsoleLoading}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {dbConsoleLoading ? 'Wiping...' : 'Yes, Wipe Operational Data'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SUB-MODAL: Confirm Import Upload */}
        {showConfirmImport && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-2.5 text-indigo-600">
                <Upload className="w-6 h-6 animate-pulse" />
                <h3 className="text-base font-bold">
                  Confirm Database Restore?
                </h3>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                {importOption === 'full' ? (
                  <>
                    You are about to perform a <strong>FULL DATABASE RESTORE</strong>. This will overwrite all existing records with the contents of the backup file. Any changes made since the backup was taken will be lost.
                  </>
                ) : (
                  <>
                    You are about to perform a <strong>DATE-WISE MERGE UPLOAD</strong>. This will merge backup records created on or after <strong>{importStartDate}</strong> into your active database. No existing records outside this range will be modified.
                  </>
                )}
              </p>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmImport(false)}
                  className="px-3.5 py-2 border border-gray-200 dark:border-slate-800 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-semibold hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImportRestore}
                  disabled={dbConsoleLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {dbConsoleLoading ? 'Restoring...' : 'Yes, Apply Recovery'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
