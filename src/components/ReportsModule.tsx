import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { 
  Download, 
  RefreshCw, 
  BarChart2, 
  CheckCircle, 
  Search, 
  AlertCircle, 
  FileText, 
  Filter, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  ArrowUpDown, 
  Clock, 
  PlusCircle, 
  Info,
  ShieldCheck,
  Building,
  UserCheck,
  Layers,
  Package,
  ClipboardCheck,
  Truck,
  Zap,
  AlertTriangle,
  Archive,
  Grid
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const getKPIMeta = (key: string) => {
  switch (key) {
    case 'totalProduction':
      return { label: 'Total Production Qty', icon: <Layers className="w-5 h-5 text-indigo-500" />, color: 'text-indigo-600 dark:text-indigo-400' };
    case 'totalPacked':
      return { label: 'Total Packed Qty', icon: <Package className="w-5 h-5 text-emerald-500" />, color: 'text-emerald-600 dark:text-emerald-400' };
    case 'totalInspected':
      return { label: 'Total Inspected Qty', icon: <ClipboardCheck className="w-5 h-5 text-blue-500" />, color: 'text-blue-600 dark:text-blue-400' };
    case 'totalApproved':
      return { label: 'Total Approved OK', icon: <CheckCircle className="w-5 h-5 text-teal-500" />, color: 'text-teal-600 dark:text-teal-400' };
    case 'totalDispatched':
    case 'totalDispatchedQty':
      return { label: 'Total Dispatched Qty', icon: <Truck className="w-5 h-5 text-indigo-500" />, color: 'text-indigo-600 dark:text-indigo-400' };
    case 'averageYield':
      return { label: 'Average Yield', icon: <Zap className="w-5 h-5 text-yellow-500" />, color: 'text-yellow-600 dark:text-yellow-400', suffix: '%' };
    case 'totalHold':
      return { label: 'Total Hold Qty', icon: <AlertTriangle className="w-5 h-5 text-rose-500" />, color: 'text-rose-600 dark:text-rose-400' };
    case 'availableInventory':
      return { label: 'Available Inventory', icon: <Archive className="w-5 h-5 text-cyan-500" />, color: 'text-cyan-600 dark:text-cyan-400' };
    case 'totalDispatchedInvoices':
      return { label: 'Total Dispatched Invoices', icon: <FileText className="w-5 h-5 text-gray-500" />, color: 'text-gray-600 dark:text-gray-400' };
    case 'totalCustomersServed':
      return { label: 'Total Customers Served', icon: <UserCheck className="w-5 h-5 text-indigo-500" />, color: 'text-indigo-600 dark:text-indigo-400' };
    case 'activeModelsDispatched':
      return { label: 'Active Models Dispatched', icon: <Grid className="w-5 h-5 text-purple-500" />, color: 'text-purple-600 dark:text-purple-400' };
    case 'averageDispatchAgingDaysAfterPDI':
      return { label: 'Average Dispatch Aging', icon: <Clock className="w-5 h-5 text-amber-500" />, color: 'text-amber-600 dark:text-amber-400', suffix: ' Days' };
    default:
      return { 
        label: key.replace(/([A-Z])/g, ' $1').trim().replace(/\b\w/g, c => c.toUpperCase()), 
        icon: <BarChart2 className="w-5 h-5 text-gray-400" />, 
        color: 'text-gray-950 dark:text-white' 
      };
  }
};

export default function ReportsModule() {
  const [reportType, setReportType] = useState('model_wise');
  const [loading, setLoading] = useState(false);
  const [rawData, setRawData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [customerMetrics, setCustomerMetrics] = useState<any[]>([]);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlant, setSelectedPlant] = useState('All');
  const [selectedModel, setSelectedModel] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedCustomer, setSelectedCustomer] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Sorting & Pagination State
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Selected audit log row for detail dialog (First Time Hold History)
  const [selectedAuditRow, setSelectedAuditRow] = useState<any | null>(null);

  useEffect(() => {
    fetchReport();
    // Reset filters on report tab change
    setSearchTerm('');
    setSelectedPlant('All');
    setSelectedModel('All');
    setSelectedStatus('All');
    setSelectedCustomer('All');
    setStartDate('');
    setEndDate('');
    setSortField('');
    setCurrentPage(1);
  }, [reportType]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      let result;
      switch (reportType) {
        case 'model_wise':
          result = await api.reports.modelWise();
          break;
        case 'plant_wise':
          result = await api.reports.plantWise();
          break;
        case 'customer_wise':
          result = await api.reports.customerWise();
          break;
        case 'unused_serials':
          result = await api.reports.unusedSerials();
          break;
        case 'duplicate_checks':
          result = await api.reports.duplicateChecks();
          break;
        case 'hold_summary':
          result = await api.reports.holdSummary();
          break;
        default:
          result = { rows: [], summary: null };
      }
      setRawData(result.rows || []);
      setSummary(result.summary || null);
      setCustomerMetrics(result.customerMetrics || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Get filter lists from raw data dynamically
  const getUniqueValues = (key: string) => {
    const vals = rawData.map(item => item[key]).filter(Boolean);
    return ['All', ...Array.from(new Set(vals))];
  };

  const plantsList = getUniqueValues(
    reportType === 'plant_wise' ? 'plantName' : (reportType === 'model_wise' ? '' : (reportType === 'unused_serials' ? 'plantName' : 'plant'))
  );
  const modelsList = getUniqueValues('modelCode');
  const customersList = getUniqueValues('customerName');
  const statusesList = getUniqueValues('status');

  // Interactive local filtering
  const getFilteredData = () => {
    return rawData.filter(item => {
      // 1. Text Search Filter
      const searchString = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm ? true : Object.entries(item).some(([k, v]) => {
        if (typeof v === 'string') return v.toLowerCase().includes(searchString);
        if (typeof v === 'number') return v.toString().includes(searchString);
        return false;
      });

      // 2. Plant Filter
      let matchesPlant = true;
      if (selectedPlant !== 'All') {
        const itemPlant = item.plantName || item.plant || '';
        matchesPlant = itemPlant === selectedPlant;
      }

      // 3. Model Filter
      let matchesModel = true;
      if (selectedModel !== 'All') {
        const itemModel = item.modelCode || item.model || '';
        matchesModel = itemModel === selectedModel;
      }

      // 4. Status Filter
      let matchesStatus = true;
      if (selectedStatus !== 'All') {
        const itemStatus = item.status || item.currentStatus || '';
        matchesStatus = itemStatus === selectedStatus;
      }

      // 5. Customer Filter
      let matchesCustomer = true;
      if (selectedCustomer !== 'All') {
        const itemCustomer = item.customerName || item.customer || '';
        matchesCustomer = itemCustomer === selectedCustomer;
      }

      // 6. Date Filter
      let matchesDate = true;
      const dateVal = item.invoiceDate || item.allotmentDate || item.holdDate || item.createdAt || '';
      if (dateVal && dateVal !== '-') {
        const itemDate = new Date(dateVal).getTime();
        if (startDate) {
          const start = new Date(startDate).getTime();
          if (itemDate < start) matchesDate = false;
        }
        if (endDate) {
          const end = new Date(endDate).getTime() + (24 * 60 * 60 * 1000); // end of day
          if (itemDate > end) matchesDate = false;
        }
      }

      return matchesSearch && matchesPlant && matchesModel && matchesStatus && matchesCustomer && matchesDate;
    });
  };

  const filteredData = getFilteredData();

  // Sort Filtered Data
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortField) return 0;
    let valA = a[sortField];
    let valB = b[sortField];

    if (valA === undefined || valA === null) valA = '';
    if (valB === undefined || valB === null) valB = '';

    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    }
    return sortDirection === 'asc' 
      ? String(valA).localeCompare(String(valB)) 
      : String(valB).localeCompare(String(valA));
  });

  // Pagination calculations
  const totalItems = sortedData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginatedData = sortedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Convert array of objects to CSV download
  const exportToCSV = () => {
    if (filteredData.length === 0) return;
    const headers = Object.keys(filteredData[0]).filter(k => typeof filteredData[0][k] !== 'object');
    const csvRows = [
      headers.map(h => h.replace(/([A-Z])/g, ' $1').toUpperCase()).join(','), // headers
      ...filteredData.map(row =>
        headers.map(fieldName => {
          const val = row[fieldName];
          return JSON.stringify(val === null || val === undefined ? '' : val);
        }).join(',')
      )
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SNMS_Report_${reportType}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Trigger PDF standard print
  const handlePrintPDF = () => {
    window.print();
  };

  // Render dynamic Rechargets based on current report
  const renderChart = () => {
    if (filteredData.length === 0) return null;

    const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

    switch (reportType) {
      case 'model_wise':
        return (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-fade-in">
            {/* Chart */}
            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
              <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center space-x-2">
                <BarChart2 className="w-4 h-4 text-indigo-500" />
                <span>Production vs Packing vs Dispatch (By Model)</span>
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredData.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="modelCode" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="productionQty" name="Production" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="packedQty" name="Packed" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="dispatchedQty" name="Dispatched" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Model-wise Pending Serial Number to Pack KPI Cards */}
            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-1.5 flex items-center space-x-2">
                  <Grid className="w-4 h-4 text-indigo-500" />
                  <span>Model Operational & Pending Pack Status</span>
                </h3>
                <p className="text-[10px] text-gray-400 dark:text-gray-450 mb-4 leading-normal">
                  Real-time inventory queues highlighting battery model allotments, total production volume, and outstanding packing backlogs.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[220px] overflow-y-auto scrollbar-thin pr-1">
                  {filteredData.slice(0, 8).map((row, idx) => (
                    <div key={idx} className="bg-gray-50/50 dark:bg-slate-950/40 p-3 rounded-xl border border-gray-100/85 dark:border-slate-800/65 shadow-sm flex flex-col justify-between hover:border-gray-200 dark:hover:border-slate-700 transition duration-150">
                      <div className="flex items-start justify-between mb-1.5">
                        <div>
                          <span className="font-extrabold text-xs text-gray-950 dark:text-white block truncate max-w-[130px]" title={row.modelName}>
                            {row.modelName}
                          </span>
                          <span className="text-[9px] text-gray-400 dark:text-gray-500 font-mono">
                            Code: {row.modelCode}
                          </span>
                        </div>
                        {row.pendingToPack > 0 ? (
                          <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/30 text-[9px] font-extrabold text-amber-700 dark:text-amber-400 rounded-full font-mono animate-pulse">
                            PENDING PACK
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/30 text-[9px] font-extrabold text-emerald-700 dark:text-emerald-400 rounded-full font-mono">
                            COMPLETED
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 text-center mt-1">
                        <div className="bg-gray-100/50 dark:bg-slate-900/50 p-1.5 rounded-lg border border-gray-200/20">
                          <span className="text-[7.5px] text-gray-400 font-extrabold uppercase tracking-widest block">Produced</span>
                          <span className="text-xs font-black text-gray-900 dark:text-white font-mono block mt-0.5">{row.productionQty}</span>
                        </div>
                        <div className="bg-amber-50/30 dark:bg-amber-950/10 p-1.5 rounded-lg border border-amber-100/20">
                          <span className="text-[7.5px] text-amber-600 dark:text-amber-400 font-extrabold uppercase tracking-widest block">Pending</span>
                          <span className="text-xs font-black text-amber-600 dark:text-amber-400 font-mono block mt-0.5">{row.pendingToPack}</span>
                        </div>
                        <div className="bg-emerald-50/30 dark:bg-emerald-950/10 p-1.5 rounded-lg border border-emerald-100/20">
                          <span className="text-[7.5px] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase tracking-widest block">Packed</span>
                          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono block mt-0.5">{row.packedQty}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'plant_wise':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
              <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center space-x-2">
                <BarChart2 className="w-4 h-4 text-indigo-500" />
                <span>Production Parameters (Plant Comparison)</span>
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="plantName" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="productionQty" name="Produced" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="packedQty" name="Packed" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pdiApprovedQty" name="PDI OK" fill="#059669" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pdiHoldQty" name="PDI Hold" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
              <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span>Yield Efficiency % per Plant</span>
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="plantName" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="yieldPercent" name="Yield %" fill="#10b981" radius={[4, 4, 0, 0]}>
                      {filteredData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.yieldPercent > 90 ? '#10b981' : '#f59e0b'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        );

      case 'customer_wise':
        // Top Customers by dispatched qty
        const topCustomers = [...filteredData]
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 7);
        return (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Chart */}
            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
              <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-indigo-500" />
                <span>Highest Dispatch Orders (By Customer)</span>
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topCustomers} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis dataKey="customerName" type="category" width={150} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="quantity" name="Dispatched Qty" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Customer Wise Allotment vs Pending to Pack & Dispatched Analysis as KPI Cards */}
            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col">
              <div className="mb-4">
                <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-1.5 flex items-center space-x-2">
                  <Grid className="w-4 h-4 text-indigo-500" />
                  <span>Customer Dispatch & Packing Metrics</span>
                </h3>
                <p className="text-[10px] text-gray-400 dark:text-gray-450 leading-normal">
                  Real-time analytics showcasing allotment volume, packing backlog, and completed accounts per customer.
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[220px] overflow-y-auto scrollbar-thin pr-1">
                {customerMetrics.map((cust, idx) => {
                  const dispatchProgress = cust.totalAllotted > 0 
                    ? Math.round((cust.dispatched / cust.totalAllotted) * 100) 
                    : 0;

                  return (
                    <div key={idx} className="bg-gray-50/50 dark:bg-slate-950/40 p-3.5 rounded-xl border border-gray-100/80 dark:border-slate-800/65 shadow-sm hover:border-gray-200 dark:hover:border-slate-700 transition duration-150 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-start justify-between">
                          <span className="font-extrabold text-xs text-gray-950 dark:text-white truncate max-w-[120px]" title={cust.customerName}>
                            {cust.customerName}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-extrabold rounded font-mono">
                            Allotted: {cust.totalAllotted}
                          </span>
                        </div>
                        
                        {/* Custom Progress Bar showing dispatch completion */}
                        <div className="mt-2.5 space-y-1">
                          <div className="flex justify-between text-[8px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                            <span>Dispatch Completion</span>
                            <span>{dispatchProgress}%</span>
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                            <div 
                              className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all duration-300"
                              style={{ width: `${dispatchProgress}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="bg-amber-50/50 dark:bg-amber-950/10 p-2 rounded-lg border border-amber-100/30">
                          <span className="text-[8px] text-amber-600 dark:text-amber-400 font-extrabold uppercase tracking-widest block">Pending Pack</span>
                          <span className="text-xs font-black text-amber-600 dark:text-amber-400 font-mono block mt-0.5">{cust.pendingToPack}</span>
                        </div>
                        <div className="bg-emerald-50/50 dark:bg-emerald-950/10 p-2 rounded-lg border border-emerald-100/30">
                          <span className="text-[8px] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase tracking-widest block">Dispatched</span>
                          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono block mt-0.5">{cust.dispatched}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case 'unused_serials':
        // Calculate ageing brackets
        const brackets = {
          'New (<15d)': 0,
          'Active (15-30d)': 0,
          'Overdue (30-60d)': 0,
          'Critical (>60d)': 0
        };
        filteredData.forEach(item => {
          if (item.ageing < 15) brackets['New (<15d)']++;
          else if (item.ageing <= 30) brackets['Active (15-30d)']++;
          else if (item.ageing <= 60) brackets['Overdue (30-60d)']++;
          else brackets['Critical (>60d)']++;
        });
        const bracketData = Object.entries(brackets).map(([name, value]) => ({ name, value }));
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
              <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center space-x-2">
                <Clock className="w-4 h-4 text-rose-500" />
                <span>Ageing Bracket Distribution</span>
              </h3>
              <div className="h-64 flex justify-center items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={bracketData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#3b82f6" />
                      <Cell fill="#f59e0b" />
                      <Cell fill="#ef4444" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
              <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center space-x-2">
                <Building className="w-4 h-4 text-indigo-500" />
                <span>Unused Inventory Count (By Plant)</span>
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={Array.from(new Set(filteredData.map(d => d.plantName))).map(plant => ({
                    plant,
                    count: filteredData.filter(d => d.plantName === plant).length
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="plant" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" name="Unused Count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        );

      case 'duplicate_checks':
        // Show duplicates count by model code
        const duplicatesByModel: Record<string, number> = {};
        filteredData.forEach(item => {
          duplicatesByModel[item.modelCode] = (duplicatesByModel[item.modelCode] || 0) + 1;
        });
        const dupData = Object.entries(duplicatesByModel).map(([model, count]) => ({ model, count }));
        return (
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
            <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-500" />
              <span>Duplicate Serial Count by Model</span>
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dupData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="model" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" name="Duplicate Records" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

      case 'hold_summary':
        const holdsByPlant: Record<string, number> = {};
        const holdsByModel: Record<string, number> = {};
        filteredData.forEach(item => {
          holdsByPlant[item.plant || 'Unknown'] = (holdsByPlant[item.plant || 'Unknown'] || 0) + 1;
          holdsByModel[item.model || 'Unknown'] = (holdsByModel[item.model || 'Unknown'] || 0) + 1;
        });
        const holdPlantData = Object.entries(holdsByPlant).map(([plant, count]) => ({ plant, count }));
        const holdModelData = Object.entries(holdsByModel).map(([model, count]) => ({ model, count }));
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
            {/* Plant-wise Hold Battery Analysis */}
            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
              <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center space-x-2">
                <Building className="w-4 h-4 text-rose-500" />
                <span>Plant-wise Hold Battery Analysis</span>
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={holdPlantData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="plant" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" name="Incident Count" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Model-wise Hold Battery Analysis */}
            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
              <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center space-x-2">
                <BarChart2 className="w-4 h-4 text-indigo-500" />
                <span>Model-wise Hold Battery Analysis</span>
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={holdModelData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="model" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" name="Incident Count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto animate-fade-in print:p-0 print:space-y-4">
      <style>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          /* Custom styles for tables to prevent rows breaking awkwardly */
          table {
            page-break-inside: auto;
            width: 100% !important;
            border-collapse: collapse !important;
          }
          tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
          thead {
            display: table-header-group !important;
          }
          /* Ensure text colors print correctly and clearly */
          .text-amber-600 { color: #d97706 !important; }
          .text-emerald-600 { color: #059669 !important; }
          .text-rose-600 { color: #dc2626 !important; }
          .text-indigo-600 { color: #4f46e5 !important; }
          .text-gray-500 { color: #6b7280 !important; }
          .text-gray-900 { color: #111827 !important; }
          .font-bold { font-weight: 700 !important; }
          .font-black { font-weight: 900 !important; }
          
          /* Custom layout tweaks for PDF printing */
          @page {
            size: landscape;
            margin: 15mm 10mm 15mm 10mm;
          }
        }
      `}</style>
      {/* Corporate Print Header */}
      <div className="hidden print:flex justify-between items-center border-b-2 border-red-600 pb-5 mb-6">
        <div className="flex items-center gap-4 text-left">
          {/* LEADER LOGO */}
          <div className="w-32 h-auto flex-shrink-0">
            <svg className="w-full h-auto" viewBox="0 0 320 80" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="silver-grad-reports" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#CBD5E1" />
                  <stop offset="30%" stopColor="#F1F5F9" />
                  <stop offset="50%" stopColor="#94A3B8" />
                  <stop offset="70%" stopColor="#E2E8F0" />
                  <stop offset="100%" stopColor="#475569" />
                </linearGradient>
              </defs>
              {/* L */}
              <path d="M10 15 H22 V50 H45 V62 H10 V15 Z" fill="#E11D48" />
              {/* E */}
              <path d="M52 15 H87 V27 H64 V33 H84 V44 H64 V50 H88 V62 H52 V15 Z" fill="#E11D48" />
              {/* Stylized Triangular A (Silver metallic with red highlights) */}
              <path d="M120 15 L95 62 H110 L113 51 H127 L130 62 H145 L120 15 Z" fill="url(#silver-grad-reports)" />
              <path d="M120 22 L116 38 H124 L120 22 Z" fill="#FFFFFF" />
              <path d="M120 22 L118 28 H122 L120 22 Z" fill="#E11D48" />
              <path d="M114 34 H126 L120 46 L114 34 Z" fill="#E11D48" />
              {/* D */}
              <path d="M152 15 H177 C192 15 202 24 202 38.5 C202 53 192 62 177 62 H152 V15 Z M164 27 V50 H176 C184 50 189 45 189 38.5 C189 32 184 27 176 27 H164 Z" fill="#E11D48" />
              {/* E */}
              <path d="M209 15 H244 V27 H221 V33 H241 V44 H221 V50 H245 V62 H209 V15 Z" fill="#E11D48" />
              {/* R */}
              <path d="M252 15 H278 C290 15 298 22 298 34 C298 43 292 48 283 50 L300 62 H286 L271 51 H264 V62 H252 V15 Z M264 27 V41 H276 C282 41 286 38 286 34 C286 30 282 27 276 27 H264 Z" fill="#E11D48" />
              {/* TM */}
              <text x="302" y="24" fill="#E11D48" fontFamily="sans-serif" fontWeight="900" fontSize="10">TM</text>
              {/* ENERGY TO PERFORM Tagline */}
              <text x="10" y="76" fill="#E11D48" fontFamily="sans-serif" fontWeight="800" fontStyle="italic" fontSize="11" letterSpacing="3.5">ENERGY TO PERFORM</text>
            </svg>
          </div>
          <div className="border-l border-gray-250 pl-4 space-y-0.5">
            <span className="text-[9px] font-extrabold tracking-widest text-red-600 uppercase block">BUSINESS INTELLIGENCE DIVISION</span>
            <h1 className="text-lg font-black text-gray-900 leading-none">PILOT INDUSTRIES LTD</h1>
            <p className="text-[9px] text-gray-500 font-medium">ISO 9001:2015 & ISO 14001 Certified Enterprise Systems</p>
          </div>
        </div>
        <div className="text-right space-y-1">
          <span className="px-2 py-0.5 bg-red-50 text-red-700 font-mono text-[9px] font-bold rounded border border-red-100">OPERATIONS REPORT</span>
          <p className="text-[10px] text-gray-400 font-mono pt-1">Date: {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-gray-100 dark:border-slate-800/80 pb-5 print:border-none print:pb-0">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">ERP Operations Intelligence & Reports</h2>
          <p className="text-xs text-gray-500 font-medium">Extract, audit, and analyze production parameters, yields, dispatches, and quality hold timelines.</p>
        </div>
        <div className="flex space-x-2 print:hidden">
          <button
            onClick={fetchReport}
            className="p-2 border border-gray-200 dark:border-slate-800 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300 transition"
            title="Refresh Data"
          >
            <RefreshCw className="w-4.5 h-4.5" />
          </button>
          <button
            onClick={handlePrintPDF}
            className="flex items-center space-x-2 px-4 py-2 border border-indigo-200 hover:border-indigo-400 dark:border-slate-800 text-indigo-700 dark:text-indigo-400 text-xs font-bold rounded-xl shadow-sm transition"
          >
            <FileText className="w-4 h-4" />
            <span>Print PDF</span>
          </button>
          <button
            onClick={exportToCSV}
            disabled={filteredData.length === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Tab Selector Board */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 print:hidden">
        {[
          { id: 'model_wise', label: 'Model Metrics' },
          { id: 'plant_wise', label: 'Plant Yields' },
          { id: 'customer_wise', label: 'Customer Dispatches' },
          { id: 'unused_serials', label: 'Unused Inventory' },
          { id: 'duplicate_checks', label: 'Anti-Duplicate Checks' },
          { id: 'hold_summary', label: 'Hold Battery Analysis' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setReportType(tab.id)}
            className={`py-3 px-2 rounded-xl text-xs font-black border text-center transition tracking-tight ${
              reportType === tab.id 
                ? 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800/80 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-850'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Summary KPI Board */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
          {Object.entries(summary).map(([key, val]: any) => {
            const meta = getKPIMeta(key);
            return (
              <div key={key} className="bg-white dark:bg-slate-900 p-4 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm relative overflow-hidden transition-all duration-200 hover:shadow-md hover:border-gray-200 dark:hover:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400 uppercase font-extrabold tracking-widest">{meta.label}</span>
                  <div className="p-1.5 bg-gray-50 dark:bg-slate-950 rounded-lg">
                    {meta.icon}
                  </div>
                </div>
                <p className="text-2xl font-black text-gray-950 dark:text-white mt-2.5 font-mono tracking-tight">
                  {val}{meta.suffix || ''}
                </p>
                <div className="absolute -right-1 -bottom-1 opacity-[0.02] dark:opacity-[0.03]">
                  {meta.icon}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Filter Board */}
      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm space-y-3 print:hidden">
        <div className="flex items-center justify-between border-b border-gray-50 dark:border-slate-850 pb-2.5">
          <div className="flex items-center space-x-2 text-xs font-bold text-gray-900 dark:text-white">
            <Filter className="w-4 h-4 text-indigo-500" />
            <span>Interactive Filtering & Ledger Search</span>
          </div>
          {(searchTerm || selectedPlant !== 'All' || selectedModel !== 'All' || selectedStatus !== 'All' || selectedCustomer !== 'All' || startDate || endDate) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedPlant('All');
                setSelectedModel('All');
                setSelectedStatus('All');
                setSelectedCustomer('All');
                setStartDate('');
                setEndDate('');
              }}
              className="flex items-center space-x-1 text-[10px] text-rose-500 hover:text-rose-600 font-bold"
            >
              <X className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* Global Search Input */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search serials, invoice, model..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-4 py-2 border border-gray-100 dark:border-slate-800 rounded-xl text-xs bg-gray-50/50 dark:bg-slate-950 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Plant Dropdown */}
          {plantsList.length > 2 && (
            <div>
              <select
                value={selectedPlant}
                onChange={e => { setSelectedPlant(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 border border-gray-100 dark:border-slate-800 rounded-xl text-xs bg-gray-50/50 dark:bg-slate-950 text-gray-800 dark:text-gray-200 focus:outline-none"
              >
                <option value="All">All Plants</option>
                {plantsList.filter(p => p !== 'All').map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          )}

          {/* Model Dropdown */}
          {modelsList.length > 2 && (
            <div>
              <select
                value={selectedModel}
                onChange={e => { setSelectedModel(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 border border-gray-100 dark:border-slate-800 rounded-xl text-xs bg-gray-50/50 dark:bg-slate-950 text-gray-800 dark:text-gray-200 focus:outline-none"
              >
                <option value="All">All Models</option>
                {modelsList.filter(m => m !== 'All').map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          )}

          {/* Customer Dropdown */}
          {customersList.length > 2 && (
            <div>
              <select
                value={selectedCustomer}
                onChange={e => { setSelectedCustomer(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 border border-gray-100 dark:border-slate-800 rounded-xl text-xs bg-gray-50/50 dark:bg-slate-950 text-gray-800 dark:text-gray-200 focus:outline-none"
              >
                <option value="All">All Customers</option>
                {customersList.filter(c => c !== 'All').map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}

          {/* Status Dropdown */}
          {statusesList.length > 2 && (
            <div>
              <select
                value={selectedStatus}
                onChange={e => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 border border-gray-100 dark:border-slate-800 rounded-xl text-xs bg-gray-50/50 dark:bg-slate-950 text-gray-800 dark:text-gray-200 focus:outline-none"
              >
                <option value="All">All Statuses</option>
                {statusesList.filter(s => s !== 'All').map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}

          {/* Date range picker input */}
          <div className="flex items-center space-x-1 lg:col-span-2">
            <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input
              type="date"
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }}
              className="w-full px-2 py-1.5 border border-gray-100 dark:border-slate-800 rounded-lg text-[11px] bg-gray-50/50 dark:bg-slate-950 text-gray-800 dark:text-gray-200"
            />
            <span className="text-[10px] text-gray-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }}
              className="w-full px-2 py-1.5 border border-gray-100 dark:border-slate-800 rounded-lg text-[11px] bg-gray-50/50 dark:bg-slate-950 text-gray-800 dark:text-gray-200"
            />
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts Board */}
      <div className="print:hidden">
        {renderChart()}
      </div>

      {/* Main Ledger Table Grid */}
      {loading ? (
        <div className="p-16 text-center text-xs text-gray-400 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl flex flex-col justify-center items-center space-y-2">
          <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
          <span className="font-semibold text-gray-500 dark:text-gray-400">Compiling ledger records from live Firestore stream...</span>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="p-16 border border-dashed border-gray-250 dark:border-slate-800 rounded-2xl text-center text-xs text-gray-500 bg-white dark:bg-slate-900">
          No records captured matching the selected filter conditions.
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden print:hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-950 border-b border-gray-100 dark:border-slate-800 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {reportType === 'model_wise' && (
                    <>
                      <th className="px-6 py-4 cursor-pointer hover:bg-gray-100/50" onClick={() => handleSort('modelCode')}>Model Code <ArrowUpDown className="w-3 h-3 inline-block ml-1" /></th>
                      <th className="px-6 py-4 cursor-pointer hover:bg-gray-100/50" onClick={() => handleSort('modelName')}>Model Name <ArrowUpDown className="w-3 h-3 inline-block ml-1" /></th>
                      <th className="px-6 py-4 cursor-pointer text-right hover:bg-gray-100/50" onClick={() => handleSort('productionQty')}>Production Qty <ArrowUpDown className="w-3 h-3 inline-block ml-1" /></th>
                      <th className="px-6 py-4 cursor-pointer text-right hover:bg-gray-100/50" onClick={() => handleSort('packedQty')}>Packed Qty <ArrowUpDown className="w-3 h-3 inline-block ml-1" /></th>
                      <th className="px-6 py-4 cursor-pointer text-right hover:bg-gray-100/50" onClick={() => handleSort('pendingToPack')}>Pending to Pack <ArrowUpDown className="w-3 h-3 inline-block ml-1" /></th>
                      <th className="px-6 py-4 cursor-pointer text-right hover:bg-gray-100/50" onClick={() => handleSort('pdiInspectedQty')}>PDI Inspected <ArrowUpDown className="w-3 h-3 inline-block ml-1" /></th>
                      <th className="px-6 py-4 cursor-pointer text-right hover:bg-gray-100/50" onClick={() => handleSort('pdiApprovedQty')}>Approved <ArrowUpDown className="w-3 h-3 inline-block ml-1" /></th>
                      <th className="px-6 py-4 cursor-pointer text-right hover:bg-gray-100/50" onClick={() => handleSort('pdiRejectedQty')}>Rejected <ArrowUpDown className="w-3 h-3 inline-block ml-1" /></th>
                      <th className="px-6 py-4 cursor-pointer text-right hover:bg-gray-100/50" onClick={() => handleSort('pdiHoldQty')}>Hold Qty <ArrowUpDown className="w-3 h-3 inline-block ml-1" /></th>
                      <th className="px-6 py-4 cursor-pointer text-right hover:bg-gray-100/50" onClick={() => handleSort('dispatchedQty')}>Dispatched <ArrowUpDown className="w-3 h-3 inline-block ml-1" /></th>
                      <th className="px-6 py-4 cursor-pointer text-right hover:bg-gray-100/50" onClick={() => handleSort('yieldPercent')}>Yield % <ArrowUpDown className="w-3 h-3 inline-block ml-1" /></th>
                      <th className="px-6 py-4 cursor-pointer text-right hover:bg-gray-100/50" onClick={() => handleSort('rejectionPercent')}>Rejection % <ArrowUpDown className="w-3 h-3 inline-block ml-1" /></th>
                      <th className="px-6 py-4 cursor-pointer text-right hover:bg-gray-100/50" onClick={() => handleSort('availableInventory')}>Available Stock <ArrowUpDown className="w-3 h-3 inline-block ml-1" /></th>
                      <th className="px-6 py-4 cursor-pointer text-right hover:bg-gray-100/50" onClick={() => handleSort('duplicateCount')}>Duplicates <ArrowUpDown className="w-3 h-3 inline-block ml-1" /></th>
                    </>
                  )}
                  {reportType === 'plant_wise' && (
                    <>
                      <th className="px-6 py-4 cursor-pointer hover:bg-gray-100/50" onClick={() => handleSort('plantName')}>Plant Name <ArrowUpDown className="w-3 h-3 inline-block ml-1" /></th>
                      <th className="px-6 py-4">Location</th>
                      <th className="px-6 py-4 cursor-pointer text-right hover:bg-gray-100/50" onClick={() => handleSort('productionQty')}>Production Qty <ArrowUpDown className="w-3 h-3 inline-block ml-1" /></th>
                      <th className="px-6 py-4 cursor-pointer text-right hover:bg-gray-100/50" onClick={() => handleSort('packedQty')}>Packed Qty <ArrowUpDown className="w-3 h-3 inline-block ml-1" /></th>
                      <th className="px-6 py-4 cursor-pointer text-right hover:bg-gray-100/50" onClick={() => handleSort('pdiInspectedQty')}>Inspected Qty <ArrowUpDown className="w-3 h-3 inline-block ml-1" /></th>
                      <th className="px-6 py-4 cursor-pointer text-right hover:bg-gray-100/50" onClick={() => handleSort('pdiApprovedQty')}>Approved OK <ArrowUpDown className="w-3 h-3 inline-block ml-1" /></th>
                      <th className="px-6 py-4 cursor-pointer text-right hover:bg-gray-100/50" onClick={() => handleSort('pdiRejectedQty')}>Scrap/Rejected <ArrowUpDown className="w-3 h-3 inline-block ml-1" /></th>
                      <th className="px-6 py-4 cursor-pointer text-right hover:bg-gray-100/50" onClick={() => handleSort('pdiHoldQty')}>Hold Qty <ArrowUpDown className="w-3 h-3 inline-block ml-1" /></th>
                      <th className="px-6 py-4 cursor-pointer text-right hover:bg-gray-100/50" onClick={() => handleSort('dispatchedQty')}>Dispatched <ArrowUpDown className="w-3 h-3 inline-block ml-1" /></th>
                      <th className="px-6 py-4 cursor-pointer text-right hover:bg-gray-100/50" onClick={() => handleSort('reworkQty')}>Rework Qty <ArrowUpDown className="w-3 h-3 inline-block ml-1" /></th>
                      <th className="px-6 py-4 cursor-pointer text-right hover:bg-gray-100/50" onClick={() => handleSort('yieldPercent')}>Yield % <ArrowUpDown className="w-3 h-3 inline-block ml-1" /></th>
                    </>
                  )}
                  {reportType === 'customer_wise' && (
                    <>
                      <th className="px-6 py-4 cursor-pointer hover:bg-gray-100/50" onClick={() => handleSort('invoiceDate')}>Dispatch Date <ArrowUpDown className="w-3 h-3 inline-block ml-1" /></th>
                      <th className="px-6 py-4 cursor-pointer hover:bg-gray-100/50" onClick={() => handleSort('invoiceNumber')}>Invoice No <ArrowUpDown className="w-3 h-3 inline-block ml-1" /></th>
                      <th className="px-6 py-4 cursor-pointer hover:bg-gray-100/50" onClick={() => handleSort('customerName')}>Customer Name <ArrowUpDown className="w-3 h-3 inline-block ml-1" /></th>
                      <th className="px-6 py-4 cursor-pointer hover:bg-gray-100/50" onClick={() => handleSort('plant')}>Origin Plant <ArrowUpDown className="w-3 h-3 inline-block ml-1" /></th>
                      <th className="px-6 py-4 cursor-pointer hover:bg-gray-100/50" onClick={() => handleSort('modelCode')}>Model <ArrowUpDown className="w-3 h-3 inline-block ml-1" /></th>
                      <th className="px-6 py-4 cursor-pointer text-right hover:bg-gray-100/50" onClick={() => handleSort('quantity')}>Qty Dispatched <ArrowUpDown className="w-3 h-3 inline-block ml-1" /></th>
                      <th className="px-6 py-4">Serial Number Range</th>
                      <th className="px-6 py-4">Dispatched By</th>
                    </>
                  )}
                  {reportType === 'unused_serials' && (
                    <>
                      <th className="px-6 py-4 cursor-pointer hover:bg-gray-100/50" onClick={() => handleSort('serialNumber')}>Serial Number <ArrowUpDown className="w-3 h-3 inline-block ml-1" /></th>
                      <th className="px-6 py-4 cursor-pointer hover:bg-gray-100/50" onClick={() => handleSort('modelCode')}>Model Code <ArrowUpDown className="w-3 h-3 inline-block ml-1" /></th>
                      <th className="px-6 py-4 cursor-pointer hover:bg-gray-100/50" onClick={() => handleSort('plantName')}>Allotted Plant <ArrowUpDown className="w-3 h-3 inline-block ml-1" /></th>
                      <th className="px-6 py-4 cursor-pointer hover:bg-gray-100/50" onClick={() => handleSort('allotmentDate')}>Allotment Date <ArrowUpDown className="w-3 h-3 inline-block ml-1" /></th>
                      <th className="px-6 py-4 cursor-pointer text-right hover:bg-gray-100/50" onClick={() => handleSort('ageing')}>Ageing (Days) <ArrowUpDown className="w-3 h-3 inline-block ml-1" /></th>
                      <th className="px-6 py-4">Current Status</th>
                    </>
                  )}
                  {reportType === 'duplicate_checks' && (
                    <>
                      <th className="px-6 py-4 cursor-pointer hover:bg-gray-100/50" onClick={() => handleSort('serialNumber')}>Serial Number <ArrowUpDown className="w-3 h-3 inline-block ml-1" /></th>
                      <th className="px-6 py-4 text-center">Tag</th>
                      <th className="px-6 py-4 cursor-pointer hover:bg-gray-100/50" onClick={() => handleSort('modelCode')}>Model <ArrowUpDown className="w-3 h-3 inline-block ml-1" /></th>
                      <th className="px-6 py-4 cursor-pointer hover:bg-gray-100/50" onClick={() => handleSort('plantName')}>Allotted Plant <ArrowUpDown className="w-3 h-3 inline-block ml-1" /></th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Packing status</th>
                      <th className="px-6 py-4">Mfg Date</th>
                      <th className="px-6 py-4">Created At</th>
                      <th className="px-6 py-4">User</th>
                    </>
                  )}
                  {reportType === 'hold_summary' && (
                    <>
                      <th className="px-6 py-4 cursor-pointer hover:bg-gray-100/50" onClick={() => handleSort('holdDate')}>Hold Date <ArrowUpDown className="w-3 h-3 inline-block ml-1" /></th>
                      <th className="px-6 py-4">Plant</th>
                      <th className="px-6 py-4">Model</th>
                      <th className="px-6 py-4">Lot Number</th>
                      <th className="px-6 py-4 cursor-pointer hover:bg-gray-100/50" onClick={() => handleSort('serialNumberRange')}>Serial Number / Range <ArrowUpDown className="w-3 h-3 inline-block ml-1" /></th>
                      <th className="px-6 py-4">Hold Reason</th>
                      <th className="px-6 py-4">Hold Category</th>
                      <th className="px-6 py-4">Raised By</th>
                      <th className="px-6 py-4">Current Status</th>
                      <th className="px-6 py-4">Release Date</th>
                      <th className="px-6 py-4">Released By</th>
                      <th className="px-6 py-4 cursor-pointer text-right hover:bg-gray-100/50" onClick={() => handleSort('holdDuration')}>Hold Age (Days) <ArrowUpDown className="w-3 h-3 inline-block ml-1" /></th>
                      <th className="px-6 py-4 text-center print:hidden">Action</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-800 dark:text-gray-300 font-medium">
                {paginatedData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/10 transition-colors">
                    {reportType === 'model_wise' && (
                      <>
                        <td className="px-6 py-3 font-mono font-bold text-gray-950 dark:text-white">{row.modelCode}</td>
                        <td className="px-6 py-3">{row.modelName}</td>
                        <td className="px-6 py-3 text-right font-mono text-gray-900 dark:text-gray-100">{row.productionQty}</td>
                        <td className="px-6 py-3 text-right font-mono text-gray-900 dark:text-gray-100">{row.packedQty}</td>
                        <td className="px-6 py-3 text-right font-mono text-amber-500 font-bold">{row.pendingToPack}</td>
                        <td className="px-6 py-3 text-right font-mono text-gray-600 dark:text-gray-400">{row.pdiInspectedQty}</td>
                        <td className="px-6 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">{row.pdiApprovedQty}</td>
                        <td className="px-6 py-3 text-right font-mono text-rose-600 dark:text-rose-400">{row.pdiRejectedQty}</td>
                        <td className="px-6 py-3 text-right font-mono text-amber-500">{row.pdiHoldQty}</td>
                        <td className="px-6 py-3 text-right font-mono text-gray-900 dark:text-gray-100">{row.dispatchedQty}</td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{row.yieldPercent}%</span>
                            <div className="w-10 bg-gray-150 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-emerald-500 h-full" style={{ width: `${Math.min(100, row.yieldPercent)}%` }}></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-right font-mono text-rose-600 dark:text-rose-400 font-bold">{row.rejectionPercent}%</td>
                        <td className="px-6 py-3 text-right font-mono text-indigo-600 dark:text-indigo-400 font-bold">{row.availableInventory}</td>
                        <td className="px-6 py-3 text-right">
                          <span className={`font-mono font-bold ${row.duplicateCount > 0 ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/20 px-2 py-0.5 rounded' : 'text-gray-400'}`}>
                            {row.duplicateCount}
                          </span>
                        </td>
                      </>
                    )}

                    {reportType === 'plant_wise' && (
                      <>
                        <td className="px-6 py-3 font-bold text-gray-950 dark:text-white">{row.plantName}</td>
                        <td className="px-6 py-3 text-gray-500 dark:text-gray-400">{row.location}</td>
                        <td className="px-6 py-3 text-right font-mono text-gray-900 dark:text-gray-100">{row.productionQty}</td>
                        <td className="px-6 py-3 text-right font-mono text-gray-900 dark:text-gray-100">{row.packedQty}</td>
                        <td className="px-6 py-3 text-right font-mono text-gray-600 dark:text-gray-400">{row.pdiInspectedQty}</td>
                        <td className="px-6 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">{row.pdiApprovedQty}</td>
                        <td className="px-6 py-3 text-right font-mono text-rose-600 dark:text-rose-450">{row.pdiRejectedQty}</td>
                        <td className="px-6 py-3 text-right font-mono text-amber-500">{row.pdiHoldQty}</td>
                        <td className="px-6 py-3 text-right font-mono text-gray-900 dark:text-gray-100">{row.dispatchedQty}</td>
                        <td className="px-6 py-3 text-right font-mono text-indigo-500 font-bold">{row.reworkQty}</td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{row.yieldPercent}%</span>
                            <div className="w-10 bg-gray-150 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-indigo-500 h-full" style={{ width: `${Math.min(100, row.yieldPercent)}%` }}></div>
                            </div>
                          </div>
                        </td>
                      </>
                    )}

                    {reportType === 'customer_wise' && (
                      <>
                        <td className="px-6 py-3 font-mono text-gray-600 dark:text-gray-400">{row.invoiceDate}</td>
                        <td className="px-6 py-3 font-mono font-bold text-gray-900 dark:text-white">{row.invoiceNumber}</td>
                        <td className="px-6 py-3 font-semibold text-gray-900 dark:text-gray-100">{row.customerName}</td>
                        <td className="px-6 py-3">{row.plant}</td>
                        <td className="px-6 py-3 font-mono font-bold">{row.modelCode}</td>
                        <td className="px-6 py-3 text-right font-mono font-black text-indigo-600 dark:text-indigo-400">{row.quantity}</td>
                        <td className="px-6 py-3 font-mono text-gray-500 max-w-[200px] truncate" title={row.serialNumberRange}>{row.serialNumberRange}</td>
                        <td className="px-6 py-3 text-gray-500">{row.dispatchedBy}</td>
                      </>
                    )}

                    {reportType === 'unused_serials' && (
                      <>
                        <td className="px-6 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">{row.serialNumber}</td>
                        <td className="px-6 py-3 font-mono">{row.modelCode}</td>
                        <td className="px-6 py-3">{row.plantName}</td>
                        <td className="px-6 py-3 font-mono text-gray-600 dark:text-gray-400">{row.allotmentDate}</td>
                        <td className="px-6 py-3 text-right font-mono font-bold">
                          <span className={
                            row.ageing > 60 ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/20 px-2 py-0.5 rounded' : 
                            row.ageing > 30 ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded' : 
                            'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded'
                          }>
                            {row.ageing}d
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            row.status === 'Allotted' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                      </>
                    )}

                    {reportType === 'duplicate_checks' && (
                      <>
                        <td className="px-6 py-3 font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-50/10">{row.serialNumber}</td>
                        <td className="px-6 py-3 text-center">
                          <span className="px-2 py-0.5 text-[9px] font-bold bg-rose-100 text-rose-700 rounded-full">Duplicate #{row.occurrenceIndex}</span>
                        </td>
                        <td className="px-6 py-3 font-mono">{row.modelCode}</td>
                        <td className="px-6 py-3">{row.plantName}</td>
                        <td className="px-6 py-3">
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded">{row.status}</span>
                        </td>
                        <td className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-400">{row.packingStatus}</td>
                        <td className="px-6 py-3 font-mono text-gray-500">{row.mfgDate}</td>
                        <td className="px-6 py-3 font-mono text-gray-500">{row.createdAt}</td>
                        <td className="px-6 py-3 text-gray-500">{row.user}</td>
                      </>
                    )}

                    {reportType === 'hold_summary' && (
                      <>
                        <td className="px-6 py-3 font-mono font-bold text-gray-900 dark:text-white">{row.holdDate}</td>
                        <td className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-400">{row.plant}</td>
                        <td className="px-6 py-3 font-mono font-black">{row.model}</td>
                        <td className="px-6 py-3 font-mono text-gray-500">{row.lotNumber}</td>
                        <td className="px-6 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">{row.serialNumberRange}</td>
                        <td className="px-6 py-3 text-gray-500 truncate max-w-[150px]" title={row.holdReason}>{row.holdReason}</td>
                        <td className="px-6 py-3">
                          <span className="px-2 py-0.5 text-[9px] font-black bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 rounded">
                            {row.holdCategory}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-gray-500">{row.holdBy}</td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            row.currentStatus === 'Hold' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {row.currentStatus === 'Hold' ? 'On Hold' : `Released (${row.currentStatus})`}
                          </span>
                        </td>
                        <td className="px-6 py-3 font-mono text-gray-500">{row.releaseDate || '-'}</td>
                        <td className="px-6 py-3 text-gray-500">{row.releasedBy || '-'}</td>
                        <td className="px-6 py-3 text-right font-mono font-black">
                          <span className={row.currentStatus === 'Hold' ? 'text-rose-600' : 'text-gray-500'}>
                            {row.holdDuration} days
                          </span>
                        </td>
                        <td className="px-6 py-3 text-center print:hidden">
                          <button
                            onClick={() => setSelectedAuditRow(row)}
                            className="text-[10px] bg-gray-100 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:hover:bg-slate-700 px-2 py-1 rounded font-bold transition"
                          >
                            Audit Trail
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Interactive Pagination Control */}
          <div className="bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between print:hidden">
            <span className="text-[11px] text-gray-500 font-medium">
              Showing <span className="font-bold text-gray-900 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-bold text-gray-900 dark:text-white">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of <span className="font-bold text-gray-900 dark:text-white">{totalItems}</span> ledger results
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
              <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40 transition"
              >
                <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Full Non-Paginated Print-Only Ledger Table */}
        <div className="hidden print:block border border-gray-200 rounded-2xl overflow-hidden mt-6 bg-white">
          <table className="w-full text-left border-collapse text-[10px] leading-tight">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200 text-[9px] font-bold text-gray-700 uppercase tracking-wider">
                {reportType === 'model_wise' && (
                  <>
                    <th className="px-3 py-2.5">Model Code</th>
                    <th className="px-3 py-2.5">Model Name</th>
                    <th className="px-3 py-2.5 text-right">Production Qty</th>
                    <th className="px-3 py-2.5 text-right">Packed Qty</th>
                    <th className="px-3 py-2.5 text-right">Pending to Pack</th>
                    <th className="px-3 py-2.5 text-right">PDI Inspected</th>
                    <th className="px-3 py-2.5 text-right">Approved</th>
                    <th className="px-3 py-2.5 text-right">Rejected</th>
                    <th className="px-3 py-2.5 text-right">Hold Qty</th>
                    <th className="px-3 py-2.5 text-right">Dispatched</th>
                    <th className="px-3 py-2.5 text-right">Yield %</th>
                    <th className="px-3 py-2.5 text-right">Rejection %</th>
                    <th className="px-3 py-2.5 text-right">Available Stock</th>
                    <th className="px-3 py-2.5 text-right">Duplicates</th>
                  </>
                )}
                {reportType === 'plant_wise' && (
                  <>
                    <th className="px-3 py-2.5">Plant Name</th>
                    <th className="px-3 py-2.5">Location</th>
                    <th className="px-3 py-2.5 text-right">Production Qty</th>
                    <th className="px-3 py-2.5 text-right">Packed Qty</th>
                    <th className="px-3 py-2.5 text-right">Inspected Qty</th>
                    <th className="px-3 py-2.5 text-right">Approved OK</th>
                    <th className="px-3 py-2.5 text-right">Scrap/Rejected</th>
                    <th className="px-3 py-2.5 text-right">Hold Qty</th>
                    <th className="px-3 py-2.5 text-right">Dispatched</th>
                    <th className="px-3 py-2.5 text-right">Rework Qty</th>
                    <th className="px-3 py-2.5 text-right">Yield %</th>
                  </>
                )}
                {reportType === 'customer_wise' && (
                  <>
                    <th className="px-3 py-2.5">Dispatch Date</th>
                    <th className="px-3 py-2.5">Invoice No</th>
                    <th className="px-3 py-2.5">Customer Name</th>
                    <th className="px-3 py-2.5">Origin Plant</th>
                    <th className="px-3 py-2.5">Model</th>
                    <th className="px-3 py-2.5 text-right">Qty Dispatched</th>
                    <th className="px-3 py-2.5">Serial Number Range</th>
                    <th className="px-3 py-2.5">Dispatched By</th>
                  </>
                )}
                {reportType === 'unused_serials' && (
                  <>
                    <th className="px-3 py-2.5">Serial Number</th>
                    <th className="px-3 py-2.5">Model Code</th>
                    <th className="px-3 py-2.5">Allotted Plant</th>
                    <th className="px-3 py-2.5">Allotment Date</th>
                    <th className="px-3 py-2.5 text-right">Ageing (Days)</th>
                    <th className="px-3 py-2.5">Current Status</th>
                  </>
                )}
                {reportType === 'duplicate_checks' && (
                  <>
                    <th className="px-3 py-2.5">Serial Number</th>
                    <th className="px-3 py-2.5 text-center">Tag</th>
                    <th className="px-3 py-2.5">Model</th>
                    <th className="px-3 py-2.5">Allotted Plant</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Packing Status</th>
                    <th className="px-3 py-2.5">Mfg Date</th>
                    <th className="px-3 py-2.5">Created At</th>
                    <th className="px-3 py-2.5">User</th>
                  </>
                )}
                {reportType === 'hold_summary' && (
                  <>
                    <th className="px-3 py-2.5">Hold Date</th>
                    <th className="px-3 py-2.5">Plant</th>
                    <th className="px-3 py-2.5">Model</th>
                    <th className="px-3 py-2.5">Lot Number</th>
                    <th className="px-3 py-2.5">Serial Number / Range</th>
                    <th className="px-3 py-2.5">Hold Reason</th>
                    <th className="px-3 py-2.5">Hold Category</th>
                    <th className="px-3 py-2.5">Raised By</th>
                    <th className="px-3 py-2.5">Current Status</th>
                    <th className="px-3 py-2.5">Release Date</th>
                    <th className="px-3 py-2.5">Released By</th>
                    <th className="px-3 py-2.5 text-right">Hold Age (Days)</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-gray-800 font-medium bg-white">
              {sortedData.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  {reportType === 'model_wise' && (
                    <>
                      <td className="px-3 py-2 font-mono font-bold">{row.modelCode}</td>
                      <td className="px-3 py-2">{row.modelName}</td>
                      <td className="px-3 py-2 text-right font-mono">{row.productionQty}</td>
                      <td className="px-3 py-2 text-right font-mono">{row.packedQty}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-amber-600">{row.pendingToPack}</td>
                      <td className="px-3 py-2 text-right font-mono">{row.pdiInspectedQty}</td>
                      <td className="px-3 py-2 text-right font-mono text-emerald-600">{row.pdiApprovedQty}</td>
                      <td className="px-3 py-2 text-right font-mono text-rose-600">{row.pdiRejectedQty}</td>
                      <td className="px-3 py-2 text-right font-mono text-amber-500">{row.pdiHoldQty}</td>
                      <td className="px-3 py-2 text-right font-mono">{row.dispatchedQty}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-emerald-600">{row.yieldPercent}%</td>
                      <td className="px-3 py-2 text-right font-mono text-rose-600 font-bold">{row.rejectionPercent}%</td>
                      <td className="px-3 py-2 text-right font-mono text-indigo-600 font-bold">{row.availableInventory}</td>
                      <td className="px-3 py-2 text-right font-mono">{row.duplicateCount}</td>
                    </>
                  )}

                  {reportType === 'plant_wise' && (
                    <>
                      <td className="px-3 py-2 font-bold">{row.plantName}</td>
                      <td className="px-3 py-2 text-gray-500">{row.location}</td>
                      <td className="px-3 py-2 text-right font-mono">{row.productionQty}</td>
                      <td className="px-3 py-2 text-right font-mono">{row.packedQty}</td>
                      <td className="px-3 py-2 text-right font-mono">{row.pdiInspectedQty}</td>
                      <td className="px-3 py-2 text-right font-mono text-emerald-600">{row.pdiApprovedQty}</td>
                      <td className="px-3 py-2 text-right font-mono text-rose-600">{row.pdiRejectedQty}</td>
                      <td className="px-3 py-2 text-right font-mono text-amber-500">{row.pdiHoldQty}</td>
                      <td className="px-3 py-2 text-right font-mono">{row.dispatchedQty}</td>
                      <td className="px-3 py-2 text-right font-mono text-indigo-500 font-bold">{row.reworkQty}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-indigo-600">{row.yieldPercent}%</td>
                    </>
                  )}

                  {reportType === 'customer_wise' && (
                    <>
                      <td className="px-3 py-2 font-mono text-gray-600">{row.invoiceDate}</td>
                      <td className="px-3 py-2 font-mono font-bold">{row.invoiceNumber}</td>
                      <td className="px-3 py-2 font-semibold">{row.customerName}</td>
                      <td className="px-3 py-2">{row.plant}</td>
                      <td className="px-3 py-2 font-mono font-bold">{row.modelCode}</td>
                      <td className="px-3 py-2 text-right font-mono font-black text-indigo-600">{row.quantity}</td>
                      <td className="px-3 py-2 font-mono text-gray-500">{row.serialNumberRange}</td>
                      <td className="px-3 py-2 text-gray-500">{row.dispatchedBy}</td>
                    </>
                  )}

                  {reportType === 'unused_serials' && (
                    <>
                      <td className="px-3 py-2 font-mono font-bold text-indigo-600">{row.serialNumber}</td>
                      <td className="px-3 py-2 font-mono">{row.modelCode}</td>
                      <td className="px-3 py-2">{row.plantName}</td>
                      <td className="px-3 py-2 font-mono text-gray-600">{row.allotmentDate}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-indigo-600">{row.ageing}d</td>
                      <td className="px-3 py-2 font-bold">{row.status}</td>
                    </>
                  )}

                  {reportType === 'duplicate_checks' && (
                    <>
                      <td className="px-3 py-2 font-mono font-bold text-rose-600">{row.serialNumber}</td>
                      <td className="px-3 py-2 text-center text-[8px] font-bold text-rose-700">Duplicate #{row.occurrenceIndex}</td>
                      <td className="px-3 py-2 font-mono">{row.modelCode}</td>
                      <td className="px-3 py-2">{row.plantName}</td>
                      <td className="px-3 py-2 font-bold">{row.status}</td>
                      <td className="px-3 py-2 text-gray-600">{row.packingStatus}</td>
                      <td className="px-3 py-2 font-mono text-gray-500">{row.mfgDate}</td>
                      <td className="px-3 py-2 font-mono text-gray-500">{row.createdAt}</td>
                      <td className="px-3 py-2 text-gray-500">{row.user}</td>
                    </>
                  )}

                  {reportType === 'hold_summary' && (
                    <>
                      <td className="px-3 py-2 font-mono font-bold">{row.holdDate}</td>
                      <td className="px-3 py-2 font-semibold text-gray-600">{row.plant}</td>
                      <td className="px-3 py-2 font-mono font-black">{row.model}</td>
                      <td className="px-3 py-2 font-mono text-gray-500">{row.lotNumber}</td>
                      <td className="px-3 py-2 font-mono font-bold text-indigo-600">{row.serialNumberRange}</td>
                      <td className="px-3 py-2 text-gray-500">{row.holdReason}</td>
                      <td className="px-3 py-2 text-gray-600 font-bold">{row.holdCategory}</td>
                      <td className="px-3 py-2 text-gray-500">{row.holdBy}</td>
                      <td className="px-3 py-2 font-bold">{row.currentStatus === 'Hold' ? 'On Hold' : `Released (${row.currentStatus})`}</td>
                      <td className="px-3 py-2 font-mono text-gray-500">{row.releaseDate || '-'}</td>
                      <td className="px-3 py-2 text-gray-500">{row.releasedBy || '-'}</td>
                      <td className="px-3 py-2 text-right font-mono font-black text-rose-600">{row.holdDuration} days</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    )}

      {/* Audit Trail Modal for Hold History */}
      {selectedAuditRow && (
        <div className="fixed inset-0 bg-gray-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-lg w-full rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-slate-800 animate-scale-up">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-850 flex items-center justify-between bg-indigo-50/20">
              <div>
                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-rose-500" />
                  <span>Quality Hold Audit Log</span>
                </h3>
                <p className="text-[10px] text-gray-500 mt-0.5">Full status transition log for Serial: {selectedAuditRow.serialNumberRange}</p>
              </div>
              <button 
                onClick={() => setSelectedAuditRow(null)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition text-gray-400 hover:text-gray-600"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Core Incident Details */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-slate-950 p-4 rounded-xl text-[11px] border border-gray-100 dark:border-slate-800/60 font-medium text-gray-700 dark:text-gray-300">
                <div>
                  <span className="text-[9px] text-gray-400 uppercase tracking-wider block">Battery Model</span>
                  <span className="font-bold font-mono text-gray-900 dark:text-white text-xs">{selectedAuditRow.model}</span>
                </div>
                <div>
                  <span className="text-[9px] text-gray-400 uppercase tracking-wider block">Production Plant</span>
                  <span className="font-bold text-gray-900 dark:text-white text-xs">{selectedAuditRow.plant}</span>
                </div>
                <div className="mt-2">
                  <span className="text-[9px] text-gray-400 uppercase tracking-wider block">Date Placed on Hold</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{selectedAuditRow.holdDate} ({selectedAuditRow.inspectionTime})</span>
                </div>
                <div className="mt-2">
                  <span className="text-[9px] text-gray-400 uppercase tracking-wider block">Total Hold Duration</span>
                  <span className="font-semibold text-rose-600 font-bold">{selectedAuditRow.holdDuration} Days</span>
                </div>
              </div>

              {/* Chronological Timeline */}
              <div className="space-y-4">
                <span className="text-[10px] text-gray-400 uppercase font-black tracking-wider block">Chronological Status transitions</span>
                <div className="relative pl-6 border-l-2 border-indigo-100 dark:border-indigo-950 space-y-5">
                  {(selectedAuditRow.statusHistory || [
                    {
                      status: 'Hold',
                      changedAt: selectedAuditRow.holdDate,
                      changedBy: selectedAuditRow.holdBy,
                      remarks: selectedAuditRow.holdReason
                    }
                  ]).map((hist: any, hIdx: number) => (
                    <div key={hIdx} className="relative">
                      {/* Timeline Dot */}
                      <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center ${
                        hist.status === 'Hold' ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}>
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      </div>
                      
                      {/* Transition Card */}
                      <div className="bg-gray-50 dark:bg-slate-950/40 p-3 rounded-lg border border-gray-100 dark:border-slate-850 flex flex-col space-y-1">
                        <div className="flex justify-between items-center">
                          <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                            hist.status === 'Hold' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                          }`}>
                            {hist.status}
                          </span>
                          <span className="text-[9px] text-gray-400 font-mono">{new Date(hist.changedAt).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">{hist.remarks}</p>
                        <div className="flex items-center space-x-1 mt-1 text-[9px] text-gray-400">
                          <UserCheck className="w-3 h-3" />
                          <span>Logged By: {hist.changedBy || 'Auditor'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 dark:bg-slate-950 border-t border-gray-100 dark:border-slate-850 text-right">
              <button
                onClick={() => setSelectedAuditRow(null)}
                className="px-4 py-1.5 bg-indigo-600 text-white hover:bg-indigo-500 text-xs font-bold rounded-xl shadow transition"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
