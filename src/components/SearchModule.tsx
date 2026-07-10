import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { SerialNumber } from '../types';
import {
  Search,
  Info,
  MapPin,
  Calendar,
  Clock,
  ClipboardCheck,
  ArrowLeftRight,
  Truck,
  User,
  QrCode,
  ArrowUpDown,
  X,
  Filter,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

export default function SearchModule() {
  const [query, setQuery] = useState({
    serialNumber: '',
    customer: '',
    model: '',
    invoice: '',
    date: '',
    plant: '',
    status: '',
    dateType: '', // 'mfgDate' | 'dispatchDate' | 'transferDate'
    startDate: '',
    endDate: ''
  });
  const [results, setResults] = useState<SerialNumber[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // Active Sorting hierarchy
  const [sorts, setSorts] = useState<Array<{ column: keyof SerialNumber; label: string; direction: 'asc' | 'desc' }>>([]);

  // Trace details state
  const [selectedSerial, setSelectedSerial] = useState<string | null>(null);
  const [traceData, setTraceData] = useState<any>(null);
  const [traceLoading, setTraceLoading] = useState(false);

  useEffect(() => {
    handleSearch();
  }, []);

  const handleSearch = async () => {
    setLoading(true);
    setError('');
    setPage(1); // Reset to first page
    try {
      const params: Record<string, string> = {};
      Object.keys(query).forEach(k => {
        const val = query[k as keyof typeof query];
        if (val) params[k] = val;
      });

      const list = await api.search.query(params);
      setResults(list);
    } catch (err: any) {
      setError(err.message || 'Search execution failed');
    } finally {
      setLoading(false);
    }
  };

  const handleTrace = async (serial: string) => {
    setSelectedSerial(serial);
    setTraceLoading(true);
    setTraceData(null);
    try {
      const data = await api.traceability.get(serial);
      setTraceData(data);
    } catch (err: any) {
      setError(err.message || 'Traceability query failed');
    } finally {
      setTraceLoading(false);
    }
  };

  const handleInputChange = (key: keyof typeof query, val: string) => {
    setQuery(prev => ({ ...prev, [key]: val }));
  };

  const clearFilters = () => {
    setQuery({
      serialNumber: '',
      customer: '',
      model: '',
      invoice: '',
      date: '',
      plant: '',
      status: '',
      dateType: '',
      startDate: '',
      endDate: ''
    });
    setSorts([]);
    setPage(1); // Reset to first page
    setTimeout(() => {
      handleSearch();
    }, 50);
  };

  // Toggle sorting on a column
  const handleToggleSort = (column: keyof SerialNumber, label: string) => {
    setPage(1); // Reset to first page
    setSorts(prev => {
      const existingIdx = prev.findIndex(s => s.column === column);
      if (existingIdx === -1) {
        // Append as ascending
        return [...prev, { column, label, direction: 'asc' }];
      } else if (prev[existingIdx].direction === 'asc') {
        // Toggle to descending
        const updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], direction: 'desc' };
        return updated;
      } else {
        // Remove rule from array
        return prev.filter(s => s.column !== column);
      }
    });
  };

  const removeSort = (column: keyof SerialNumber) => {
    setPage(1); // Reset to first page
    setSorts(prev => prev.filter(s => s.column !== column));
  };

  const removeFilterField = (key: keyof typeof query) => {
    setQuery(prev => {
      const updated = { ...prev, [key]: '' };
      if (key === 'dateType') {
        updated.startDate = '';
        updated.endDate = '';
      }
      return updated;
    });
    setTimeout(() => {
      handleSearch();
    }, 50);
  };

  // Perform multi-column client side sorting
  const getSortedResults = () => {
    if (sorts.length === 0) return results;

    return [...results].sort((a, b) => {
      for (const sort of sorts) {
        const { column, direction } = sort;
        const valA = a[column] ?? '';
        const valB = b[column] ?? '';

        if (valA !== valB) {
          const comp = valA.toString().localeCompare(valB.toString(), undefined, { numeric: true, sensitivity: 'base' });
          return direction === 'asc' ? comp : -comp;
        }
      }
      return 0;
    });
  };

  const sortedResults = getSortedResults();

  // Paginated Results Calculations
  const totalResults = sortedResults.length;
  const totalPages = Math.ceil(totalResults / pageSize) || 1;
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedResults = sortedResults.slice(startIndex, endIndex);

  // Extract human-readable applied filters list
  const getActiveFilters = () => {
    const list: Array<{ key: keyof typeof query; label: string; val: string }> = [];
    if (query.serialNumber) list.push({ key: 'serialNumber', label: 'Serial No.', val: query.serialNumber });
    if (query.model) list.push({ key: 'model', label: 'Model Code', val: query.model });
    if (query.customer) list.push({ key: 'customer', label: 'Customer', val: query.customer });
    if (query.invoice) list.push({ key: 'invoice', label: 'Invoice No.', val: query.invoice });
    if (query.plant) list.push({ key: 'plant', label: 'Plant', val: query.plant });
    if (query.status) list.push({ key: 'status', label: 'Status', val: query.status });
    if (query.dateType && query.startDate && query.endDate) {
      const typeLabel = query.dateType === 'mfgDate' ? 'Mfg Date' : query.dateType === 'dispatchDate' ? 'Dispatch Date' : 'Transfer Date';
      list.push({ key: 'dateType', label: typeLabel, val: `${query.startDate} to ${query.endDate}` });
    } else if (query.date) {
      list.push({ key: 'date', label: 'Audit Date', val: query.date });
    }
    return list;
  };

  const activeFilters = getActiveFilters();

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Battery Traceability & Search Engine</h2>
        <p className="text-xs text-gray-500">Query serial numbers, customers, models, or shipments for instantaneous timeline lineage.</p>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 text-xs rounded-xl font-medium">
          {error}
        </div>
      )}

      {/* Query Filters Board */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-cyan-500" />
            Advanced ERP Filters
          </h3>
          <button
            onClick={clearFilters}
            className="text-[11px] font-bold text-gray-400 hover:text-cyan-500 flex items-center gap-1 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Controls
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Serial Number</label>
            <input
              type="text"
              value={query.serialNumber}
              onChange={e => handleInputChange('serialNumber', e.target.value)}
              placeholder="e.g. M222026..."
              className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none font-mono"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Model Prefix</label>
            <input
              type="text"
              value={query.model}
              onChange={e => handleInputChange('model', e.target.value)}
              placeholder="e.g. M22"
              className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Customer / Dealer</label>
            <input
              type="text"
              value={query.customer}
              onChange={e => handleInputChange('customer', e.target.value)}
              placeholder="e.g. TATA Motors"
              className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Invoice Number</label>
            <input
              type="text"
              value={query.invoice}
              onChange={e => handleInputChange('invoice', e.target.value)}
              placeholder="e.g. INV-2026..."
              className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Active Plant</label>
            <input
              type="text"
              value={query.plant}
              onChange={e => handleInputChange('plant', e.target.value)}
              placeholder="e.g. Plant Alpha"
              className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Status</label>
            <select
              value={query.status}
              onChange={e => handleInputChange('status', e.target.value)}
              className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-gray-900 dark:text-white focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="Allotted">Allotted</option>
              <option value="Produced">Produced</option>
              <option value="PDI Approved">PDI Approved</option>
              <option value="PDI Hold">PDI Hold</option>
              <option value="PDI Rejected">PDI Rejected</option>
              <option value="Dispatched">Dispatched</option>
            </select>
          </div>
        </div>

        {/* Date Ranges Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-3 border-t border-gray-50 dark:border-slate-800/40">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Date Range Type</label>
            <select
              value={query.dateType}
              onChange={e => handleInputChange('dateType', e.target.value)}
              className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-gray-900 dark:text-white focus:outline-none"
            >
              <option value="">No Date Filter</option>
              <option value="mfgDate">Manufacturing Date</option>
              <option value="dispatchDate">Dispatch Date</option>
              <option value="transferDate">Logistics Transfer Date</option>
            </select>
          </div>
          {query.dateType ? (
            <>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Start Date</label>
                <input
                  type="date"
                  value={query.startDate}
                  onChange={e => handleInputChange('startDate', e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">End Date</label>
                <input
                  type="date"
                  value={query.endDate}
                  onChange={e => handleInputChange('endDate', e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Single Day Audit (Fallback)</label>
              <input
                type="date"
                value={query.date}
                onChange={e => handleInputChange('date', e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-1 text-xs text-gray-900 dark:text-white focus:outline-none"
              />
            </div>
          )}
          <div className="flex items-end justify-end md:col-span-1 lg:col-span-1">
            <button
              onClick={handleSearch}
              className="w-full md:w-auto flex items-center justify-center space-x-2 px-6 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow transition"
            >
              <Search className="w-4 h-4" />
              <span>Submit Query</span>
            </button>
          </div>
        </div>
      </div>

      {/* ACTIVE CRITERIA LOG PANEL */}
      {(activeFilters.length > 0 || sorts.length > 0) && (
        <div className="p-4 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800/60 rounded-xl flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {activeFilters.length > 0 && (
              <>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Filters:</span>
                {activeFilters.map(filter => (
                  <div
                    key={filter.key}
                    className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-xs font-medium shadow-sm"
                  >
                    <span>{filter.label}: <strong>{filter.val}</strong></span>
                    <button
                      onClick={() => removeFilterField(filter.key)}
                      className="text-slate-400 hover:text-rose-500 shrink-0"
                      title="Clear filter"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </>
            )}

            {sorts.length > 0 && (
              <>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-2">Sort Rules:</span>
                {sorts.map(sort => (
                  <div
                    key={sort.column}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-cyan-50 dark:bg-cyan-950/25 border border-cyan-100 dark:border-cyan-900/50 text-cyan-700 dark:text-cyan-400 rounded-full text-xs font-semibold shadow-sm"
                  >
                    <span>{sort.label} {sort.direction === 'asc' ? '↑' : '↓'}</span>
                    <button
                      onClick={() => removeSort(sort.column)}
                      className="text-cyan-400 hover:text-rose-500 shrink-0"
                      title="Clear sort"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
          <button
            onClick={clearFilters}
            className="text-[10px] text-gray-400 hover:text-rose-500 font-semibold uppercase tracking-wider ml-auto"
          >
            Clear All
          </button>
        </div>
      )}

      {/* QUICK MULTI COLUMN SORT INITIATORS */}
      <div className="p-3 bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800/80 rounded-xl flex flex-wrap gap-2 items-center">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-2 flex items-center gap-1">
          <ArrowUpDown className="w-3.5 h-3.5 text-cyan-500" />
          Click to chain-sort results:
        </span>
        {[
          { column: 'serialNumber', label: 'Serial No' },
          { column: 'modelCode', label: 'Model' },
          { column: 'currentPlant', label: 'Plant' },
          { column: 'status', label: 'Status' },
          { column: 'mfgDate', label: 'Mfg Date' },
          { column: 'dispatchDate', label: 'Dispatch Date' },
          { column: 'customerName', label: 'Customer' }
        ].map(item => {
          const activeRule = sorts.find(s => s.column === item.column);
          return (
            <button
              key={item.column}
              onClick={() => handleToggleSort(item.column as keyof SerialNumber, item.label)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${activeRule ? 'bg-cyan-600 text-white shadow-sm' : 'bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-850 text-gray-700 dark:text-gray-300 hover:bg-gray-100'}`}
            >
              <span>{item.label}</span>
              {activeRule ? (
                activeRule.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
              ) : (
                <ArrowUpDown className="w-3 h-3 text-slate-400" />
              )}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Results grid */}
        <div className="lg:col-span-1 space-y-4 max-h-[700px] overflow-y-auto pr-1">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Matched Results ({sortedResults.length})</h3>
            <span className="text-[10px] font-mono text-slate-400">Stack Sort Priority Ordered</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-gray-400">Loading traceability rows...</div>
          ) : sortedResults.length === 0 ? (
            <div className="p-8 border border-dashed border-gray-200 dark:border-slate-800 rounded-2xl text-center text-xs text-gray-500 bg-white dark:bg-slate-900">
              No matching serial numbers found.
            </div>
          ) : (
            <div className="space-y-2">
              {paginatedResults.map(sn => (
                <button
                  key={sn.serialNumber}
                  onClick={() => handleTrace(sn.serialNumber)}
                  className={`w-full text-left p-4 bg-white dark:bg-slate-900 border rounded-2xl transition flex flex-col space-y-2 ${selectedSerial === sn.serialNumber ? 'border-cyan-500 shadow-sm ring-1 ring-cyan-500/20' : 'border-gray-100 dark:border-slate-800/80 hover:border-gray-300'}`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-bold font-mono text-xs text-gray-900 dark:text-white">{sn.serialNumber}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                      sn.status === 'Dispatched' ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400' :
                      sn.status === 'PDI Approved' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400' :
                      sn.status === 'PDI Hold' ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400' :
                      sn.status === 'PDI Rejected' ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400' :
                      sn.status === 'Produced' ? 'bg-cyan-50 dark:bg-cyan-950/20 text-cyan-600 dark:text-cyan-400' :
                      'bg-slate-50 dark:bg-slate-850 text-slate-500'
                    }`}>
                      {sn.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-gray-400 pt-1.5 border-t border-gray-50 dark:border-slate-800/40">
                    <span>Model: {sn.modelCode}</span>
                    <span>Plant: {sn.currentPlant}</span>
                  </div>
                </button>
              ))}

              {/* Elegant Pagination Component */}
              {totalResults > 0 && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-150 dark:border-slate-800/60 text-xs">
                  <div className="text-gray-500 dark:text-gray-400 font-mono text-[11px]">
                    Showing {Math.min(startIndex + 1, totalResults)}–{Math.min(endIndex, totalResults)} of {totalResults}
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      disabled={page === 1}
                      onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                      className="px-2 py-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg text-gray-750 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-800/50 font-medium transition"
                    >
                      Prev
                    </button>
                    <span className="px-2 py-1 text-gray-650 dark:text-gray-400 font-medium select-none min-w-[36px] text-center">
                      {page}/{totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={page === totalPages}
                      onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                      className="px-2 py-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg text-gray-750 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-800/50 font-medium transition"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Trace details timeline panel */}
        <div className="lg:col-span-2">
          {traceLoading ? (
            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-12 text-center text-xs text-gray-400 h-full flex flex-col justify-center items-center space-y-4">
              <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <span>Querying supply chain traceability database...</span>
            </div>
          ) : !traceData ? (
            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-12 text-center text-xs text-gray-400 h-full flex flex-col justify-center items-center">
              <Info className="w-10 h-10 text-gray-300 dark:text-gray-700 mb-3" />
              <p className="font-bold text-gray-700 dark:text-gray-300">No battery selected</p>
              <p className="text-[11px] text-gray-500 max-w-xs mt-1">Select a serial number on the left panel to display its end-to-end lineage timeline.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
              {/* Header */}
              <div className="pb-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Lineage File</h3>
                  <h4 className="text-lg font-black font-mono text-gray-950 dark:text-white tracking-wider mt-1 flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-cyan-600" />
                    {traceData.serialNumber}
                  </h4>
                </div>
                <div className="text-right">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold uppercase ${
                    traceData.status === 'Dispatched' ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400' :
                    traceData.status === 'PDI Approved' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400' :
                    traceData.status === 'PDI Hold' ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400' :
                    traceData.status === 'PDI Rejected' ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400' :
                    traceData.status === 'Produced' ? 'bg-cyan-50 dark:bg-cyan-950/20 text-cyan-600 dark:text-cyan-400' :
                    'bg-slate-50 dark:bg-slate-850 text-slate-500'
                  }`}>
                    {traceData.status}
                  </span>
                  <p className="text-[10px] text-gray-400 font-mono mt-1.5">Asset ID: {traceData.serialNumber}</p>
                </div>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-2xl text-xs">
                <div>
                  <span className="text-gray-400">Battery Model</span>
                  <p className="font-bold text-gray-950 dark:text-white mt-0.5">{traceData.modelName} ({traceData.modelCode})</p>
                </div>
                <div>
                  <span className="text-gray-400">Tech Type</span>
                  <p className="font-bold text-gray-950 dark:text-white mt-0.5">{traceData.batteryType}</p>
                </div>
                <div>
                  <span className="text-gray-400">Capacity Spec</span>
                  <p className="font-bold text-gray-950 dark:text-white mt-0.5">{traceData.capacity}</p>
                </div>
                <div>
                  <span className="text-gray-400">Current Facility</span>
                  <p className="font-bold text-gray-950 dark:text-white mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-cyan-500" />
                    {traceData.currentPlant}
                  </p>
                </div>
              </div>

              {/* TIMELINE VIEW */}
              <div className="space-y-4">
                <h5 className="text-xs font-bold text-gray-400 uppercase tracking-widest">End-to-End Tracking Timeline</h5>

                <div className="relative border-l-2 border-gray-100 dark:border-slate-800 pl-6 ml-3 space-y-6 text-xs">
                  {/* Step 1: Allotment */}
                  <div className="relative">
                    <span className="absolute -left-[31px] top-0.5 p-1 bg-cyan-600 text-white rounded-full">
                      <Calendar className="w-3.5 h-3.5" />
                    </span>
                    <div>
                      <h6 className="font-bold text-gray-950 dark:text-white">QA Serial Allocation Block</h6>
                      <p className="text-[11px] text-gray-500 mt-0.5">Model Range allotted by QA Division to {traceData.currentPlant}.</p>
                    </div>
                  </div>

                  {/* Step 2: Production */}
                  <div className="relative">
                    <span className={`absolute -left-[31px] top-0.5 p-1 rounded-full ${traceData.mfgDate !== 'Not Produced Yet' ? 'bg-cyan-600 text-white' : 'bg-gray-200 dark:bg-slate-800 text-gray-400'}`}>
                      <Clock className="w-3.5 h-3.5" />
                    </span>
                    <div>
                      <h6 className="font-bold text-gray-950 dark:text-white">Assembly Line Production Entry</h6>
                      {traceData.mfgDate !== 'Not Produced Yet' ? (
                        <div className="text-[11px] text-gray-500 mt-0.5 space-y-0.5">
                          <p>Date: {new Date(traceData.mfgDate).toLocaleDateString()} ({traceData.shift})</p>
                          <p>Location: {traceData.currentPlant}</p>
                        </div>
                      ) : (
                        <p className="text-[11px] text-gray-400 italic mt-0.5">Awaiting assembly line manufacturing...</p>
                      )}
                    </div>
                  </div>

                  {/* Step 3: PDI */}
                  <div className="relative">
                    <span className={`absolute -left-[31px] top-0.5 p-1 rounded-full ${traceData.pdiStatus !== 'Pending' ? (traceData.pdiStatus === 'Approved' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white') : 'bg-gray-200 dark:bg-slate-800 text-gray-400'}`}>
                      <ClipboardCheck className="w-3.5 h-3.5" />
                    </span>
                    <div>
                      <h6 className="font-bold text-gray-950 dark:text-white">Pre-Delivery Quality Inspection (PDI)</h6>
                      {traceData.pdiStatus !== 'Pending' ? (
                        <div className="text-[11px] text-gray-500 mt-0.5 space-y-0.5">
                          <p>Status: <strong className={traceData.pdiStatus === 'Approved' ? 'text-emerald-600' : 'text-rose-600'}>{traceData.pdiStatus}</strong></p>
                          <p>Inspected By: {traceData.pdiBy} on {traceData.pdiDate}</p>
                          <p className="italic">Remarks: "{traceData.pdiRemarks}"</p>
                        </div>
                      ) : (
                        <p className="text-[11px] text-gray-400 italic mt-0.5">Awaiting QA Head parameters checklist inspection...</p>
                      )}
                    </div>
                  </div>

                  {/* Step 4: Transfers (Optional list) */}
                  {traceData.transferHistory && traceData.transferHistory.length > 0 && (
                    <div className="relative">
                      <span className="absolute -left-[31px] top-0.5 p-1 bg-indigo-600 text-white rounded-full">
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                      </span>
                      <div>
                        <h6 className="font-bold text-gray-950 dark:text-white">Inter-Plant Logistics Transfer</h6>
                        {traceData.transferHistory.map((th: any, i: number) => (
                          <div key={i} className="text-[11px] text-gray-500 mt-1 p-2 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl">
                            <p>Transfer: <strong>{th.fromPlant} ➜ {th.toPlant}</strong></p>
                            <p>Approved By: {th.approvedBy} on {th.transferDate}</p>
                            <p className="italic">Reason: "{th.reason}"</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step 5: Dispatch */}
                  <div className="relative">
                    <span className={`absolute -left-[31px] top-0.5 p-1 rounded-full ${traceData.dispatch ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-slate-800 text-gray-400'}`}>
                      <Truck className="w-3.5 h-3.5" />
                    </span>
                    <div>
                      <h6 className="font-bold text-gray-950 dark:text-white">Commercial Outward Dispatch</h6>
                      {traceData.dispatch ? (
                        <div className="text-[11px] text-gray-500 mt-0.5 space-y-1 p-3 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-xl">
                          <p>Consignee Customer: <strong className="text-gray-950 dark:text-white">{traceData.dispatch.customerName}</strong></p>
                          <p>Invoice Reference: <strong>{traceData.dispatch.invoiceNumber}</strong> (Date: {traceData.dispatch.invoiceDate})</p>
                          <p>Transport details: {traceData.dispatch.transport} (Vehicle: {traceData.dispatch.vehicle})</p>
                          <p>LR Consignment: {traceData.dispatch.lrNumber}</p>
                        </div>
                      ) : (
                        <p className="text-[11px] text-gray-400 italic mt-0.5">Awaiting commercial order dispatch...</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
