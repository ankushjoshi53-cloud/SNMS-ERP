import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { SerialTransfer, Plant, BatteryModel, UserRole, Customer } from '../types';
import { ArrowLeftRight, HelpCircle, Check, X, Calendar, MessageSquare, AlertTriangle, CheckCircle, Edit2, Trash2 } from 'lucide-react';
import { getPermissions } from '../lib/permissions';

interface TransferModuleProps {
  userRole: UserRole;
  currentUser: any;
}

export default function TransferModule({ userRole, currentUser }: TransferModuleProps) {
  const perms = getPermissions(currentUser, 'interPlantTransfer');
  const [transfers, setTransfers] = useState<SerialTransfer[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [models, setModels] = useState<BatteryModel[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Editing state
  const [editingTransfer, setEditingTransfer] = useState<SerialTransfer | null>(null);
  const [editReason, setEditReason] = useState('');
  const [editFromPlant, setEditFromPlant] = useState('');
  const [editToPlant, setEditToPlant] = useState('');
  const [editModelCode, setEditModelCode] = useState('');
  const [editStartSerial, setEditStartSerial] = useState('');
  const [editEndSerial, setEditEndSerial] = useState('');
  const [editTransferDate, setEditTransferDate] = useState('');

  // Request form states
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [fromPlant, setFromPlant] = useState('');
  const [toPlant, setToPlant] = useState('');
  const [modelCode, setModelCode] = useState('');
  const [startSerialNo, setStartSerialNo] = useState('');
  const [endSerialNo, setEndSerialNo] = useState('');
  const [reason, setReason] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [uniqueCode, setUniqueCode] = useState('');

  // Approve remarks state
  const [actionRemarks, setActionRemarks] = useState('');

  // Range suggestions states
  const [suggestedRanges, setSuggestedRanges] = useState<Array<{
    startSuffix: string;
    endSuffix: string;
    startSerial: string;
    endSerial: string;
    quantity: number;
  }>>([]);
  const [loadingRanges, setLoadingRanges] = useState(false);

  const canApprove = userRole === 'Super Admin' || userRole === 'QA';

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (fromPlant && modelCode) {
      fetchSuggestions();
    } else {
      setSuggestedRanges([]);
    }
  }, [fromPlant, modelCode, customerName]);

  const fetchSuggestions = async () => {
    setLoadingRanges(true);
    try {
      const data = await api.transfers.suggestRanges(fromPlant, modelCode, customerName);
      setSuggestedRanges(data);
    } catch (err) {
      console.error('Failed to load range suggestions:', err);
    } finally {
      setLoadingRanges(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [list, plantList, modelList, customerList] = await Promise.all([
        api.transfers.list(),
        api.plants.list(),
        api.models.list(),
        api.customers.list()
      ]);
      setTransfers(list);
      setPlants(plantList);
      setModels(modelList.filter(m => m.status === 'Active'));
      setCustomers(customerList);

      if (plantList.length > 1) {
        setFromPlant(plantList[0].name);
        setToPlant(plantList[1].name);
      }
      if (modelList.length > 0) {
        setModelCode(modelList[0].code);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch transfer ledger');
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromPlant || !toPlant || !modelCode || !startSerialNo || !endSerialNo || !reason) return;
    setError('');
    setSuccess('');

    if (customerName) {
      const selectedCustomer = customers.find(c => c.name === customerName);
      if (selectedCustomer && selectedCustomer.uniqueCodeLength) {
        const activePrefix = uniqueCode || modelCode;
        if (!activePrefix || activePrefix.length !== selectedCustomer.uniqueCodeLength) {
          setError(`Unique Code / Model Code prefix must be exactly ${selectedCustomer.uniqueCodeLength} characters for customer ${customerName}.`);
          return;
        }
      }
    }

    try {
      await api.transfers.create({
        fromPlant,
        toPlant,
        modelCode,
        startSerial: startSerialNo,
        endSerial: endSerialNo,
        reason,
        customerName,
        uniqueCode
      });
      setSuccess('Inter-plant transfer completed successfully. Battery inventory relocated.');
      setShowRequestForm(false);
      setReason('');
      setStartSerialNo('');
      setEndSerialNo('');
      setCustomerName('');
      setUniqueCode('');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Transfer request failed');
    }
  };

  const handleApprove = async (id: string) => {
    setError('');
    setSuccess('');
    try {
      await api.transfers.approve(id, actionRemarks || 'Approved');
      setSuccess('Transfer request approved. Battery inventory transferred.');
      setActionRemarks('');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Approval failed');
    }
  };

  const handleReject = async (id: string) => {
    setError('');
    setSuccess('');
    try {
      await api.transfers.reject(id, actionRemarks || 'Rejected');
      setSuccess('Transfer request rejected.');
      setActionRemarks('');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Rejection failed');
    }
  };

  const startEdit = (t: SerialTransfer) => {
    setEditingTransfer(t);
    setEditReason(t.reason);
    setEditFromPlant(t.fromPlant);
    setEditToPlant(t.toPlant);
    setEditModelCode(t.modelCode);
    setEditStartSerial(t.startSerial);
    setEditEndSerial(t.endSerial);
    setEditTransferDate(t.transferDate || '');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransfer) return;
    setError('');
    setSuccess('');
    try {
      await api.transfers.update(editingTransfer.id, {
        reason: editReason,
        fromPlant: editFromPlant,
        toPlant: editToPlant,
        modelCode: editModelCode,
        startSerial: editStartSerial,
        endSerial: editEndSerial,
        transferDate: editTransferDate
      });
      setSuccess('Transfer entry successfully updated!');
      setEditingTransfer(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update transfer');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this inter-plant transfer? This will revert the battery serial numbers back to their previous plant.')) return;
    setError('');
    setSuccess('');
    try {
      await api.transfers.delete(id);
      setSuccess('Inter-plant transfer successfully deleted & battery locations reverted.');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete transfer');
    }
  };

  const selectedCustomer = customers.find(c => c.name === customerName);
  const currentDigits = selectedCustomer?.numericDigitsOfSerial || 6;
  const previewStart = startSerialNo ? `${uniqueCode ? uniqueCode : `${modelCode}`}${startSerialNo.padStart(currentDigits, '0')}` : '—';
  const previewEnd = endSerialNo ? `${uniqueCode ? uniqueCode : `${modelCode}`}${endSerialNo.padStart(currentDigits, '0')}` : '—';

  const startNum = parseInt(startSerialNo, 10);
  const endNum = parseInt(endSerialNo, 10);
  const qtyToTransfer = !isNaN(startNum) && !isNaN(endNum) && endNum >= startNum ? endNum - startNum + 1 : 0;

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Inter-Plant Logistics Transfer</h2>
          <p className="text-xs text-gray-500">Transfer serialized batteries instantly between production plants without requiring approval steps.</p>
        </div>
        {!showRequestForm && (
          <button
            onClick={() => setShowRequestForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow transition"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Transfer Inventory</span>
          </button>
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

      {/* Request Form */}
      {showRequestForm && (
        <form onSubmit={handleRequest} className="p-5 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Execute Inter-Plant Transfer Range</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Source Plant (From)</label>
              <select
                value={fromPlant}
                onChange={e => setFromPlant(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-gray-900 dark:text-white focus:outline-none"
              >
                {plants.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Destination Plant (To)</label>
              <select
                value={toPlant}
                onChange={e => setToPlant(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-gray-900 dark:text-white focus:outline-none"
              >
                {plants.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Model Prefix</label>
              <select
                value={modelCode}
                onChange={e => setModelCode(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-gray-900 dark:text-white focus:outline-none"
              >
                {models.map(m => (
                  <option key={m.id} value={m.code}>{m.code} - {m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Customer Name (Optional)</label>
              <select
                value={customerName}
                onChange={e => {
                  setCustomerName(e.target.value);
                }}
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-gray-900 dark:text-white focus:outline-none"
              >
                <option value="">-- No Customer --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Unique Code</label>
              <input
                type="text"
                value={uniqueCode}
                onChange={e => setUniqueCode(e.target.value)}
                placeholder="Optional unique code"
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-gray-900 dark:text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Start Serial running number</label>
              <input
                type="text"
                required
                value={startSerialNo}
                onChange={e => setStartSerialNo(e.target.value)}
                placeholder="As per Customer Suffix Len"
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-gray-900 dark:text-white font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">End Serial running number</label>
              <input
                type="text"
                required
                value={endSerialNo}
                onChange={e => setEndSerialNo(e.target.value)}
                placeholder="As per Customer Suffix Len"
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-gray-900 dark:text-white font-mono focus:outline-none"
              />
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Reason for Transfer</label>
              <input
                type="text"
                required
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Urgent stock requirement for export dispatch..."
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-gray-900 dark:text-white focus:outline-none"
              />
            </div>
            <div className="md:col-span-2 lg:col-span-3 bg-gray-50 dark:bg-slate-950 p-4 rounded-xl border border-gray-200 dark:border-slate-800">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Live Serial Range Preview</span>
                <span className="text-[10px] bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-400 px-2 py-0.5 rounded uppercase tracking-wider font-bold">Auto-Generated</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono mb-3">
                <div>
                  <span className="text-gray-400">Start Serial:</span> <span className="font-bold text-cyan-600 dark:text-cyan-400">{previewStart}</span>
                </div>
                <div>
                  <span className="text-gray-400">Last Serial:</span> <span className="font-bold text-cyan-600 dark:text-cyan-400">{previewEnd}</span>
                </div>
                <div>
                  <span className="text-gray-400">Quantity:</span> <span className="font-bold text-cyan-600 dark:text-cyan-400">{qtyToTransfer > 0 ? qtyToTransfer : '—'}</span>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 leading-normal">
                Pattern breakdown: {uniqueCode ? (
                  <>
                    <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded border border-gray-150 text-gray-600 font-bold">[Unique Code: {uniqueCode}]</code> + <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded border border-gray-150 text-gray-600 font-bold">[Running Number padded to {currentDigits} digits]</code>
                  </>
                ) : (
                  <>
                    <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded border border-gray-150 text-gray-600 font-bold">[Model: {modelCode}]</code> + <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded border border-gray-150 text-gray-600 font-bold">[Running Number padded to {currentDigits} digits]</code>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Suggest Range section */}
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/80 rounded-xl p-4.5 space-y-3">
            <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Available Serial Number Ranges at {fromPlant || 'Selected Plant'}</span>
            </h4>
            
            {loadingRanges ? (
              <div className="text-xs text-gray-400 py-2">Calculating available stock ranges...</div>
            ) : suggestedRanges.length === 0 ? (
              <p className="text-xs text-gray-500 italic py-1">
                No available/allotted serial numbers found for model '{modelCode || 'this model'}' at the selected source plant. Make sure batteries are produced and in inventory.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] text-gray-500">
                  The system detected the following contiguous blocks of in-stock, transferable units. Click <span className="font-semibold text-cyan-600 dark:text-cyan-400">"Auto-Fill Range"</span> to automatically populate the input fields:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                  {suggestedRanges.map((rng, i) => (
                    <div 
                      key={i} 
                      className="border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-3 flex flex-col justify-between hover:border-cyan-500 transition shadow-sm"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-1.5">
                          <span className="text-[10px] font-bold bg-cyan-50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-400 px-1.5 py-0.5 rounded">
                            Qty: {rng.quantity} units
                          </span>
                          <span className="text-[9px] font-mono font-medium text-gray-400">
                            Block #{i+1}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-600 dark:text-gray-300 font-mono space-y-0.5">
                          <div><span className="text-[10px] text-gray-400">Start:</span> {rng.startSerial}</div>
                          <div><span className="text-[10px] text-gray-400">End:</span> {rng.endSerial}</div>
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setStartSerialNo(rng.startSuffix);
                          setEndSerialNo(rng.endSuffix);
                        }}
                        className="mt-3 w-full py-1.5 bg-cyan-50 hover:bg-cyan-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-cyan-700 dark:text-cyan-300 text-[11px] font-bold rounded-lg transition"
                      >
                        Auto-Fill Range
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setShowRequestForm(false)}
              className="px-3 py-1.5 border border-gray-200 dark:border-slate-800 text-gray-600 dark:text-gray-400 rounded-lg text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-cyan-600 text-white rounded-lg text-xs font-semibold hover:bg-cyan-500"
            >
              Transfer Inventory
            </button>
          </div>
        </form>
      )}

      {/* Transfer ledger lists */}
      <div className="space-y-6">
        {/* Pending approvals section */}
        {transfers.some(t => t.status === 'Pending') && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Awaiting Corporate Approval (Legacy)
            </h3>

            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm divide-y divide-gray-100 dark:divide-gray-800">
              {transfers.filter(t => t.status === 'Pending').map(t => (
                <div key={t.id} className="p-5 space-y-4 md:space-y-0 md:flex md:items-center md:justify-between gap-6 text-xs">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-cyan-600 dark:text-cyan-400">{t.modelCode}</span>
                      <span className="text-gray-400">•</span>
                      <span className="font-medium">{t.fromPlant} ➜ {t.toPlant}</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/20 text-amber-600 text-[10px] font-bold">
                        Pending Approval
                      </span>
                      {perms.edit && (
                        <button
                          onClick={() => startEdit(t)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 text-cyan-600 rounded"
                          title="Edit Pending Transfer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="font-mono text-gray-500 space-y-0.5">
                      <p>Start Serial: {t.startSerial}</p>
                      <p>End Serial: {t.endSerial}</p>
                      <p>Total Qty: <strong className="text-indigo-600 dark:text-indigo-400">{t.quantity} Units</strong></p>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                      <span>Reason: "{t.reason}"</span>
                    </p>
                  </div>

                  {canApprove ? (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-sm shrink-0">
                      <input
                        type="text"
                        placeholder="Resolution comments..."
                        value={actionRemarks}
                        onChange={e => setActionRemarks(e.target.value)}
                        className="bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-gray-900 dark:text-white"
                      />
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleApprove(t.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 shrink-0"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleReject(t.id)}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-right text-[10px] text-gray-400 font-medium">
                      Requires Super Admin / QA clearance
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History ledger section */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            Completed Inter-Plant Transfers
          </h3>

          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-950 border-b border-gray-100 dark:border-slate-800 text-xs font-bold text-gray-700 dark:text-gray-300">
                    <th className="px-6 py-4">Transfer Date</th>
                    <th className="px-6 py-4">Model</th>
                    <th className="px-6 py-4">Origin Plant</th>
                    <th className="px-6 py-4">Target Plant</th>
                    <th className="px-6 py-4 font-mono">Start Serial</th>
                    <th className="px-6 py-4 font-mono">End Serial</th>
                    <th className="px-6 py-4 font-mono text-center">Qty</th>
                    <th className="px-6 py-4">Resolution Status</th>
                    <th className="px-6 py-4">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-800 dark:text-gray-300">
                  {transfers.filter(t => t.status !== 'Pending').map(t => (
                    <tr key={t.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-4 font-medium">{new Date(t.transferDate).toLocaleDateString()}</td>
                      <td className="px-6 py-4 font-bold font-mono text-cyan-600 dark:text-cyan-400">{t.modelCode}</td>
                      <td className="px-6 py-4">{t.fromPlant}</td>
                      <td className="px-6 py-4">{t.toPlant}</td>
                      <td className="px-6 py-4 font-mono text-gray-500">{t.startSerial}</td>
                      <td className="px-6 py-4 font-mono text-gray-500">{t.endSerial}</td>
                      <td className="px-6 py-4 font-mono text-center font-extrabold text-indigo-600 dark:text-indigo-400">{t.quantity}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${t.status === 'Approved' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400'}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 truncate max-w-xs" title={t.remarks}>
                        {t.remarks || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Transfer Modal */}
      {editingTransfer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-scale-up space-y-4 text-left max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingTransfer(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
            
            <h3 className="text-sm font-bold text-gray-950 dark:text-white uppercase tracking-wider">Edit Transfer Log</h3>
            
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Source Plant</label>
                  <select
                    required
                    value={editFromPlant}
                    onChange={e => setEditFromPlant(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-955 dark:text-white focus:outline-none"
                  >
                    {plants.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Destination Plant</label>
                  <select
                    required
                    value={editToPlant}
                    onChange={e => setEditToPlant(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-955 dark:text-white focus:outline-none"
                  >
                    {plants.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Battery Model</label>
                  <select
                    required
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
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Transfer Date</label>
                  <input
                    type="date"
                    required
                    value={editTransferDate}
                    onChange={e => setEditTransferDate(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-955 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Start Serial Number</label>
                  <input
                    type="text"
                    required
                    value={editStartSerial}
                    onChange={e => setEditStartSerial(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-gray-955 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">End Serial Number</label>
                  <input
                    type="text"
                    required
                    value={editEndSerial}
                    onChange={e => setEditEndSerial(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-gray-955 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Reason for Transfer</label>
                <textarea
                  required
                  value={editReason}
                  onChange={e => setEditReason(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-955 dark:text-white focus:outline-none min-h-[60px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTransfer(null)}
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
