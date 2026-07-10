import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {
  ClipboardCheck,
  Truck,
  Layers,
  ArrowLeftRight,
  TrendingUp,
  FileCheck2,
  RefreshCw,
  Clock,
  MapPin,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line
} from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    return new Date().toISOString().slice(0, 7);
  });

  const availableMonths = (() => {
    if (!stats) return [];
    const monthsSet = new Set<string>();
    
    // Always include current month
    const curMonth = new Date().toISOString().slice(0, 7);
    monthsSet.add(curMonth);

    if (stats.rawProduction) {
      stats.rawProduction.forEach((p: any) => {
        if (p.date && p.date.length >= 7) {
          monthsSet.add(p.date.slice(0, 7));
        }
      });
    }

    if (stats.rawDispatches) {
      stats.rawDispatches.forEach((d: any) => {
        if (d.date && d.date.length >= 7) {
          monthsSet.add(d.date.slice(0, 7));
        }
      });
    }

    return Array.from(monthsSet).sort().reverse();
  })();

  const chartData = (() => {
    if (!stats || !selectedMonth) return [];

    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    const daysInMonth = new Date(year, month, 0).getDate();

    const data = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = String(day).padStart(2, '0');
      const dateKey = `${selectedMonth}-${dayStr}`;

      let packedQty = 0;
      if (stats.rawProduction) {
        stats.rawProduction.forEach((p: any) => {
          if (p.date === dateKey) {
            packedQty += (p.quantity || 1);
          }
        });
      }

      let dispatchedQty = 0;
      if (stats.rawDispatches) {
        stats.rawDispatches.forEach((d: any) => {
          if (d.date === dateKey) {
            dispatchedQty += (d.quantity || 0);
          }
        });
      }

      data.push({
        name: dayStr,
        Packed: packedQty,
        Dispatched: dispatchedQty,
      });
    }

    return data;
  })();

  const formatMonthLabel = (mStr: string) => {
    const [y, m] = mStr.split('-');
    const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Parse logged-in user profile to render authorized plant context
  const savedUser = localStorage.getItem('erp_user');
  const user = savedUser ? JSON.parse(savedUser) : null;

  useEffect(() => {
    loadStats();

    // Establish real-time SSE connection
    const token = localStorage.getItem('erp_token');
    if (!token) return;

    const eventSource = new EventSource(`/api/dashboard/realtime?token=${encodeURIComponent(token)}`);

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'update') {
          // Re-fetch stats in the background to avoid blocking the user experience with loading indicators
          api.dashboard.stats().then(data => {
            setStats(data);
          }).catch(err => console.error('Error sync real-time dashboard data:', err));
        }
      } catch (err) {
        // Safe catch for parsing keep-alives or comments
      }
    };

    eventSource.onerror = (err) => {
      console.warn('Real-time connection dropped. Retrying in background...', err);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await api.dashboard.stats();
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="p-8 space-y-6 flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-slate-500 font-medium font-sans">Loading Real-Time ERP Analytics...</span>
      </div>
    );
  }

  const kpis = [
    { title: "Today's Production", value: stats.todayProduction, desc: "Units produced today", icon: ClipboardCheck, text: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30" },
    { title: "Today's Dispatch", value: stats.todayDispatch, desc: "Units shipped today", icon: Truck, text: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30" },
    { title: "Pending PDI Checklist", value: stats.pendingPdi, desc: "Batteries awaiting QA", icon: AlertTriangle, text: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30" },
    { title: "Available (Stock)", value: stats.availableSerials, desc: "PDI approved stock", icon: Layers, text: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30" },
    { title: "Inter-Plant Transfers", value: stats.transferredQuantity, desc: "Logistics transfers completed", icon: ArrowLeftRight, text: "text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/30" }
  ];

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header and Sync Indicator */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight font-display flex items-center gap-2">
            <span>Executive Dashboard</span>
            {user && (
              <span className="text-[11px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 px-2.5 py-0.5 rounded-full select-none">
                {user.plant === 'All' ? 'All Plants (Corporate)' : `Unit: ${user.plant}`}
              </span>
            )}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {user && user.plant !== 'All'
              ? `Real-time analytics for Lead-acid battery production & supply chain restricted to ${user.plant}.`
              : "Lead-acid battery production & serial-level supply chain visibility across all locations."
            }
          </p>
        </div>
        <button
          onClick={loadStats}
          className="flex items-center space-x-2 px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Sync Live Data</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-5 relative overflow-hidden transition hover:shadow-md">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-widest">{kpi.title}</p>
                <h3 className="text-2xl font-extrabold text-slate-950 dark:text-white mt-1 font-mono">{kpi.value}</h3>
              </div>
              <div className={`p-2 rounded-xl shrink-0 ${kpi.text}`}>
                <kpi.icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">{kpi.desc}</p>
          </div>
        ))}
      </div>

      {/* Charts Block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Production Trends */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-5 flex flex-col h-[360px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest font-display flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              <span>Day-wise Packing & Dispatch Trends</span>
            </h4>
            <div className="flex items-center gap-2">
              <label htmlFor="month-filter" className="text-[10px] uppercase font-bold text-slate-400">Month:</label>
              <select
                id="month-filter"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold rounded-lg px-2 py-0.5 text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                {availableMonths.map(m => (
                  <option key={m} value={m}>
                    {formatMonthLabel(m)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex-1 w-full h-full min-h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.06} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} label={{ value: 'Day', position: 'insideBottom', offset: -2, fontSize: 10, fill: '#94a3b8' }} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="Packed" name="Daily Packed" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="Dispatched" name="Daily Dispatched" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stock Balance By Model */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-5 flex flex-col h-[360px]">
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest font-display mb-4">Model Stock Balance</h4>
          <div className="flex-1 w-full h-full min-h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.stockBalance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.06} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Produced" fill="#6366f1" name="Produced" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Available" fill="#10b981" name="Available" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Dispatched" fill="#f59e0b" name="Dispatched" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plant Wise Balance */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-5 h-[340px] flex flex-col">
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest font-display mb-4">Plant Stock Load</h4>
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {Object.keys(stats.plantBalances).map(plant => (
              <div key={plant} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                    {plant}
                  </span>
                  <span className="font-mono font-bold text-slate-950 dark:text-white">{stats.plantBalances[plant]} Batteries</span>
                </div>
                <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full"
                    style={{ width: `${Math.min(100, (stats.plantBalances[plant] / 20) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Audit Activities */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-5 h-[340px] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest font-display">Live Audit Trail Feed</h4>
            <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-slate-600 dark:text-slate-300 rounded flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Real-Time Logs</span>
            </span>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 pr-1">
            {stats.recentActivities.length === 0 ? (
              <p className="p-4 text-center text-xs text-slate-400">No actions logged yet</p>
            ) : (
              stats.recentActivities.map((activity: any) => (
                <div key={activity.id} className="py-2.5 text-xs flex justify-between items-start gap-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-white">{activity.who}</span>
                      <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-[9px] font-bold uppercase tracking-wider border border-slate-200/50 dark:border-slate-700/50">
                        {activity.what}
                      </span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] truncate max-w-sm md:max-w-xl">
                      {activity.newValue}
                    </p>
                  </div>
                  <div className="text-right text-[10px] text-slate-400 shrink-0">
                    <p>{new Date(activity.when).toLocaleTimeString()}</p>
                    <p className="font-mono text-[9px]">{activity.ipAddress}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
