import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { BatteryModel, Plant, Customer } from '../types';
import { Plus, Edit2, Cpu, Check, X, CheckCircle2, Ban, Trash2, FileSpreadsheet, Download, Upload, AlertCircle } from 'lucide-react';
import { getPermissions } from '../lib/permissions';
import * as XLSX from 'xlsx';

interface ModelMasterProps {
  currentUser: any;
}

export default function ModelMaster({ currentUser }: ModelMasterProps) {
  const perms = getPermissions(currentUser, 'modelMaster');
  const [models, setModels] = useState<BatteryModel[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [batteryType, setBatteryType] = useState('TT');
  const [capacity, setCapacity] = useState('150Ah');
  const [startSerial, setStartSerial] = useState('1000');
  const [endSerial, setEndSerial] = useState('999999');
  const [customerName, setCustomerName] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');

  // Bulk upload state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [importResults, setImportResults] = useState<{ imported: number; errors: string[] } | null>(null);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

  const canEdit = perms.add || perms.edit;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [modelList, plantList, customerList] = await Promise.all([
        api.models.list(),
        api.plants.list(),
        api.customers.list()
      ]);
      setModels(modelList);
      setPlants(plantList);
      setCustomers(customerList);
      if (customerList.length > 0) setCustomerName(customerList[0].name);
    } catch (err: any) {
      setError(err.message || 'Failed to load master lists');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) return;
    setError('');
    setSuccess('');

    try {
      await api.models.create({
        name,
        code: code.toUpperCase(),
        batteryType,
        capacity,
        startSerial,
        endSerial,
        customerName,
        status
      });
      setSuccess('Battery model configuration created successfully!');
      setName('');
      setCode('');
      setCustomerName(customers.length > 0 ? customers[0].name : '');
      setShowAddForm(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create battery model');
    }
  };

  const handleUpdate = async (id: string) => {
    setError('');
    setSuccess('');
    try {
      await api.models.update(id, { name, batteryType, capacity, customerName, status });
      setSuccess('Battery model configuration updated!');
      setEditingId(null);
      setName('');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update battery model');
    }
  };

  const handleDelete = async (id: string) => {
    setError('');
    setSuccess('');
    try {
      await api.models.delete(id);
      setSuccess('Battery model successfully deleted.');
      setConfirmDeleteId(null);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete battery model');
    }
  };

  const downloadTemplate = () => {
    const sampleData = [
      {
        'Model Name': 'PowerPack Ultra M160',
        'Model Prefix Code': 'M160',
        'Battery Tech Type': 'TT',
        'Capacity Rating': '160Ah',
        'Associated Customer': customers.length > 0 ? customers[0].name : 'Microtek',
        'Status': 'Active'
      },
      {
        'Model Name': 'EcoTubular ST150',
        'Model Prefix Code': 'ST15',
        'Battery Tech Type': 'ST',
        'Capacity Rating': '150Ah',
        'Associated Customer': customers.length > 0 ? customers[0].name : 'Microtek',
        'Status': 'Active'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Battery_Models_Template");
    XLSX.writeFile(wb, "Battery_Models_Bulk_Import_Template.xlsx");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setError('');
    setSuccess('');
    setImportResults(null);

    const file = files[0];
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

        setParsedRows(data);
        setSuccess(`Loaded ${data.length} model records from Excel. Click "Process Bulk Import" to validate and import.`);
      } catch (err: any) {
        setError('Failed to parse Excel file. Ensure it is a valid .xlsx file.');
        console.error(err);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleBulkUploadSubmit = async () => {
    if (parsedRows.length === 0) return;
    setError('');
    setSuccess('');
    setIsProcessingBulk(true);
    setImportResults(null);

    try {
      const res: any = await api.models.bulk({ rows: parsedRows });
      if (res.success) {
        setSuccess(`Successfully imported ${res.imported} battery models!`);
        setParsedRows([]);
        setShowBulkModal(false);
        loadData();
      } else {
        setImportResults({
          imported: 0,
          errors: res.errors || ['Validation failed during bulk import.']
        });
        setError('Excel content has validation failures. Please review the errors below.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit bulk import to ERP.');
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const startEdit = (m: BatteryModel) => {
    setEditingId(m.id);
    setName(m.name);
    setBatteryType(m.batteryType);
    setCapacity(m.capacity);
    setCustomerName(m.customerName || '');
    setStatus(m.status);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName('');
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Battery Model Master Configuration</h2>
          <p className="text-xs text-gray-500">Define technical parameters, capacity, prefixes, and authorized manufacturing boundaries.</p>
        </div>
        {perms.add && !showAddForm && (
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setError('');
                setSuccess('');
                setImportResults(null);
                setParsedRows([]);
                setShowBulkModal(true);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm transition cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              <span>Bulk Upload Models</span>
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Configure Model</span>
            </button>
          </div>
        )}
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

      {/* Add Model Form */}
      {showAddForm && (
        <form onSubmit={handleAdd} className="p-5 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Configure New Battery Model</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Model Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. PowerPack Ultra"
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Model Prefix Code</label>
              <input
                type="text"
                required
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="e.g. M22"
                maxLength={4}
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white uppercase focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Battery Tech Type</label>
              <select
                value={batteryType}
                onChange={e => setBatteryType(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none"
              >
                <option value="TT">TT</option>
                <option value="ST">ST</option>
                <option value="JT">JT</option>
                <option value="XLJT">XLJT</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Capacity Rating</label>
              <select
                value={capacity}
                onChange={e => setCapacity(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none"
              >
                {Array.from({ length: (300 - 100) / 5 + 1 }, (_, i) => {
                  const ah = 100 + i * 5;
                  return (
                    <option key={ah} value={`${ah}Ah`}>
                      {ah} Ah
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Associated Customer</label>
              <select
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none"
              >
                <option value="">Select Customer (Optional)</option>
                {customers.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Initial Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
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
              className="px-4 py-1.5 bg-cyan-600 text-white rounded-lg text-xs font-semibold hover:bg-cyan-500"
            >
              Verify & Create Model
            </button>
          </div>
        </form>
      )}

      {/* Models Table Layout */}
      {loading ? (
        <div className="p-12 text-center text-xs text-gray-400">Syncing battery masters...</div>
      ) : models.length === 0 ? (
        <div className="p-12 border border-dashed border-gray-200 dark:border-slate-800 rounded-2xl text-center text-xs text-gray-500">
          No configured battery models found.
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-950 border-b border-gray-100 dark:border-slate-800 text-xs font-bold text-gray-700 dark:text-gray-300">
                  <th className="px-6 py-4">Prefix</th>
                  <th className="px-6 py-4">Model Description</th>
                  <th className="px-6 py-4">Battery Spec</th>
                  <th className="px-6 py-4 font-mono">Current Running</th>
                  <th className="px-6 py-4">Associated Customer</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  {(perms.edit || perms.delete) && <th className="px-6 py-4 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs text-gray-800 dark:text-gray-300">
                {models.map(m => {
                  const isEditing = editingId === m.id;
                  return (
                    <tr key={m.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-4 font-bold font-mono text-cyan-600 dark:text-cyan-400">
                        {m.code}
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-950 dark:text-white">
                        {isEditing ? (
                          <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded px-2 py-1 text-xs"
                          />
                        ) : (
                          m.name
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <div className="flex space-x-1">
                            <select
                              value={batteryType}
                              onChange={e => setBatteryType(e.target.value)}
                              className="bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded px-1.5 py-1 text-xs"
                            >
                              <option value="TT">TT</option>
                              <option value="ST">ST</option>
                              <option value="JT">JT</option>
                              <option value="XLJT">XLJT</option>
                            </select>
                            <input
                              type="text"
                              value={capacity}
                              onChange={e => setCapacity(e.target.value)}
                              className="w-16 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded px-1.5 py-1 text-xs"
                            />
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                            {m.batteryType} • {m.capacity}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-gray-900 dark:text-white">{m.currentSerial}</td>
                      <td className="px-6 py-4 font-semibold text-indigo-600 dark:text-indigo-400">
                        {isEditing ? (
                          <select
                            value={customerName}
                            onChange={e => setCustomerName(e.target.value)}
                            className="bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded px-1.5 py-1 text-xs text-gray-900 dark:text-white"
                          >
                            <option value="">None (Optional)</option>
                            {customers.map(c => (
                              <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                          </select>
                        ) : (
                          m.customerName || '—'
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isEditing ? (
                          <select
                            value={status}
                            onChange={e => setStatus(e.target.value as any)}
                            className="bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded px-1 py-1 text-xs"
                          >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                          </select>
                        ) : m.status === 'Active' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-gray-400 dark:text-gray-500 font-medium">
                            <Ban className="w-3.5 h-3.5" />
                            Inactive
                          </span>
                        )}
                      </td>
                      {(perms.edit || perms.delete) && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end space-x-1">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => handleUpdate(m.id)}
                                  className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded"
                                  title="Save Changes"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded"
                                  title="Cancel"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                {perms.edit && (
                                  <button
                                    onClick={() => startEdit(m)}
                                    className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded"
                                    title="Edit"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                )}
                                {perms.delete && (
                                  confirmDeleteId === m.id ? (
                                    <div className="flex items-center gap-1 animate-fade-in">
                                      <button
                                        onClick={() => handleDelete(m.id)}
                                        className="px-1.5 py-0.5 bg-red-600 text-white rounded text-[10px] font-bold hover:bg-red-500 cursor-pointer"
                                        title="Confirm deletion"
                                      >
                                        Confirm
                                      </button>
                                      <button
                                        onClick={() => setConfirmDeleteId(null)}
                                        className="px-1 py-0.5 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 rounded text-[10px] hover:bg-gray-200 cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setConfirmDeleteId(m.id)}
                                      className="p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded"
                                      title="Delete Model"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <FileSpreadsheet className="text-emerald-500 w-4 h-4" />
                Excel Bulk Model Import
              </h3>
              <button 
                onClick={() => {
                  setShowBulkModal(false);
                  setParsedRows([]);
                  setImportResults(null);
                }} 
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
            <div className="flex justify-between items-start">
              <p className="text-xs text-gray-500 dark:text-slate-400 leading-normal max-w-md">
                Upload a spreadsheet (<code className="bg-slate-100 dark:bg-slate-950 px-1 py-0.5 rounded text-gray-800 dark:text-slate-300 font-mono">.xlsx</code>) containing columns for:
                <br />
                <span className="text-cyan-600 dark:text-cyan-400 font-semibold font-mono">Model Name</span>, <span className="text-cyan-600 dark:text-cyan-400 font-semibold font-mono">Model Prefix Code</span>, <span className="text-cyan-600 dark:text-cyan-400 font-semibold font-mono">Battery Tech Type</span> (e.g. TT, ST, JT, XLJT), <span className="text-cyan-600 dark:text-cyan-400 font-semibold font-mono">Capacity Rating</span> (e.g. 150Ah), <span className="text-cyan-600 dark:text-cyan-400 font-semibold font-mono">Associated Customer</span>, and <span className="text-cyan-600 dark:text-cyan-400 font-semibold font-mono">Status</span>.
              </p>
              <button
                type="button"
                onClick={downloadTemplate}
                className="flex items-center space-x-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-cyan-600 dark:text-cyan-400 text-[11px] font-semibold rounded-lg transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Get Template</span>
              </button>
            </div>

            {/* Custom file drop-zone */}
            <div className="border border-dashed border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 rounded-xl p-6 text-center space-y-2 relative">
              <input
                type="file"
                accept=".xlsx"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="w-8 h-8 mx-auto text-gray-400" />
              <p className="text-xs font-semibold text-gray-600 dark:text-slate-300">Drag & Drop your Excel file or click to browse</p>
              <p className="text-[10px] text-gray-400 dark:text-slate-500">Supported formats: standard .xlsx spreadsheets only</p>
            </div>

            {parsedRows.length > 0 && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-400">
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Successfully parsed <strong>{parsedRows.length} rows</strong> from sheet.
                </span>
                <span className="font-mono text-[10px] text-gray-400 dark:text-slate-500">Ready to Import</span>
              </div>
            )}

            {importResults && importResults.errors.length > 0 && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-xl space-y-2 text-xs">
                <p className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  Excel Content Validation Failures:
                </p>
                <div className="max-h-36 overflow-y-auto divide-y divide-rose-100 dark:divide-rose-950/40 text-[11px] text-rose-600 dark:text-rose-300 font-mono space-y-1">
                  {importResults.errors.map((err, i) => (
                    <p key={i} className="py-1">{err}</p>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowBulkModal(false);
                  setParsedRows([]);
                  setImportResults(null);
                }}
                className="px-3 py-1.5 border border-gray-200 dark:border-slate-800 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkUploadSubmit}
                disabled={parsedRows.length === 0 || isProcessingBulk}
                className="flex items-center space-x-1.5 px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-semibold shadow disabled:opacity-50"
              >
                {isProcessingBulk ? 'Processing...' : 'Process Bulk Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
