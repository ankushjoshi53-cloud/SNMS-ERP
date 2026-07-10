import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { DispatchEntry, Customer, BatteryModel, SerialNumber } from '../types';
import { Truck, Calendar, ShoppingBag, Plus, Clipboard, CheckCircle, FileText, AlertTriangle, Upload, Edit2, X } from 'lucide-react';
import { getPermissions } from '../lib/permissions';

export default function DispatchModule({ currentUser }: { currentUser: any }) {
  const perms = getPermissions(currentUser, 'dispatchControl');
  const [dispatches, setDispatches] = useState<DispatchEntry[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [models, setModels] = useState<BatteryModel[]>([]);
  const [pdiApprovedSerials, setPdiApprovedSerials] = useState<SerialNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Edit states
  const [editingDispatch, setEditingDispatch] = useState<DispatchEntry | null>(null);
  const [editInvoiceNumber, setEditInvoiceNumber] = useState('');
  const [editInvoiceDate, setEditInvoiceDate] = useState('');
  const [editVehicle, setEditVehicle] = useState('');
  const [editTransport, setEditTransport] = useState('');
  const [editLrNumber, setEditLrNumber] = useState('');
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editModelCode, setEditModelCode] = useState('');
  const [editSerialNumbers, setEditSerialNumbers] = useState('');

  // Serial list modal state
  const [selectedDispatchForSerials, setSelectedDispatchForSerials] = useState<DispatchEntry | null>(null);
  const [serialSearchTerm, setSerialSearchTerm] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  // Form states
  const [customerName, setCustomerName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [modelCode, setModelCode] = useState('');
  const [scanText, setScanText] = useState(''); // Textarea for barcode simulation
  const [vehicle, setVehicle] = useState('');
  const [transport, setTransport] = useState('');
  const [lrNumber, setLrNumber] = useState('');

  // CSV Drag and Drop state
  const [dragActive, setDragActive] = useState(false);

  const processCsvFile = (file: File) => {
    setError('');
    setSuccess('');
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/);
      const parsedSerials: string[] = [];

      lines.forEach(line => {
        const cells = line.split(/[,\t;]/).map(c => c.trim().replace(/['"]/g, ''));
        cells.forEach(cell => {
          if (cell && cell.length >= 4 && /^[A-Za-z0-9-]+$/.test(cell)) {
            const lowercaseCell = cell.toLowerCase();
            if (lowercaseCell !== 'serial' && 
                lowercaseCell !== 'serialnumber' && 
                lowercaseCell !== 'serial number' && 
                lowercaseCell !== 'serial_number' &&
                lowercaseCell !== 'barcode') {
              parsedSerials.push(cell);
            }
          }
        });
      });

      if (parsedSerials.length === 0) {
        setError('No valid serial numbers found in the uploaded CSV/TXT file.');
        return;
      }

      const existingSerials = scanText
        .split('\n')
        .map(x => x.trim())
        .filter(x => x.length > 0);

      const combined = Array.from(new Set([...existingSerials, ...parsedSerials]));
      setScanText(combined.join('\n') + '\n');
      setSuccess(`Imported ${parsedSerials.length} serial numbers from "${file.name}"!`);
    };

    reader.onerror = () => {
      setError('Failed to read the CSV file.');
    };

    reader.readAsText(file);
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processCsvFile(file);
      e.target.value = '';
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer?.files?.[0];
    if (file) {
      processCsvFile(file);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dispList, custList, modelList, serialList] = await Promise.all([
        api.dispatches.list(),
        api.customers.list(),
        api.models.list(),
        api.search.query({})
      ]);

      setDispatches(dispList);
      setCustomers(custList);
      setModels(modelList.filter(m => m.status === 'Active'));

      // Filter serials that are 'PDI Approved' (available for dispatch)
      const userStr = localStorage.getItem('erp_user');
      const user = userStr ? JSON.parse(userStr) : null;
      const targetPlant = user?.plant || 'Plant Alpha';

      const approved = serialList.filter((s: SerialNumber) =>
        s.status === 'PDI Approved' &&
        (targetPlant === 'All' || s.currentPlant === targetPlant)
      );

      setPdiApprovedSerials(approved);

      if (custList.length > 0) setCustomerName(custList[0].name);
      if (modelList.length > 0) setModelCode(modelList[0].code);
    } catch (err: any) {
      setError(err.message || 'Failed to sync dispatch parameters');
    } finally {
      setLoading(false);
    }
  };

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !invoiceNumber || !modelCode || !scanText.trim()) {
      setError('Missing Invoice parameters or Serial scan lines.');
      return;
    }
    setError('');
    setSuccess('');

    // Parse and sanitize serial numbers
    const serialList = scanText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (serialList.length === 0) {
      setError('Please scan or type at least one battery serial number.');
      return;
    }

    // Validate customer serial constraints
    const selectedCustomer = customers.find(c => c.name === customerName);
    if (selectedCustomer) {
      if (selectedCustomer.totalDigitsOfSerial) {
        for (const serialNum of serialList) {
          if (serialNum.length !== selectedCustomer.totalDigitsOfSerial) {
            setError(`Format mismatch: Serial '${serialNum}' is ${serialNum.length} characters long, but ${customerName} requires exactly ${selectedCustomer.totalDigitsOfSerial} total characters.`);
            return;
          }
        }
      }
      if (selectedCustomer.numericDigitsOfSerial) {
        for (const serialNum of serialList) {
          const suffix = serialNum.slice(-selectedCustomer.numericDigitsOfSerial);
          const isAllNumeric = /^\d+$/.test(suffix);
          if (!isAllNumeric || suffix.length !== selectedCustomer.numericDigitsOfSerial) {
            setError(`Format mismatch: Serial '${serialNum}' must end with exactly ${selectedCustomer.numericDigitsOfSerial} numeric digits for customer ${customerName}.`);
            return;
          }
        }
      }
    }

    try {
      await api.dispatches.create({
        customerName,
        invoiceNumber,
        invoiceDate,
        modelCode,
        serialNumbers: serialList,
        vehicle,
        transport,
        lrNumber
      });
      setSuccess(`Dispatch Registered: Invoice ${invoiceNumber} issued with ${serialList.length} batteries!`);
      setInvoiceNumber('');
      setScanText('');
      setVehicle('');
      setTransport('');
      setLrNumber('');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Dispatch entry failed');
    }
  };




  // Quick action: click to append serial to scanText
  const addSerialToScan = (sn: string) => {
    const lines = scanText
      .split('\n')
      .map(x => x.trim())
      .filter(x => x.length > 0);
    if (!lines.includes(sn)) {
      setScanText([...lines, sn].join('\n') + '\n');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Battery Dispatch & Outward Invoicing</h2>
          <p className="text-xs text-gray-500">Log commercial outward shipments, verify PDI statuses, and emit transport documentation.</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 text-xs rounded-xl font-medium">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl font-medium">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Entry Panel */}
        <div className="xl:col-span-2 space-y-6">
          <form onSubmit={handleDispatch} className="p-6 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Truck className="w-4 h-4 text-cyan-500" />
              Prepare Outward Shipment
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Consignee Customer</label>
                <div className="relative">
                  <ShoppingBag className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <select
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-xs text-gray-900 dark:text-white focus:outline-none"
                  >
                    {customers.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                {(() => {
                  const selectedCustomer = customers.find(c => c.name === customerName);
                  if (selectedCustomer && (selectedCustomer.totalDigitsOfSerial || selectedCustomer.numericDigitsOfSerial)) {
                    return (
                      <p className="mt-1.5 text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>
                          Rules: {selectedCustomer.totalDigitsOfSerial ? `Len: ${selectedCustomer.totalDigitsOfSerial} chars` : ''}
                          {selectedCustomer.totalDigitsOfSerial && selectedCustomer.numericDigitsOfSerial ? ' | ' : ''}
                          {selectedCustomer.numericDigitsOfSerial ? `Suffix: ${selectedCustomer.numericDigitsOfSerial} num` : ''}
                        </span>
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Invoice Reference No.</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={invoiceNumber}
                    onChange={e => setInvoiceNumber(e.target.value)}
                    placeholder="e.g. INV-2026-88"
                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-xs text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Invoice Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    required
                    value={invoiceDate}
                    onChange={e => setInvoiceDate(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-xs text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Battery Model</label>
                <select
                  value={modelCode}
                  onChange={e => setModelCode(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs text-gray-900 dark:text-white focus:outline-none"
                >
                  {models.map(m => (
                    <option key={m.id} value={m.code}>{m.code} - {m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Transporter Name</label>
                <input
                  type="text"
                  value={transport}
                  onChange={e => setTransport(e.target.value)}
                  placeholder="e.g. VRL Logistics"
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">LR / Consignment No.</label>
                <input
                  type="text"
                  value={lrNumber}
                  onChange={e => setLrNumber(e.target.value)}
                  placeholder="e.g. LR-4481-C"
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs text-gray-900 dark:text-white"
                />
              </div>

              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Vehicle Plate No.</label>
                <input
                  type="text"
                  value={vehicle}
                  onChange={e => setVehicle(e.target.value)}
                  placeholder="e.g. MH-12-PQ-9876"
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Serial code scanner box & CSV Upload Option */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <label className="block text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Scan / Upload Serial Numbers (One per line)
                </label>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-gray-400 font-semibold flex items-center gap-1">
                    <Clipboard className="w-3.5 h-3.5" />
                    Barcode Scanner ready
                  </span>
                  <span className="text-gray-350 dark:text-slate-800 font-normal">|</span>
                  <label className="text-[10px] text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 font-bold flex items-center gap-1 cursor-pointer select-none">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload CSV File</span>
                    <input
                      type="file"
                      accept=".csv,text/csv,.txt"
                      onChange={handleCsvUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <textarea
                    rows={6}
                    required
                    value={scanText}
                    onChange={e => setScanText(e.target.value)}
                    placeholder="Scan or type serial codes (one per line)...&#10;M222026071000&#10;M222026071001"
                    className="w-full h-full min-h-[140px] bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>

                {/* CSV Drag & Drop Zone */}
                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-4 flex flex-col justify-center items-center text-center space-y-2.5 transition-all duration-200 select-none ${
                    dragActive 
                      ? 'border-cyan-500 bg-cyan-50/10 dark:bg-cyan-950/20' 
                      : 'border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/20 hover:border-cyan-500/55'
                  }`}
                >
                  <div className={`p-2 rounded-full transition-colors ${dragActive ? 'bg-cyan-100 text-cyan-600' : 'bg-cyan-50 dark:bg-cyan-950/35 text-cyan-600 dark:text-cyan-400'}`}>
                    <Upload className="w-5 h-5 animate-bounce" style={{ animationDuration: '3s' }} />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-gray-700 dark:text-gray-300">Bulk Import CSV/TXT</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 max-w-[180px] leading-relaxed mx-auto">
                      Drag and drop your file here, or click to choose file
                    </p>
                  </div>
                  <label className="px-3 py-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg text-[10px] font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer transition">
                    Browse File
                    <input
                      type="file"
                      accept=".csv,text/csv,.txt"
                      onChange={handleCsvUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs shadow transition"
              >
                Authorize Shipment Outward
              </button>
            </div>
          </form>
        </div>

        {/* Available Stocks (click to transfer) */}
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm p-5 flex flex-col h-[600px]">
          <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider pb-3 border-b border-gray-50 dark:border-slate-800 mb-4 flex items-center justify-between">
            <span>PDI Approved Stock Ready</span>
            <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 px-2 py-0.5 rounded font-bold">
              {pdiApprovedSerials.length} Available
            </span>
          </h4>

          <div className="flex-1 overflow-y-auto space-y-2">
            {pdiApprovedSerials.length === 0 ? (
              <p className="p-4 text-center text-xs text-gray-400">No PDI-approved batteries found at this plant.</p>
            ) : (
              pdiApprovedSerials.map(s => (
                <button
                  key={s.serialNumber}
                  type="button"
                  onClick={() => addSerialToScan(s.serialNumber)}
                  className="w-full text-left p-2.5 rounded-xl border border-gray-100 dark:border-slate-800 hover:border-cyan-500 bg-gray-50/50 dark:bg-slate-950 hover:bg-white dark:hover:bg-slate-900/60 transition group"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold font-mono text-gray-900 dark:text-white group-hover:text-cyan-500 transition">
                      {s.serialNumber}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">Model: {s.modelCode}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1 text-[10px] text-gray-400">
                    <span>Loc: {s.currentPlant}</span>
                    <span className="text-[9px] text-cyan-600 dark:text-cyan-400 font-bold uppercase">Click to scan</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Dispatches History */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Outward Dispatch Registry</h3>
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-950 border-b border-gray-100 dark:border-slate-800 text-xs font-bold text-gray-700 dark:text-gray-300">
                  <th className="px-6 py-4">Dispatch Date</th>
                  <th className="px-6 py-4">Invoice No.</th>
                  <th className="px-6 py-4">Customer Name</th>
                  <th className="px-6 py-4">Model</th>
                  <th className="px-6 py-4">Vehicle Plate No.</th>
                  <th className="px-6 py-4">Transporter</th>
                  <th className="px-6 py-4">LR No.</th>
                  <th className="px-6 py-4 font-mono text-center">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-800 dark:text-gray-300">
                {dispatches.map(disp => (
                  <tr key={disp.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4 font-medium">{new Date(disp.invoiceDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-bold font-mono text-cyan-600 dark:text-cyan-400">{disp.invoiceNumber}</td>
                    <td className="px-6 py-4 font-semibold text-gray-950 dark:text-white">{disp.customerName}</td>
                    <td className="px-6 py-4 font-semibold font-mono">{disp.modelCode}</td>
                    <td className="px-6 py-4 font-mono text-gray-500">{disp.vehicle || '—'}</td>
                    <td className="px-6 py-4 text-gray-500">{disp.transport || '—'}</td>
                    <td className="px-6 py-4 font-mono text-gray-500">{disp.lrNumber || '—'}</td>
                    <td className="px-6 py-4 font-mono text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDispatchForSerials(disp);
                          setSerialSearchTerm('');
                          setCopySuccess(false);
                        }}
                        className="px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-extrabold hover:bg-indigo-100 dark:hover:bg-indigo-950/60 hover:underline transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        title="Click to view Serial Numbers Outward"
                      >
                        {disp.serialNumbers.length}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      
      {/* Serial Numbers Modal */}
      {selectedDispatchForSerials && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative animate-scale-up space-y-4 text-left max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-wider">Outward Serial Numbers</h3>
                <p className="text-xs text-gray-500 font-mono mt-1">Invoice: {selectedDispatchForSerials.invoiceNumber} | Qty: {selectedDispatchForSerials.serialNumbers.length}</p>
              </div>
              <button onClick={() => setSelectedDispatchForSerials(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {selectedDispatchForSerials.serialNumbers.map((sn, idx) => (
                  <div key={idx} className="bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 py-1.5 px-3 rounded-lg text-xs font-mono text-center text-gray-700 dark:text-gray-300">
                    {sn}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end pt-2">
              <button 
                onClick={() => setSelectedDispatchForSerials(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

