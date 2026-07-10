import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { AuditLog } from '../types';
import { 
  Shield, 
  Clock, 
  ShieldAlert, 
  FileText, 
  Info, 
  Search, 
  Filter, 
  RefreshCw, 
  Trash2, 
  Archive, 
  Download, 
  Eye, 
  X, 
  Calendar, 
  AlertTriangle, 
  Monitor, 
  Smartphone, 
  Layers, 
  User, 
  CheckCircle, 
  XCircle, 
  ChevronLeft, 
  ChevronRight, 
  List, 
  Activity,
  Database,
  Lock,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [plants, setPlants] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'table' | 'timeline'>('table');
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  // Dashboard Metrics
  const [stats, setStats] = useState({
    todayActivities: 0,
    totalLogs: 0,
    criticalEvents: 0,
    failedLoginAttempts: 0,
    duplicateSerialAttempts: 0,
    pendingApprovals: 0,
    securityAlerts: 0
  });

  // Filter criteria State
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    user: '',
    role: 'All',
    plant: 'All',
    module: 'All',
    status: 'All',
    search: '',
    model: '',
    serial: ''
  });

  // Active Selected Log for Drawer Detail View
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Administrative Clearance Modal State
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveConfirmText, setArchiveConfirmText] = useState('');
  const [isArchiving, setIsArchiving] = useState(false);

  // Deletion Modal State
  const [logToDelete, setLogToDelete] = useState<AuditLog | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadPlants();
  }, []);

  useEffect(() => {
    loadLogs();
  }, [page, limit, filters.role, filters.plant, filters.module, filters.status]);

  const loadPlants = async () => {
    try {
      const data = await api.plants.list();
      setPlants(data || []);
    } catch (err) {
      console.error('Failed to load plants for filters', err);
    }
  };

  const loadLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.reports.auditLogs({
        page,
        limit,
        ...filters
      });
      if (response) {
        setLogs(response.logs || []);
        setTotal(response.total || 0);
        setTotalPages(response.totalPages || 1);
        if (response.stats) {
          setStats(response.stats);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to pull secure audit logs');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadLogs();
  };

  const handleClearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      user: '',
      role: 'All',
      plant: 'All',
      module: 'All',
      status: 'All',
      search: '',
      model: '',
      serial: ''
    });
    setPage(1);
  };

  // Archive and clear security operational logs (Super Admin Only)
  const handleArchiveLogs = async () => {
    if (archiveConfirmText !== 'ARCHIVE') return;
    setIsArchiving(true);
    try {
      await api.reports.archiveAuditLogs();
      setShowArchiveModal(false);
      setArchiveConfirmText('');
      setPage(1);
      loadLogs();
    } catch (err: any) {
      setError(err.message || 'Archiving failed');
    } finally {
      setIsArchiving(false);
    }
  };

  // Delete a single audit log (Super Admin Only)
  const handleDeleteLog = async () => {
    if (!logToDelete) return;
    setIsDeleting(true);
    try {
      await api.reports.deleteAuditLog(logToDelete.id);
      setLogToDelete(null);
      loadLogs();
    } catch (err: any) {
      setError(err.message || 'Failed to delete audit log entry');
    } finally {
      setIsDeleting(false);
    }
  };

  // CSV Export Utility
  const handleExportCSV = () => {
    if (logs.length === 0) return;
    const headers = [
      'Timestamp', 'Username', 'Employee ID', 'User Role', 'Plant Associated', 
      'Target Module', 'Action Code', 'Description', 'Old Value', 'New Value', 
      'Status', 'IP Address', 'Browser', 'Operating System', 'Device Type', 'Session ID', 'Remarks'
    ];
    
    const csvContent = [
      headers.join(','),
      ...logs.map(log => [
        new Date(log.timestamp || log.when || '').toLocaleString(),
        log.username || log.who || 'N/A',
        log.employeeId || 'N/A',
        log.role || 'N/A',
        log.plant || 'All',
        log.module || 'N/A',
        log.action || log.what || 'N/A',
        log.description || '',
        log.oldValue || 'None',
        log.newValue || 'None',
        log.status || 'Success',
        log.ipAddress || '127.0.0.1',
        log.browser || 'Other',
        log.operatingSystem || 'Other',
        log.device || 'Desktop',
        log.sessionId || 'N/A',
        log.remarks || 'None'
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `SNMS_Security_Audit_Trail_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print PDF Viewport Utility
  const handlePrintLedger = () => {
    window.print();
  };

  // Safe JSON Formatting Helper
  const formatJSONDiff = (value: string) => {
    if (!value || value === 'None' || value === 'None' || value === '') return value || 'None';
    try {
      // Check if it's a JSON string
      if (value.trim().startsWith('{') || value.trim().startsWith('[')) {
        const obj = JSON.parse(value);
        return JSON.stringify(obj, null, 2);
      }
    } catch (e) {
      // Fallback to plain text
    }
    return value;
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-fade-in print:p-0">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-100 dark:border-slate-800 pb-5 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 tracking-tight">
            <Shield className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Security Audit Trail
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Immutable system log ledger for regulatory compliance, employee accountability, and duplicate serial entry checks.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={loadLogs} 
            className="p-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-1.5 text-xs font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          
          <button 
            onClick={handleExportCSV} 
            disabled={logs.length === 0}
            className="p-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 transition-colors flex items-center gap-1.5 text-xs font-medium"
          >
            <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Export CSV
          </button>

          <button 
            onClick={handlePrintLedger} 
            className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-950/80 transition-colors flex items-center gap-1.5 text-xs font-medium"
          >
            <FileText className="w-4 h-4" />
            Print Report
          </button>

          <button 
            onClick={() => setShowArchiveModal(true)} 
            className="p-2 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-950/80 transition-colors flex items-center gap-1.5 text-xs font-medium"
          >
            <Archive className="w-4 h-4" />
            Archive Logs
          </button>
        </div>
      </div>

      {/* PRINT-ONLY HEADER */}
      <div className="hidden print:block mb-8 border-b-2 border-slate-950 pb-4">
        <h1 className="text-2xl font-bold text-slate-900 uppercase">Lead Acid Battery Manufacturing ERP</h1>
        <h2 className="text-lg font-semibold text-slate-800 mt-1">Official Immutable Security Audit Trail Logs Ledger</h2>
        <div className="grid grid-cols-2 gap-4 mt-4 text-xs font-mono text-slate-600">
          <div>Report Generated: {new Date().toLocaleString()}</div>
          <div>Total Active Records: {total} Logs</div>
        </div>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 text-xs rounded-2xl flex items-center gap-2 font-medium">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* SECURITY METRICS DASHBOARD - GRID CARD */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 print:hidden">
        
        {/* TOTAL LOGS */}
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800/80 p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Total Ledger Size</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{stats.totalLogs}</p>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Database className="w-5 h-5" />
          </div>
        </div>

        {/* TODAY'S OPERATIONS */}
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800/80 p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Today's Actions</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{stats.todayActivities}</p>
          </div>
          <div className="p-3 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 rounded-xl">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        {/* SECURITY ALERTS */}
        <div className={`border p-4 rounded-2xl shadow-sm flex items-center justify-between transition-colors ${
          stats.securityAlerts > 0 
            ? 'bg-amber-50/60 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200' 
            : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800/80 text-slate-900 dark:text-white'
        }`}>
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Security Alerts</p>
            <p className="text-2xl font-bold tracking-tight">{stats.securityAlerts}</p>
          </div>
          <div className={`p-3 rounded-xl ${
            stats.securityAlerts > 0 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'bg-slate-100 dark:bg-slate-800 text-gray-500'
          }`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* CRITICAL EVENTS */}
        <div className={`border p-4 rounded-2xl shadow-sm flex items-center justify-between transition-colors ${
          stats.criticalEvents > 0 
            ? 'bg-rose-50/60 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/40 text-rose-900 dark:text-rose-200' 
            : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800/80 text-slate-900 dark:text-white'
        }`}>
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Critical Events</p>
            <p className="text-2xl font-bold tracking-tight">{stats.criticalEvents}</p>
          </div>
          <div className={`p-3 rounded-xl ${
            stats.criticalEvents > 0 ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600' : 'bg-slate-100 dark:bg-slate-800 text-gray-500'
          }`}>
            <Lock className="w-5 h-5" />
          </div>
        </div>

        {/* FAILED LOGINS */}
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800/80 p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Failed Logins</p>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 tracking-tight">{stats.failedLoginAttempts}</p>
          </div>
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl">
            <User className="w-5 h-5" />
          </div>
        </div>

        {/* DUPLICATE SERIAL ATTEMPTS */}
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800/80 p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Duplicate Serials</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 tracking-tight">{stats.duplicateSerialAttempts}</p>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        {/* PENDING APPROVALS */}
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800/80 p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Pending Approvals</p>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 tracking-tight">{stats.pendingApprovals}</p>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* FILTER CONTROL PANEL */}
      <form onSubmit={handleManualSearch} className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 print:hidden">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
          <Filter className="w-4 h-4 text-indigo-600" />
          <span>Advanced Ledger Filtering & Search Query</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          
          {/* USER KEYWORD */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">User Search</label>
            <div className="relative">
              <input 
                type="text" 
                value={filters.user}
                onChange={(e) => setFilters({...filters, user: e.target.value})}
                placeholder="Email, name or identifier..."
                className="w-full pl-8 pr-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-indigo-500"
              />
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-3" />
            </div>
          </div>

          {/* USER ROLE SELECT */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Filter Role</label>
            <select
              value={filters.role}
              onChange={(e) => setFilters({...filters, role: e.target.value})}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-indigo-500"
            >
              <option value="All">All Roles</option>
              <option value="Super Admin">Super Admin</option>
              <option value="QA">QA</option>
              <option value="Production">Production</option>
              <option value="PDI">PDI</option>
              <option value="Dispatch">Dispatch</option>
              <option value="Viewer">Viewer</option>
            </select>
          </div>

          {/* PLANT SELECT */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Associated Plant</label>
            <select
              value={filters.plant}
              onChange={(e) => setFilters({...filters, plant: e.target.value})}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-indigo-500"
            >
              <option value="All">All Plants</option>
              {plants.map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* TARGET MODULE */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Target Module</label>
            <select
              value={filters.module}
              onChange={(e) => setFilters({...filters, module: e.target.value})}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-indigo-500"
            >
              <option value="All">All Modules</option>
              <option value="Authentication">Authentication</option>
              <option value="User Master">User Master</option>
              <option value="Plant Master">Plant Master</option>
              <option value="Model Master">Model Master</option>
              <option value="Customer Master">Customer Master</option>
              <option value="Range Allotment">Range Allotment</option>
              <option value="Inter Plant Transfer">Inter Plant Transfer</option>
              <option value="Production">Production</option>
              <option value="Packing">Packing</option>
              <option value="PDI">PDI</option>
              <option value="Dispatch">Dispatch</option>
              <option value="Reports">Reports</option>
              <option value="General">General</option>
            </select>
          </div>

          {/* STATUS SELECT */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Event Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-indigo-500"
            >
              <option value="All">All Statuses</option>
              <option value="Success">Success</option>
              <option value="Failed">Failed</option>
            </select>
          </div>

        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 border-t border-gray-50 dark:border-slate-800/40 pt-4">
          
          {/* START DATE */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Start Date</label>
            <div className="relative">
              <input 
                type="date" 
                value={filters.startDate}
                onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                className="w-full pl-8 pr-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-indigo-500"
              />
              <Calendar className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-3" />
            </div>
          </div>

          {/* END DATE */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">End Date</label>
            <div className="relative">
              <input 
                type="date" 
                value={filters.endDate}
                onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                className="w-full pl-8 pr-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-indigo-500"
              />
              <Calendar className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-3" />
            </div>
          </div>

          {/* BATTERY MODEL */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Battery Model</label>
            <input 
              type="text" 
              value={filters.model}
              onChange={(e) => setFilters({...filters, model: e.target.value})}
              placeholder="Model code or prefix..."
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-indigo-500"
            />
          </div>

          {/* SERIAL NO */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Serial Number</label>
            <input 
              type="text" 
              value={filters.serial}
              onChange={(e) => setFilters({...filters, serial: e.target.value})}
              placeholder="Specific serial code..."
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-indigo-500"
            />
          </div>

          {/* SEARCH KEYWORD */}
          <div className="space-y-1 sm:col-span-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Keyword Search (IP / Description / ID)</label>
            <div className="relative">
              <input 
                type="text" 
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                placeholder="Search across IP, Session, Remarks..."
                className="w-full pl-8 pr-3 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-indigo-500"
              />
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-3" />
            </div>
          </div>

        </div>

        <div className="flex justify-end gap-2 border-t border-gray-50 dark:border-slate-800/40 pt-4">
          <button 
            type="button" 
            onClick={handleClearFilters}
            className="px-4 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            Clear Fields
          </button>
          
          <button 
            type="submit"
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm shadow-indigo-100 dark:shadow-none"
          >
            <Search className="w-4 h-4" />
            Query Ledger
          </button>
        </div>
      </form>

      {/* VIEW METHOD TOGGLES (TABLE VS TIMELINE) */}
      <div className="flex justify-between items-center print:hidden">
        <div className="flex gap-1 bg-gray-100 dark:bg-slate-950 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('table')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'table' 
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <List className="w-4 h-4" />
            Ledger Spreadsheet
          </button>
          <button 
            onClick={() => setActiveTab('timeline')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'timeline' 
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            Chronological Timeline
          </button>
        </div>

        <div className="text-xs text-gray-400 font-medium">
          Showing <span className="font-bold text-gray-700 dark:text-gray-200">{logs.length}</span> of <span className="font-bold text-gray-700 dark:text-gray-200">{total}</span> records
        </div>
      </div>

      {/* CORE LOGS PANEL VIEW */}
      {loading ? (
        <div className="p-16 text-center bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-3" />
          <p className="text-xs text-gray-400 font-medium">Querying secure cryptographic log ledger...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="p-16 text-center bg-white dark:bg-slate-900 border border-dashed border-gray-200 dark:border-slate-800 rounded-2xl">
          <ShieldAlert className="w-8 h-8 text-gray-400 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">No Security Logs Found</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">Try relaxing your advanced query, clear date filters, or ensure you have administrative sync active.</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {activeTab === 'table' ? (
            
            /* SPREADSHEET VIEW */
            <motion.div 
              key="table-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-950 border-b border-gray-100 dark:border-slate-800 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      <th className="px-5 py-4">Timestamp</th>
                      <th className="px-5 py-4">Session User</th>
                      <th className="px-5 py-4">Plant & Role</th>
                      <th className="px-5 py-4">Target Module</th>
                      <th className="px-5 py-4">Security Action</th>
                      <th className="px-5 py-4">Description</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4 font-mono">IP Address</th>
                      <th className="px-5 py-4 text-center print:hidden">Ledger Controls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60 text-gray-700 dark:text-gray-300">
                    {logs.map(log => {
                      const isFailed = log.status === 'Failed';
                      return (
                        <tr 
                          key={log.id} 
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors group cursor-pointer"
                          onClick={() => setSelectedLog(log)}
                        >
                          <td className="px-5 py-4 font-mono text-[10px] text-gray-400 whitespace-nowrap">
                            {new Date(log.timestamp || log.when || '').toLocaleString()}
                          </td>
                          <td className="px-5 py-4">
                            <div className="font-semibold text-gray-900 dark:text-white">{log.username || log.who || 'System'}</div>
                            <div className="text-[10px] text-gray-400 font-mono">ID: {log.employeeId || 'N/A'}</div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="text-gray-800 dark:text-gray-200 font-medium">{log.plant || 'All'}</div>
                            <div className="text-[10px] text-gray-400 font-medium">{log.role || 'Viewer'}</div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/20">
                              {log.module || 'System'}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                              log.action?.includes('FAIL') || isFailed ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200/20 text-rose-600 dark:text-rose-400' :
                              log.action?.includes('CREATE') || log.action?.includes('ADD') ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/20 text-emerald-600 dark:text-emerald-400' :
                              log.action?.includes('DELETE') || log.action?.includes('ARCHIVE') ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200/20 text-amber-600 dark:text-amber-400' :
                              'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200/20 text-indigo-600 dark:text-indigo-400'
                            }`}>
                              {log.action || log.what}
                            </span>
                          </td>
                          <td className="px-5 py-4 max-w-[280px] truncate font-medium text-gray-500 dark:text-gray-400" title={log.description}>
                            {log.description || log.newValue || 'Action performed.'}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase rounded ${
                              isFailed ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                            }`}>
                              {isFailed ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                              {log.status || 'Success'}
                            </span>
                          </td>
                          <td className="px-5 py-4 font-mono text-[10px] text-gray-400 whitespace-nowrap">
                            {log.ipAddress || '127.0.0.1'}
                          </td>
                          <td className="px-5 py-4 text-center print:hidden" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => setSelectedLog(log)}
                                className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => setLogToDelete(log)}
                                className="p-1.5 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="Delete Log Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION GRID BLOCK */}
              <div className="p-4 bg-gray-50 dark:bg-slate-950/60 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs font-semibold print:hidden">
                <div className="flex items-center gap-2 text-gray-500">
                  <span>Display Count:</span>
                  <select
                    value={limit}
                    onChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(1); }}
                    className="px-2 py-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:border-indigo-500"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <div className="flex items-center justify-center gap-1.5">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-gray-500">
                    Page <span className="text-gray-950 dark:text-white font-bold">{page}</span> of <span className="text-gray-950 dark:text-white font-bold">{totalPages}</span>
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            
            /* CHRONOLOGICAL TIMELINE VIEW */
            <motion.div 
              key="timeline-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6 relative"
            >
              <div className="absolute left-10 top-8 bottom-8 w-[1px] border-l border-dashed border-slate-200 dark:border-slate-800"></div>

              {logs.map((log, index) => {
                const isFailed = log.status === 'Failed';
                return (
                  <div key={log.id} className="relative pl-10 flex gap-4 items-start group">
                    
                    {/* TIMELINE DOT NODE */}
                    <div className={`absolute left-[33px] top-1.5 w-[15px] h-[15px] rounded-full border-4 bg-white dark:bg-slate-900 transition-transform group-hover:scale-125 ${
                      isFailed 
                        ? 'border-rose-500 shadow-sm shadow-rose-200' 
                        : 'border-indigo-600 shadow-sm shadow-indigo-200'
                    }`} />

                    {/* EVENT METADATA PANEL */}
                    <div className="w-24 flex-shrink-0 pt-1">
                      <div className="text-[10px] font-mono text-gray-400">{new Date(log.timestamp || log.when || '').toLocaleTimeString()}</div>
                      <div className="text-[9px] font-bold text-gray-500 uppercase mt-0.5">{new Date(log.timestamp || log.when || '').toLocaleDateString()}</div>
                    </div>

                    {/* EVENT TEXT BLOCK CARD */}
                    <div className="flex-1 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/40 rounded-2xl p-4 hover:border-slate-200 hover:bg-slate-50 dark:hover:bg-slate-950/60 transition-all cursor-pointer" onClick={() => setSelectedLog(log)}>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-900 dark:text-white">{log.username || log.who || 'System'}</span>
                          <span className="text-[10px] font-bold text-gray-400">({log.role})</span>
                          <span className="text-[10px] font-mono text-gray-400">IP: {log.ipAddress}</span>
                        </div>
                        <div className="flex gap-1.5">
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-500">
                            {log.module}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            isFailed ? 'bg-rose-100 dark:bg-rose-950/30 text-rose-600' : 'bg-indigo-100 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400'
                          }`}>
                            {log.action || log.what}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{log.description || log.newValue}</p>
                      
                      {log.remarks && log.remarks !== 'None' && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-2 font-medium bg-amber-500/5 px-2 py-1 rounded-lg border border-amber-500/10 inline-block">
                          Remarks: {log.remarks}
                        </p>
                      )}

                      {/* Side-by-side Diff Preview inside Timeline */}
                      {(log.oldValue !== 'None' || log.newValue !== 'None') && (
                        <div className="mt-3 grid grid-cols-2 gap-3 pt-3 border-t border-dashed border-slate-200/50 dark:border-slate-800/50 text-[10px] font-mono text-gray-500">
                          <div className="bg-white dark:bg-slate-950/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800/30 truncate">
                            <span className="font-bold text-gray-400 block mb-1">OLD STATE</span>
                            {log.oldValue}
                          </div>
                          <div className="bg-white dark:bg-slate-950/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800/30 truncate">
                            <span className="font-bold text-gray-400 block mb-1">NEW STATE</span>
                            {log.newValue}
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}

              {/* TIMELINE BOTTOM PAGINATION */}
              <div className="pt-6 border-t border-gray-100 dark:border-slate-800/80 flex justify-center items-center gap-4 text-xs font-semibold">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"
                >
                  Prev Page
                </button>
                <span className="text-gray-500">
                  Page <span className="font-bold text-gray-900 dark:text-white">{page}</span> of <span className="font-bold text-gray-900 dark:text-white">{totalPages}</span>
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"
                >
                  Next Page
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* DRAWER DETAILS SLIDE-OVER */}
      <AnimatePresence>
        {selectedLog && (
          <>
            {/* BACKDROP */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLog(null)}
              className="fixed inset-0 bg-slate-950 z-40 print:hidden"
            />

            {/* SLIDE OUT DRAWER CARD */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="fixed right-0 top-0 h-full w-full sm:w-[540px] bg-white dark:bg-slate-900 shadow-2xl z-50 border-l border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden print:hidden"
            >
              {/* DRAWER HEADER */}
              <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-950/20">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">Security Log Clearance</h3>
                    <p className="text-[10px] text-gray-400 font-mono">ID: {selectedLog.id}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedLog(null)}
                  className="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-800 text-gray-500 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* DRAWER BODY */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-gray-700 dark:text-gray-300">
                
                {/* CERTIFICATE BANNER */}
                <div className="p-4 rounded-2xl bg-indigo-50/30 dark:bg-indigo-950/10 border border-indigo-100/40 dark:border-indigo-950/30 flex items-start gap-3">
                  <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white mb-0.5">Immutable Audit Certification</h4>
                    <p className="text-[10px] text-gray-500">This action has been signed and written to the secure ledger. It cannot be edited, modified, or truncated.</p>
                  </div>
                </div>

                {/* METADATA GRID CONTAINER */}
                <div className="space-y-3">
                  <h4 className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">Session Identity Clearance</h4>
                  <div className="grid grid-cols-2 gap-4 bg-gray-50/50 dark:bg-slate-950/10 p-4 border border-gray-100 dark:border-slate-800/60 rounded-xl font-medium">
                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-400 block font-normal">OPERATOR</span>
                      <span className="text-gray-950 dark:text-white">{selectedLog.username || selectedLog.who || 'System'}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-400 block font-normal">EMPLOYEE ID</span>
                      <span className="font-mono text-gray-900 dark:text-white">{selectedLog.employeeId || 'N/A'}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-400 block font-normal">SECURITY ROLE</span>
                      <span>{selectedLog.role || 'Viewer'}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-400 block font-normal">PLANT CODE</span>
                      <span>{selectedLog.plant || 'All'}</span>
                    </div>
                  </div>
                </div>

                {/* TRANSACTION METADATA */}
                <div className="space-y-3">
                  <h4 className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">Transaction Details</h4>
                  <div className="grid grid-cols-2 gap-4 bg-gray-50/50 dark:bg-slate-950/10 p-4 border border-gray-100 dark:border-slate-800/60 rounded-xl font-medium">
                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-400 block font-normal">TARGET MODULE</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedLog.module}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-400 block font-normal">ACTION CODE</span>
                      <span className="font-mono text-gray-900 dark:text-white">{selectedLog.action || selectedLog.what}</span>
                    </div>
                    <div className="space-y-1 col-span-2">
                      <span className="text-[10px] text-gray-400 block font-normal">DESCRIPTION SUMMARY</span>
                      <span className="text-gray-800 dark:text-gray-200">{selectedLog.description}</span>
                    </div>
                    <div className="space-y-1 col-span-2">
                      <span className="text-[10px] text-gray-400 block font-normal">REMARKS</span>
                      <span className="text-gray-800 dark:text-gray-200 font-mono bg-white dark:bg-slate-950 p-2 rounded border border-gray-100 dark:border-slate-800 block">
                        {selectedLog.remarks || 'None'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* NETWORK SECURITY GRID */}
                <div className="space-y-3">
                  <h4 className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">Telemetry Logs</h4>
                  <div className="grid grid-cols-2 gap-4 bg-gray-50/50 dark:bg-slate-950/10 p-4 border border-gray-100 dark:border-slate-800/60 rounded-xl font-medium">
                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-400 block font-normal flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5" /> IP ADDRESS
                      </span>
                      <span className="font-mono">{selectedLog.ipAddress || '127.0.0.1'}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-400 block font-normal flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5" /> SESSION ID
                      </span>
                      <span className="font-mono text-[10px] tracking-tight truncate block" title={selectedLog.sessionId}>{selectedLog.sessionId || 'N/A'}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-400 block font-normal flex items-center gap-1">
                        <Monitor className="w-3.5 h-3.5" /> OPERATING SYSTEM / BROWSER
                      </span>
                      <span>{selectedLog.operatingSystem || 'Other'} ({selectedLog.browser || 'Other'})</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-400 block font-normal flex items-center gap-1">
                        <Smartphone className="w-3.5 h-3.5" /> DEVICE TYPE
                      </span>
                      <span>{selectedLog.device || 'Desktop'}</span>
                    </div>
                  </div>
                </div>

                {/* VALUE CHANGES SIDE-BY-SIDE DIFF */}
                <div className="space-y-3">
                  <h4 className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">Parameter Delta Diffs (JSON)</h4>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Previous Value (Before Change)
                      </span>
                      <pre className="p-3 bg-rose-50 dark:bg-rose-950/10 text-rose-800 dark:text-rose-300 rounded-xl border border-rose-100/40 dark:border-rose-900/20 font-mono text-[10px] overflow-x-auto max-h-40 leading-relaxed">
                        {formatJSONDiff(selectedLog.oldValue)}
                      </pre>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Updated Value (After Change)
                      </span>
                      <pre className="p-3 bg-emerald-50 dark:bg-emerald-950/10 text-emerald-800 dark:text-emerald-300 rounded-xl border border-emerald-100/40 dark:border-emerald-900/20 font-mono text-[10px] overflow-x-auto max-h-40 leading-relaxed">
                        {formatJSONDiff(selectedLog.newValue)}
                      </pre>
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ADMIN LEDGER DOUBLE CONFIRMATION ARCHIVAL MODAL */}
      <AnimatePresence>
        {showArchiveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 animate-fade-in">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative"
            >
              <div className="flex items-start gap-3 text-amber-600 dark:text-amber-400 mb-4">
                <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Critical Archive Action Required</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    This action will completely backup, download, and clear the active security operational log ledger. Live search metrics will reset.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl text-[11px] font-medium text-slate-500 border border-slate-100 dark:border-slate-800 mb-4">
                This administrative operation will log itself as <span className="font-mono font-bold text-red-500">ARCHIVE_AUDIT_LOGS</span> and can only be undone by database rollbacks.
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Type <span className="font-mono text-red-500 font-bold">ARCHIVE</span> to verify clearance</label>
                <input 
                  type="text" 
                  value={archiveConfirmText}
                  onChange={(e) => setArchiveConfirmText(e.target.value)}
                  placeholder="Type ARCHIVE here..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-red-500 font-bold text-center tracking-wider text-red-500"
                />
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button 
                  onClick={() => { setShowArchiveModal(false); setArchiveConfirmText(''); }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleArchiveLogs}
                  disabled={archiveConfirmText !== 'ARCHIVE' || isArchiving}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm shadow-rose-100 dark:shadow-none"
                >
                  {isArchiving ? 'Archiving Ledger...' : 'Confirm Archival'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE LOG CONFIRMATION MODAL */}
      <AnimatePresence>
        {logToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 animate-fade-in">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative"
            >
              <div className="flex items-start gap-3 text-rose-600 dark:text-rose-400 mb-4">
                <Trash2 className="w-6 h-6 flex-shrink-0" />
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Delete Single Log Entry</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Are you absolutely sure you want to permanently delete audit log entry <span className="font-mono text-[10px] font-bold text-gray-700 dark:text-gray-200">{logToDelete.id}</span>?
                  </p>
                </div>
              </div>

              <div className="p-3 bg-rose-50 dark:bg-rose-950/20 rounded-xl text-[10px] font-medium text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40 mb-4">
                CRITICAL WARNING: System security rules mandate that every log deletion is itself logged inside the audit trail as <span className="font-mono font-bold text-red-600">DELETE_AUDIT_LOG</span>. This action is irreversible.
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button 
                  onClick={() => setLogToDelete(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteLog}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  {isDeleting ? 'Deleting...' : 'Permanent Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
