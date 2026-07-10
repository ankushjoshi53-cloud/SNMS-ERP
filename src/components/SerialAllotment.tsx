import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { SerialRangeAllotment, BatteryModel, Plant, Customer } from '../types';
import { Plus, Layers, Calendar, Barcode, HelpCircle, Check, Play, Upload, Sparkles, Download, FileSpreadsheet, AlertCircle, Edit2, Trash2, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { getPermissions } from '../lib/permissions';

export default function SerialAllotment({ currentUser }: { currentUser: any }) {
  const perms = getPermissions(currentUser, 'rangeAllotment');
  const [allotments, setAllotments] = useState<SerialRangeAllotment[]>([]);
  const [models, setModels] = useState<BatteryModel[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [modelCode, setModelCode] = useState('');
  const [plantName, setPlantName] = useState('');
  const [startSerialNum, setStartSerialNum] = useState('');
  const [endSerialNum, setEndSerialNum] = useState('');
  const [remarks, setRemarks] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [serialCode, setSerialCode] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');

  // Bulk Upload states
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [importResults, setImportResults] = useState<{ imported: number; errors: string[] } | null>(null);

  // Edit states
  const [editingAllotment, setEditingAllotment] = useState<SerialRangeAllotment | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editRemarks, setEditRemarks] = useState('');
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editPlantName, setEditPlantName] = useState('');
  const [editModelCode, setEditModelCode] = useState('');
  const [editYear, setEditYear] = useState('');
  const [editMonth, setEditMonth] = useState('');
  const [editStartSerialNum, setEditStartSerialNum] = useState('');
  const [editEndSerialNum, setEditEndSerialNum] = useState('');
  const [editSerialCode, setEditSerialCode] = useState('');
  const [editStatus, setEditStatus] = useState<'Active' | 'Inactive'>('Active');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allotList, modelList, plantList, customerList] = await Promise.all([
        api.allotments.list(),
        api.models.list(),
        api.plants.list(),
        api.customers.list()
      ]);
      setAllotments(allotList);
      setModels(modelList.filter(m => m.status === 'Active'));
      setPlants(plantList);
      setCustomers(customerList);

      if (modelList.length > 0) {
        const firstActive = modelList.find(m => m.status === 'Active') || modelList[0];
        setModelCode(firstActive.code);
        setStartSerialNum(firstActive.currentSerial);
        setEndSerialNum(String(parseInt(firstActive.currentSerial) + 99)); // Default to range of 100
      }
      if (plantList.length > 0) {
        setPlantName(plantList[0].name);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sync allotment records');
    } finally {
      setLoading(false);
    }
  };

  // Auto update running serial recommendation on model change
  const handleModelChange = (mCode: string) => {
    setModelCode(mCode);
    const m = models.find(x => x.code === mCode);
    if (m) {
      setStartSerialNum(m.currentSerial);
      setEndSerialNum(String(parseInt(m.currentSerial) + 99));
    }
  };

  // Submit Range
  const handleAllot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !modelCode || !plantName || !startSerialNum || !endSerialNum) return;
    setError('');
    setSuccess('');

    if (customerName) {
      const selectedCustomer = customers.find(c => c.name === customerName);
      if (selectedCustomer && selectedCustomer.uniqueCodeLength) {
        const activePrefix = serialCode || modelCode;
        if (!activePrefix || activePrefix.length !== selectedCustomer.uniqueCodeLength) {
          setError(`Unique Code / Model Code prefix must be exactly ${selectedCustomer.uniqueCodeLength} characters for customer ${customerName}.`);
          return;
        }
      }
    }

    try {
      await api.allotments.create({
        date,
        modelCode,
        plantName,
        startSerialNum,
        endSerialNum,
        remarks,
        customerName,
        year,
        month,
        serialCode,
        status
      });
      setSuccess('Serial Number range allotted successfully!');
      setShowAddForm(false);
      setRemarks('');
      setCustomerName('');
      setSerialCode('');
      setStatus('Active');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Range Allotment failed');
    }
  };

  const startEdit = (allot: SerialRangeAllotment) => {
    setEditingAllotment(allot);
    setEditDate(allot.date);
    setEditRemarks(allot.remarks || '');
    setEditCustomerName(allot.customerName || '');
    setEditPlantName(allot.plantName || '');
    setEditModelCode(allot.modelCode || '');
    setEditYear(allot.year || new Date().getFullYear().toString());
    setEditMonth(allot.month || String(new Date().getMonth() + 1).padStart(2, '0'));
    const rDigits = allot.digitsLength || 4;
    const sNum = parseInt(allot.startSerial.slice(-rDigits), 10);
    const eNum = parseInt(allot.endSerial.slice(-rDigits), 10);
    setEditStartSerialNum(String(sNum));
    setEditEndSerialNum(String(eNum));
    setEditSerialCode(allot.serialCode || '');
    setEditStatus(allot.status || 'Active');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAllotment) return;
    setError('');
    setSuccess('');

    if (editCustomerName) {
      const selectedCustomer = customers.find(c => c.name === editCustomerName);
      if (selectedCustomer && selectedCustomer.uniqueCodeLength) {
        const activePrefix = editSerialCode || editModelCode;
        if (!activePrefix || activePrefix.length !== selectedCustomer.uniqueCodeLength) {
          setError(`Unique Code / Model Code prefix must be exactly ${selectedCustomer.uniqueCodeLength} characters for customer ${editCustomerName}.`);
          return;
        }
      }
    }

    try {
      await api.allotments.update(editingAllotment.id, {
        date: editDate,
        remarks: editRemarks,
        customerName: editCustomerName,
        plantName: editPlantName,
        modelCode: editModelCode,
        year: editYear,
        month: editMonth,
        startSerialNum: editStartSerialNum,
        endSerialNum: editEndSerialNum,
        serialCode: editSerialCode,
        status: editStatus
      });
      setSuccess('Allotment record successfully updated!');
      setEditingAllotment(null);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update allotment');
    }
  };

  // Process Excel File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setSuccess('');
    setImportResults(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          setError('The uploaded Excel sheet is empty.');
          return;
        }

        // Map columns dynamically to support casing variations seamlessly
        const mappedData = data.map(row => {
          const findVal = (keys: string[]) => {
            const matchedKey = Object.keys(row).find(k => 
              keys.some(key => k.toLowerCase().replace(/[^a-z0-9]/g, '') === key.toLowerCase().replace(/[^a-z0-9]/g, ''))
            );
            return matchedKey ? row[matchedKey] : '';
          };

          return {
            date: findVal(['Allotment Date', 'Date', 'allotDate']),
            customerName: findVal(['Customer Name', 'Customer', 'customerName']),
            plantName: findVal(['Target Plant', 'Plant', 'plantName', 'Location', 'Plant Assignment']),
            modelCode: findVal(['Battery Model', 'Model', 'modelCode', 'Model Code']),
            serialCode: findVal(['Unique Code', 'serialCode', 'UniqueCode', 'Prefix']),
            startSerialNum: findVal(['Starting Serial Running No.', 'Starting Serial Number', 'startSerialNum', 'start']),
            endSerialNum: findVal(['Ending Serial Running No.', 'Ending Serial Number', 'endSerialNum', 'end']),
            status: findVal(['Status', 'status']) || 'Active',
            remarks: findVal(['Remarks', 'remarks']) || ''
          };
        });

        setParsedRows(mappedData);
        setSuccess(`Loaded ${mappedData.length} records from Excel. Click Process to run full ERP validations.`);
      } catch (err: any) {
        setError('Failed to parse Excel file. Ensure it is a valid .xlsx file.');
        console.error(err);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Submit Parsed Excel rows to Backend API
  const handleBulkImport = async () => {
    if (parsedRows.length === 0) {
      setError('Please choose a valid Excel file first.');
      return;
    }
    setError('');
    setSuccess('');
    setImportResults(null);

    try {
      const result = await api.reports.bulkImport(parsedRows);
      setImportResults(result);
      if (result.success && result.errors.length === 0) {
        setSuccess(`Bulk range allotment completed: ${result.imported} ranges added successfully!`);
        setShowBulkModal(false);
        setParsedRows([]);
        loadData();
      } else {
        setError(result.message || 'Validation errors detected in spreadsheet. Correct them and re-upload.');
      }
    } catch (err: any) {
      setError(err.message || 'Bulk upload failed');
    }
  };

  // Generate and Download Excel Template
  const downloadTemplate = () => {
    const sampleData = [
      {
        "Allotment Date": new Date().toISOString().split('T')[0],
        "Customer Name": "Microtek",
        "Target Plant": plants[0]?.name || "Plant Alpha",
        "Battery Model": "M22",
        "Unique Code": "",
        "Starting Serial Running No.": "100001",
        "Ending Serial Running No.": "100100",
        "Status": "Active",
        "Remarks": "Standard allotment"
      },
      {
        "Allotment Date": new Date().toISOString().split('T')[0],
        "Customer Name": "Microtek",
        "Target Plant": plants[0]?.name || "Plant Alpha",
        "Battery Model": "M150",
        "Unique Code": "26G0B4T2G",
        "Starting Serial Running No.": "100116311",
        "Ending Serial Running No.": "100119919",
        "Status": "Active",
        "Remarks": "Bulk range allotment"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bulk_Import_Template");
    XLSX.writeFile(wb, "Serial_Number_Bulk_Import_Template.xlsx");
  };

  // Automatically calculate Quantity
  const qty = parseInt(endSerialNum) - parseInt(startSerialNum) + 1;
  const isInvalidQty = isNaN(qty) || qty <= 0;

  const selectedCustomer = customers.find(c => c.name === customerName);
  const currentDigits = selectedCustomer?.numericDigitsOfSerial || 4;
  const previewStart = startSerialNum ? `${serialCode ? serialCode : `${modelCode}`}${startSerialNum.padStart(currentDigits, '0')}` : '—';
  const previewEnd = endSerialNum ? `${serialCode ? serialCode : `${modelCode}`}${endSerialNum.padStart(currentDigits, '0')}` : '—';

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Serial Number Range Allotment (QA Block)</h2>
          <p className="text-xs text-gray-500">Authorize serial ranges. Allotted blocks can be manufactured in target assembly lines.</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setParsedRows([]);
              setImportResults(null);
              setShowBulkModal(true);
            }}
            className="flex items-center space-x-2 px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-800 dark:text-white text-xs font-semibold rounded-xl shadow transition cursor-pointer"
          >
            <Upload className="w-4 h-4 text-cyan-600" />
            <span>Excel Bulk Upload</span>
          </button>
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow transition"
            >
              <Plus className="w-4 h-4" />
              <span>Allot Range</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 text-xs rounded-xl font-medium flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl font-medium flex items-start gap-2">
          <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
          <span>{success}</span>
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <form onSubmit={handleAllot} className="p-5 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-500" />
            Establish Range Authorization
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Allotment Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  required
                  value={date}
                  onChange={e => {
                    const val = e.target.value;
                    setDate(val);
                    if (val) {
                      const d = new Date(val);
                      if (!isNaN(d.getTime())) {
                        setYear(d.getFullYear().toString());
                        setMonth(String(d.getMonth() + 1).padStart(2, '0'));
                      }
                    }
                  }}
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Customer Name</label>
              <select required value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-gray-900 dark:text-white focus:outline-none"
              >
                <option value="">— Internal / Default (4 digits) —</option>
                {customers.map(c => (
                  <option key={c.id} value={c.name}>{c.name} {c.numericDigitsOfSerial ? `(${c.numericDigitsOfSerial} digits)` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Target Plant</label>
              <select
                value={plantName}
                onChange={e => setPlantName(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-gray-900 dark:text-white focus:outline-none"
              >
                {plants.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Battery Model</label>
              <select
                value={modelCode}
                onChange={e => handleModelChange(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-gray-900 dark:text-white focus:outline-none"
              >
                {models.map(m => (
                  <option key={m.id} value={m.code}>{m.code} - {m.name} ({m.capacity})</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Unique Code</label>
              <input
                type="text"
                value={serialCode}
                onChange={e => setSerialCode(e.target.value)}
                placeholder="Unique code given by customer"
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as 'Active' | 'Inactive')}
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-gray-900 dark:text-white focus:outline-none"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Starting Serial Running No.</label>
              <input
                type="text"
                required
                value={startSerialNum}
                onChange={e => setStartSerialNum(e.target.value)}
                placeholder="As per Customer Suffix Len"
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-gray-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Ending Serial Running No.</label>
              <input
                type="text"
                required
                value={endSerialNum}
                onChange={e => setEndSerialNum(e.target.value)}
                placeholder="e.g. 1050"
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-gray-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Quantity (Auto-calculated)</label>
              <div className={`w-full border rounded-xl py-2 px-3 text-xs font-bold font-mono ${isInvalidQty ? 'border-rose-200 text-rose-500 bg-rose-50' : 'border-emerald-200 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900/40'}`}>
                {isInvalidQty ? 'Invalid Range bounds' : `${qty} Batteries Allotted`}
              </div>
            </div>

            <div className="md:col-span-2 lg:col-span-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-200 dark:border-slate-850 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Live Generated Serial Number Pattern Preview</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                <div>
                  <span className="text-gray-400">First Serial:</span> <span className="font-bold text-cyan-600 dark:text-cyan-400">{previewStart}</span>
                </div>
                <div>
                  <span className="text-gray-400">Last Serial:</span> <span className="font-bold text-cyan-600 dark:text-cyan-400">{previewEnd}</span>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 leading-normal">
                Pattern breakdown: {serialCode ? (
                  <>
                    <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded border border-gray-150 text-gray-600 font-bold">[Unique Code: {serialCode}]</code> + <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded border border-gray-150 text-gray-600 font-bold">[Running Number padded to {currentDigits} digits]</code>
                  </>
                ) : (
                  <>
                    <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded border border-gray-150 text-gray-600 font-bold">[Model: {modelCode}]</code> + <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded border border-gray-150 text-gray-600 font-bold">[Running Number padded to {currentDigits} digits]</code>
                  </>
                )}
              </p>
            </div>

            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Allotment Remarks / Work Order ID</label>
              <input
                type="text"
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                placeholder="Special testing run, military specifications line..."
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-gray-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 border border-gray-200 dark:border-slate-800 text-gray-600 dark:text-gray-400 rounded-lg text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isInvalidQty}
              className="px-4 py-1.5 bg-cyan-600 text-white rounded-lg text-xs font-semibold hover:bg-cyan-500 disabled:opacity-50"
            >
              Confirm Allotment
            </button>
          </div>
        </form>
      )}

      {/* Bulk Upload Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FileSpreadsheet className="text-cyan-400 w-4 h-4" />
                Enterprise Excel Bulk Import
              </h3>
              <button onClick={() => setShowBulkModal(false)} className="text-slate-400 hover:text-white text-xs cursor-pointer">Close</button>
            </div>
            <div className="flex justify-between items-start">
              <p className="text-xs text-slate-400 leading-normal max-w-md">
                Upload a spreadsheet (<code className="bg-slate-950 px-1 py-0.5 rounded text-white font-mono">.xlsx</code>) containing columns for:
                <br />
                <span className="text-cyan-300 font-semibold font-mono">Model</span>, <span className="text-cyan-300 font-semibold font-mono">Starting Serial Number</span>, <span className="text-cyan-300 font-semibold font-mono">Ending Serial Number</span>, and <span className="text-cyan-300 font-semibold font-mono">Plant</span>.
              </p>
              <button
                type="button"
                onClick={downloadTemplate}
                className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 text-[11px] font-semibold rounded-lg transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Get Template</span>
              </button>
            </div>

            {/* Custom file drop-zone */}
            <div className="border border-dashed border-slate-700 bg-slate-950 rounded-xl p-6 text-center space-y-2 relative">
              <input
                type="file"
                accept=".xlsx"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="w-8 h-8 mx-auto text-slate-500" />
              <p className="text-xs font-semibold text-slate-300">Drag & Drop your Excel file or click to browse</p>
              <p className="text-[10px] text-slate-500">Supported formats: standard .xlsx spreadsheets only</p>
            </div>

            {parsedRows.length > 0 && (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-300">
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  Successfully parsed <strong>{parsedRows.length} rows</strong> from sheet.
                </span>
                <span className="font-mono text-[10px] text-slate-500">Ready to Validate</span>
              </div>
            )}

            {importResults && importResults.errors.length > 0 && (
              <div className="p-4 bg-rose-950/20 border border-rose-900/50 rounded-xl space-y-2 text-xs">
                <p className="text-rose-400 font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  Excel Content Validation Failures:
                </p>
                <div className="max-h-36 overflow-y-auto divide-y divide-rose-950/40 text-[11px] text-rose-300/90 font-mono space-y-1">
                  {importResults.errors.map((err, i) => (
                    <p key={i} className="py-1">{err}</p>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="px-3 py-1.5 border border-slate-850 text-slate-400 hover:text-white rounded-lg text-xs"
              >
                Close
              </button>
              <button
                type="button"
                disabled={parsedRows.length === 0}
                onClick={handleBulkImport}
                className="px-4 py-1.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
              >
                Process Upload Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List Table */}
      {loading ? (
        <div className="p-12 text-center text-xs text-gray-400">Loading allotments...</div>
      ) : allotments.length === 0 ? (
        <div className="p-12 border border-dashed border-gray-200 dark:border-slate-800 rounded-2xl text-center text-xs text-gray-500">
          No serial number range allocations issued yet.
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-950 border-b border-gray-100 dark:border-slate-800 text-xs font-bold text-gray-700 dark:text-gray-300">
                  <th className="px-6 py-4">Allot Date</th>
                  <th className="px-6 py-4">Model</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Mfg Month</th>
                  <th className="px-6 py-4">Plant Assignment</th>
                  <th className="px-6 py-4 font-mono">Start Serial</th>
                  <th className="px-6 py-4 font-mono">End Serial</th>
                  <th className="px-6 py-4 font-mono text-center">Batch Quantity</th>
                  <th className="px-6 py-4 font-mono text-center">Pending to Pack</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Remarks</th>
                  <th className="px-6 py-4 text-right">Authorized By</th>
                  {(perms.edit) && <th className="px-6 py-4 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs text-gray-800 dark:text-gray-300">
                {allotments.map((allot: any) => (
                  <tr key={allot.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4 font-medium">{new Date(allot.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-bold font-mono text-cyan-600 dark:text-cyan-400">{allot.modelCode}</td>
                    <td className="px-6 py-4 font-medium text-purple-600 dark:text-purple-400">{allot.customerName || '—'}</td>
                    <td className="px-6 py-4 font-mono font-semibold">{allot.month && allot.year ? `${allot.month}/${allot.year}` : '—'}</td>
                    <td className="px-6 py-4 font-medium">{allot.plantName}</td>
                    <td className="px-6 py-4 font-mono font-bold text-gray-900 dark:text-white">{allot.startSerial}</td>
                    <td className="px-6 py-4 font-mono font-bold text-gray-900 dark:text-white">{allot.endSerial}</td>
                    <td className="px-6 py-4 font-mono text-center font-extrabold text-indigo-600 dark:text-indigo-400">
                      {allot.quantity}
                    </td>
                    <td className="px-6 py-4 font-mono text-center font-bold text-amber-600 dark:text-amber-400">
                      {allot.pendingCount !== undefined ? allot.pendingCount : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${allot.status === 'Inactive' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {allot.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 max-w-xs truncate" title={allot.remarks}>
                      {allot.remarks || '—'}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-600 dark:text-gray-400">{allot.allottedBy}</td>
                    {(perms.edit) && (
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center items-center gap-1.5">
                          {perms.edit && (
                            <button
                              onClick={() => startEdit(allot)}
                              className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 text-cyan-600 rounded"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Allotment Modal */}
      {editingAllotment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-scale-up space-y-4 text-left max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingAllotment(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
            
            <h3 className="text-base font-bold text-gray-950 dark:text-white">Edit Authorised Range</h3>
            
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Allotment Date</label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-955 dark:text-white focus:outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Customer Name</label>
                  <select
                    value={editCustomerName}
                    onChange={e => setEditCustomerName(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-955 dark:text-white focus:outline-none"
                  >
                    <option value="">— Internal / Default —</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Target Plant</label>
                  <select
                    value={editPlantName}
                    onChange={e => setEditPlantName(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-955 dark:text-white focus:outline-none"
                  >
                    {plants.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Battery Model</label>
                  <select
                    value={editModelCode}
                    onChange={e => setEditModelCode(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-955 dark:text-white focus:outline-none"
                  >
                    {models.map(m => (
                      <option key={m.id} value={m.code}>{m.code} - {m.name}</option>
                    ))}
                  </select>
                </div>

                

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Unique Code</label>
                  <input
                    type="text"
                    value={editSerialCode}
                    onChange={e => setEditSerialCode(e.target.value)}
                    placeholder="Unique code given by customer"
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-955 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value as 'Active' | 'Inactive')}
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-955 dark:text-white focus:outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Starting Serial Running No.</label>
                  <input
                    type="text"
                    required
                    value={editStartSerialNum}
                    onChange={e => setEditStartSerialNum(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-955 dark:text-white font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Ending Serial Running No.</label>
                  <input
                    type="text"
                    required
                    value={editEndSerialNum}
                    onChange={e => setEditEndSerialNum(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-955 dark:text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Remarks</label>
                <textarea
                  value={editRemarks}
                  onChange={e => setEditRemarks(e.target.value)}
                  rows={3}
                  className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-955 dark:text-white focus:outline-none"
                  placeholder="Additional remarks..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingAllotment(null)}
                  className="px-3 py-1.5 border border-gray-200 dark:border-slate-800 text-gray-600 dark:text-gray-400 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
