import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { ProductionEntry, BatteryModel, SerialNumber } from '../types';
import { ClipboardCheck, Calendar, Clock, Zap, CheckCircle2, Package, MapPin, User, AlertTriangle, Edit2, Trash2, X } from 'lucide-react';
import { getPermissions } from '../lib/permissions';

export default function ProductionModule({ currentUser }: { currentUser: any }) {
  const perms = getPermissions(currentUser, 'packingEntry');
  const [production, setProduction] = useState<ProductionEntry[]>([]);
  const [models, setModels] = useState<BatteryModel[]>([]);
  const [allSerials, setAllSerials] = useState<SerialNumber[]>([]);
  const [allottedSerials, setAllottedSerials] = useState<SerialNumber[]>([]);
  const [plants, setPlants] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [shift, setShift] = useState('Shift A');
  const [modelCode, setModelCode] = useState('');
  const [plantName, setPlantName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [startSerial, setStartSerial] = useState('');
  const [lastSerial, setLastSerial] = useState('');

  // Edit states
  const [editingGroup, setEditingGroup] = useState<any | null>(null);
  const [editShift, setEditShift] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editPlantName, setEditPlantName] = useState('');
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editModelCode, setEditModelCode] = useState('');
  const [editStartSerial, setEditStartSerial] = useState('');
  const [editLastSerial, setEditLastSerial] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodList, modelList, serialList, plantList, customerList] = await Promise.all([
        api.production.list(),
        api.models.list(),
        api.search.query({}), // Query all serials initially
        api.plants.list(),
        api.customers.list()
      ]);

      setProduction(prodList);
      setModels(modelList.filter(m => m.status === 'Active'));
      setAllSerials(serialList);
      setPlants(plantList);
      setCustomers(customerList);

      // Filter serials that are available
      const available = serialList.filter((s: SerialNumber) =>
        s.status === 'Allotted' &&
        (s.inventoryStatus || 'Available') === 'Available' &&
        (s.packingStatus || 'Not Packed') === 'Not Packed' &&
        s.pdiStatus !== 'Hold'
      );
      setAllottedSerials(available);

      // Setup default form selections
      const userStr = localStorage.getItem('erp_user');
      const user = userStr ? JSON.parse(userStr) : null;
      
      const defaultPlant = user?.plant && user.plant !== 'All' ? user.plant : (plantList[0]?.name || 'Plant Alpha');
      setPlantName(defaultPlant);

      if (customerList.length > 0) {
        setCustomerName(customerList[0].name);
      }

      if (modelList.length > 0) {
        const activeMod = modelList.find(m => m.status === 'Active') || modelList[0];
        setModelCode(activeMod.code);
        
        // Auto-select serial range for this model and plant
        const matchedSerials = available
          .filter((s: SerialNumber) => s.modelCode === activeMod.code && (defaultPlant === 'All' || s.currentPlant === defaultPlant))
          .sort((a, b) => a.serialNumber.localeCompare(b.serialNumber));
        
        if (matchedSerials.length > 0) {
          setStartSerial(matchedSerials[0].serialNumber);
          setLastSerial(matchedSerials[0].serialNumber);
        } else {
          setStartSerial('');
          setLastSerial('');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sync packing line data');
    } finally {
      setLoading(false);
    }
  };

  const handleProductionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startSerial || !lastSerial) {
      setError('Please select valid Start and Last Serial numbers.');
      return;
    }
    if (hasDuplicate) {
      setError('Cannot submit. Some serial numbers in this range are already registered or duplicate.');
      return;
    }
    setError('');
    setSuccess('');

    try {
      const resp = await api.production.create({
        date,
        shift,
        modelCode,
        plantName,
        customerName,
        startSerial,
        lastSerial,
        status: 'Success'
      });
      setSuccess(resp.message || `Packing registered successfully! Consumed ${selectedRange.length} batteries.`);
      
      // Clear range selections or refresh
      setStartSerial('');
      setLastSerial('');
      
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Packing line consumption registration failed');
    }
  };

  const startEdit = (group: any) => {
    setEditingGroup(group);
    setEditShift(group.shift);
    setEditDate(group.date);
    setEditPlantName(group.plant || '');
    setEditModelCode(group.modelCode || '');
    setEditStartSerial(group.startSerial || '');
    setEditLastSerial(group.endSerial || '');
    setEditCustomerName(group.customerName || '');
  };

  const getEditFilteredAvailable = () => {
    if (!editingGroup) return [];
    return allSerials
      .filter(s => {
        if (s.modelCode !== editModelCode) return false;
        if (editPlantName !== 'All' && s.currentPlant !== editPlantName) return false;
        const isCurrentInGroup = editingGroup.entries.some((e: any) => e.serialNumber === s.serialNumber);
        return s.status === 'Allotted' || isCurrentInGroup;
      })
      .sort((a, b) => a.serialNumber.localeCompare(b.serialNumber));
  };

  const getEditSelectedRangeSerials = () => {
    if (!editStartSerial || !editLastSerial) return [];
    const modelSerials = allSerials
      .filter(s => s.modelCode === editModelCode && (editPlantName === 'All' || s.currentPlant === editPlantName))
      .sort((a, b) => a.serialNumber.localeCompare(b.serialNumber));
    const startIdx = modelSerials.findIndex(s => s.serialNumber === editStartSerial);
    const lastIdx = modelSerials.findIndex(s => s.serialNumber === editLastSerial);
    if (startIdx === -1 || lastIdx === -1 || startIdx > lastIdx) return [];
    return modelSerials.slice(startIdx, lastIdx + 1);
  };

  const handleEditModelChange = (mCode: string) => {
    setEditModelCode(mCode);
    updateEditSerialRanges(mCode, editPlantName);
  };

  const handleEditPlantChange = (pName: string) => {
    setEditPlantName(pName);
    updateEditSerialRanges(editModelCode, pName);
  };

  const updateEditSerialRanges = (mCode: string, pName: string) => {
    if (editingGroup && mCode === editingGroup.modelCode && pName === editingGroup.plant) {
      setEditStartSerial(editingGroup.startSerial);
      setEditLastSerial(editingGroup.endSerial);
      return;
    }
    const matchedSerials = allSerials
      .filter((s: SerialNumber) => s.modelCode === mCode && (pName === 'All' || s.currentPlant === pName) && s.status === 'Allotted')
      .sort((a, b) => a.serialNumber.localeCompare(b.serialNumber));
    if (matchedSerials.length > 0) {
      setEditStartSerial(matchedSerials[0].serialNumber);
      setEditLastSerial(matchedSerials[0].serialNumber);
    } else {
      setEditStartSerial('');
      setEditLastSerial('');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup) return;
    setError('');
    setSuccess('');

    const isModelOrRangeChanged = 
      editModelCode !== editingGroup.modelCode ||
      editStartSerial !== editingGroup.startSerial ||
      editLastSerial !== editingGroup.endSerial;

    try {
      if (!isModelOrRangeChanged) {
        // Just update non-identifying fields on existing entries
        await Promise.all(
          editingGroup.entries.map((entry: ProductionEntry) =>
            api.production.update(entry.id, {
              shift: editShift,
              date: editDate,
              plant: editPlantName,
              customerName: editCustomerName,
              modelCode: editModelCode,
              serialNumber: entry.serialNumber
            })
          )
        );
      } else {
        // Model or range changed! Validate the new range
        const editSelectedRange = getEditSelectedRangeSerials();
        if (editSelectedRange.length === 0) {
          setError('Please select a valid serial range.');
          return;
        }

        const editDuplicateSerials = editSelectedRange.filter(sn => {
          if (sn.status === 'Allotted') return false;
          const isCurrentInGroup = editingGroup.entries.some((e: any) => e.serialNumber === sn.serialNumber);
          return !isCurrentInGroup;
        });

        if (editDuplicateSerials.length > 0) {
          setError(`Selected range contains serial numbers already packed/consumed by other entries (e.g. ${editDuplicateSerials[0].serialNumber}).`);
          return;
        }

        // 1. Delete old entries to release their serial numbers to 'Allotted' status
        await Promise.all(
          editingGroup.entries.map((entry: ProductionEntry) =>
            api.production.delete(entry.id)
          )
        );

        // 2. Create the brand new packing range
        await api.production.create({
          date: editDate,
          shift: editShift,
          modelCode: editModelCode,
          plantName: editPlantName,
          customerName: editCustomerName,
          startSerial: editStartSerial,
          lastSerial: editLastSerial,
          status: 'Success'
        });
      }

      setSuccess('Packing entries successfully updated!');
      setEditingGroup(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update packing entry');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this packing entry? This will release the battery serial number.')) return;
    setError('');
    setSuccess('');
    try {
      await api.production.delete(id);
      setSuccess('Packing entry successfully deleted!');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete packing entry');
    }
  };

  const handleModelChange = (mCode: string) => {
    setModelCode(mCode);
    updateSerialRanges(mCode, plantName);
  };

  const handlePlantChange = (pName: string) => {
    setPlantName(pName);
    updateSerialRanges(modelCode, pName);
  };

  const updateSerialRanges = (mCode: string, pName: string) => {
    const matchedSerials = allottedSerials
      .filter((s: SerialNumber) => s.modelCode === mCode && (pName === 'All' || s.currentPlant === pName))
      .sort((a, b) => a.serialNumber.localeCompare(b.serialNumber));

    if (matchedSerials.length > 0) {
      setStartSerial(matchedSerials[0].serialNumber);
      setLastSerial(matchedSerials[0].serialNumber);
    } else {
      setStartSerial('');
      setLastSerial('');
    }
  };

  // Get matching serials for range selection dropdown
  const filteredAvailable = allottedSerials
    .filter(s => s.modelCode === modelCode && (plantName === 'All' || s.currentPlant === plantName))
    .sort((a, b) => a.serialNumber.localeCompare(b.serialNumber));

  // Find all serials in the selected range (even if already consumed) to check for duplicates
  const getSelectedRangeSerials = () => {
    if (!startSerial || !lastSerial) return [];
    
    const modelSerials = allSerials
      .filter(s => s.modelCode === modelCode && (plantName === 'All' || s.currentPlant === plantName))
      .sort((a, b) => a.serialNumber.localeCompare(b.serialNumber));
      
    const startIdx = modelSerials.findIndex(s => s.serialNumber === startSerial);
    const lastIdx = modelSerials.findIndex(s => s.serialNumber === lastSerial);
    
    if (startIdx === -1 || lastIdx === -1 || startIdx > lastIdx) return [];
    return modelSerials.slice(startIdx, lastIdx + 1);
  };

  const selectedRange = getSelectedRangeSerials();
  const duplicateSerials = selectedRange.filter(sn => sn.status !== 'Allotted');
  const hasDuplicate = duplicateSerials.length > 0;

  const groupedProduction = (() => {
    const groups: { [key: string]: ProductionEntry[] } = {};
    production.forEach(entry => {
      // Group by createdAt, fall back to compound key
      const key = entry.createdAt || `${entry.date}_${entry.shift}_${entry.plant}_${entry.modelCode}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(entry);
    });

    const result = Object.keys(groups).map(key => {
      const groupEntries = groups[key];
      // Sort within group by serial number so we get correct start and end
      const sortedGroup = [...groupEntries].sort((a, b) => a.serialNumber.localeCompare(b.serialNumber));
      const first = sortedGroup[0];
      const last = sortedGroup[sortedGroup.length - 1];

      const foundSerial = allSerials.find(s => s.serialNumber === first.serialNumber);
      const customerName = foundSerial?.customerName || '';

      return {
        id: key,
        date: first.date,
        shift: first.shift,
        plant: first.plant,
        modelCode: first.modelCode,
        customerName,
        startSerial: first.serialNumber,
        endSerial: last.serialNumber,
        packedQty: groupEntries.length,
        entries: sortedGroup
      };
    });

    // Sort grouped list primarily by Date (descending), then Shift (descending), then id (descending)
    return result.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      const shiftCompare = b.shift.localeCompare(a.shift);
      if (shiftCompare !== 0) return shiftCompare;
      return b.id.localeCompare(a.id);
    });
  })();

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Shop Floor Packing Terminal</h2>
          <p className="text-xs text-gray-500">Record finished battery packing, specify customers, and consume allotted ranges.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 text-xs rounded-xl font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Entry Panel */}
        <div className="lg:col-span-1 space-y-6">
          <form onSubmit={handleProductionSubmit} className="p-6 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-slate-800">
              <Package className="w-4.5 h-4.5 text-cyan-500" />
              Register Packing Line Consumption
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Plant Name</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <select
                    required
                    value={plantName}
                    onChange={e => handlePlantChange(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="">— Select Plant —</option>
                    {plants.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Customer Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <select
                    required
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="">— Select Customer —</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Packing Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-xs text-gray-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Active Shift</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <select
                    value={shift}
                    onChange={e => setShift(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-xs text-gray-900 dark:text-white focus:outline-none"
                  >
                    <option value="Shift A">Shift A (06:00 AM – 02:00 PM)</option>
                    <option value="Shift B">Shift B (02:00 PM – 10:00 PM)</option>
                    <option value="Shift C">Shift C (10:00 PM – 06:00 AM)</option>
                    <option value="Day">Day (08:00 to 20:00)</option>
                    <option value="Night">Night (20:00 to 08:00)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Battery Model</label>
                <select
                  value={modelCode}
                  onChange={e => handleModelChange(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="">— Select Model —</option>
                  {models.map(m => (
                    <option key={m.id} value={m.code}>{m.code} - {m.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Start Serial</label>
                  <select
                    value={startSerial}
                    onChange={e => setStartSerial(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="">— Select —</option>
                    {filteredAvailable.map(s => (
                      <option key={s.serialNumber} value={s.serialNumber}>{s.serialNumber}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Last Serial</label>
                  <select
                    value={lastSerial}
                    onChange={e => setLastSerial(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="">— Select —</option>
                    {filteredAvailable.map(s => (
                      <option key={s.serialNumber} value={s.serialNumber}>{s.serialNumber}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Range and Duplicate validation block */}
            {startSerial && lastSerial && (
              <div className={`p-4 rounded-xl border ${hasDuplicate ? 'bg-rose-50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/40' : 'bg-cyan-50 border-cyan-100 dark:bg-slate-950 dark:border-slate-800'} space-y-2`}>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-gray-500">Selected Quantity:</span>
                  <span className={`font-bold px-2 py-0.5 rounded-full ${hasDuplicate ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400' : 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-400'}`}>
                    {selectedRange.length} units
                  </span>
                </div>
                
                <div className="text-[11px] font-mono text-gray-600 dark:text-gray-400">
                  Range: <span className="font-bold text-gray-900 dark:text-white">{startSerial}</span> to <span className="font-bold text-gray-900 dark:text-white">{lastSerial}</span>
                </div>

                {hasDuplicate && (
                  <div className="flex items-start gap-1.5 text-rose-600 dark:text-rose-400 text-xs font-medium pt-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      Duplicate numbers detected! {duplicateSerials.length} serials in this range are already packed/consumed: {duplicateSerials.slice(0,3).map(d => d.runningNumber).join(', ')}{duplicateSerials.length > 3 ? '...' : ''}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={!startSerial || !lastSerial || hasDuplicate}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs shadow transition disabled:opacity-40"
              >
                Log Packing Consumption
              </button>
            </div>
          </form>
        </div>

        {/* Live Terminal Output Feed */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm p-5 flex flex-col h-[500px]">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-50 dark:border-slate-800">
            <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              Live Packing Feed (Date & Shift Wise)
            </h4>
            <span className="text-[10px] font-mono bg-cyan-50 dark:bg-cyan-950/20 text-cyan-700 dark:text-cyan-400 px-2 py-0.5 rounded font-bold">
              Line Active
            </span>
          </div>

          <div className="flex-1 overflow-auto">
            {groupedProduction.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-xs text-gray-400">
                <span>No packing logs recorded yet</span>
              </div>
            ) : (
              <table className="w-full text-left text-xs text-gray-500 dark:text-gray-400 border-collapse">
                <thead className="text-[10px] uppercase text-gray-400 bg-gray-50 dark:bg-slate-950 border-b border-gray-100 dark:border-slate-800 sticky top-0 z-10">
                  <tr>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Shift</th>
                    <th className="py-2 px-3">Start Serial Number</th>
                    <th className="py-2 px-3">End Serial Number</th>
                    <th className="py-2 px-3">Packed Qty</th>
                    <th className="py-2 px-3">Plant</th>
                    <th className="py-2 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-850">
                  {groupedProduction.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-950/50 transition-colors">
                      <td className="py-2.5 px-3 whitespace-nowrap font-medium text-gray-700 dark:text-gray-300">
                        {p.date}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-350">
                          {p.shift}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-bold font-mono text-cyan-600 dark:text-cyan-400">
                        {p.startSerial}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-bold font-mono text-cyan-600 dark:text-cyan-400">
                        {p.endSerial}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-[10px] rounded font-semibold uppercase">
                          {p.packedQty} Units
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-gray-600 dark:text-gray-400">
                        {p.plant}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-right">
                        {perms.edit && (
                          <button
                            onClick={() => startEdit(p)}
                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-850 text-cyan-600 dark:text-cyan-400 rounded inline-flex items-center justify-center"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Edit Production Modal */}
      {editingGroup && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-scale-up space-y-4 text-left max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingGroup(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
            
            <h3 className="text-sm font-bold text-gray-950 dark:text-white uppercase tracking-wider">Edit Packing Range Log</h3>
            
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Plant Name</label>
                  <select
                    required
                    value={editPlantName}
                    onChange={e => handleEditPlantChange(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-955 dark:text-white focus:outline-none"
                  >
                    {plants.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Customer Name</label>
                  <select
                    required
                    value={editCustomerName}
                    onChange={e => setEditCustomerName(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-955 dark:text-white focus:outline-none"
                  >
                    {customers.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Packing Date</label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-955 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Active Shift</label>
                  <select
                    value={editShift}
                    onChange={e => setEditShift(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-955 dark:text-white focus:outline-none"
                  >
                    <option value="Shift A">Shift A (06:00 AM – 02:00 PM)</option>
                    <option value="Shift B">Shift B (02:00 PM – 10:00 PM)</option>
                    <option value="Shift C">Shift C (10:00 PM – 06:00 AM)</option>
                    <option value="Day">Day (08:00 to 20:00)</option>
                    <option value="Night">Night (20:00 to 08:00)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Battery Model</label>
                  <select
                    value={editModelCode}
                    onChange={e => handleEditModelChange(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-955 dark:text-white focus:outline-none"
                  >
                    {models.map(m => (
                      <option key={m.id} value={m.code}>{m.code} - {m.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Packed Quantity</label>
                  <input
                    type="text"
                    disabled
                    value={`${getEditSelectedRangeSerials().length} Units`}
                    className="w-full bg-gray-100 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-500 dark:text-gray-400 cursor-not-allowed focus:outline-none font-semibold font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Start Serial Number</label>
                  <select
                    value={editStartSerial}
                    onChange={e => setEditStartSerial(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-gray-955 dark:text-white focus:outline-none"
                  >
                    <option value="">— Select —</option>
                    {getEditFilteredAvailable().map(s => (
                      <option key={s.serialNumber} value={s.serialNumber}>{s.serialNumber}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">End Serial Number</label>
                  <select
                    value={editLastSerial}
                    onChange={e => setEditLastSerial(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-gray-955 dark:text-white focus:outline-none"
                  >
                    <option value="">— Select —</option>
                    {getEditFilteredAvailable().map(s => (
                      <option key={s.serialNumber} value={s.serialNumber}>{s.serialNumber}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingGroup(null)}
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
