import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Customer } from '../types';
import { Plus, MapPin, Building2, Globe, Edit2, Trash2, X } from 'lucide-react';
import { getPermissions } from '../lib/permissions';

export default function CustomerMaster({ currentUser }: { currentUser: any }) {
  const perms = getPermissions(currentUser, 'customerMaster');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [gst, setGst] = useState('');
  const [state, setState] = useState('Maharashtra');
  const [totalDigitsOfSerial, setTotalDigitsOfSerial] = useState('');
  const [numericDigitsOfSerial, setNumericDigitsOfSerial] = useState('');
  const [uniqueCodeLength, setUniqueCodeLength] = useState('');

  // Edit form states
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editGst, setEditGst] = useState('');
  const [editState, setEditState] = useState('');
  const [editTotalDigitsOfSerial, setEditTotalDigitsOfSerial] = useState('');
  const [editNumericDigitsOfSerial, setEditNumericDigitsOfSerial] = useState('');
  const [editUniqueCodeLength, setEditUniqueCodeLength] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await api.customers.list();
      setCustomers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code || !gst || !state || !numericDigitsOfSerial) return;
    setError('');
    setSuccess('');
    
    const computedTotal = (parseInt(uniqueCodeLength, 10) || 0) + (parseInt(numericDigitsOfSerial, 10) || 0);

    try {
      await api.customers.create({
        name,
        code,
        address,
        gst,
        state,
        totalDigitsOfSerial: computedTotal,
        numericDigitsOfSerial: numericDigitsOfSerial ? parseInt(numericDigitsOfSerial, 10) : undefined,
        uniqueCodeLength: uniqueCodeLength ? parseInt(uniqueCodeLength, 10) : undefined
      });
      setSuccess('Customer record successfully registered!');
      setName('');
      setCode('');
      setAddress('');
      setGst('');
      setTotalDigitsOfSerial('');
      setNumericDigitsOfSerial('');
      setUniqueCodeLength('');
      setShowAddForm(false);
      loadCustomers();
    } catch (err: any) {
      setError(err.message || 'Failed to register customer');
    }
  };

  const startEdit = (cust: Customer) => {
    setEditingCustomer(cust);
    setEditName(cust.name);
    setEditCode(cust.code);
    setEditAddress(cust.address || '');
    setEditGst(cust.gst);
    setEditState(cust.state);
    setEditTotalDigitsOfSerial(cust.totalDigitsOfSerial ? String(cust.totalDigitsOfSerial) : '');
    setEditNumericDigitsOfSerial(cust.numericDigitsOfSerial ? String(cust.numericDigitsOfSerial) : '');
    setEditUniqueCodeLength(cust.uniqueCodeLength ? String(cust.uniqueCodeLength) : '');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer || !editName || !editCode || !editGst || !editState || !editNumericDigitsOfSerial) return;
    setError('');
    setSuccess('');

    const computedTotal = (parseInt(editUniqueCodeLength, 10) || 0) + (parseInt(editNumericDigitsOfSerial, 10) || 0);

    try {
      await api.customers.update(editingCustomer.id, {
        name: editName,
        code: editCode,
        address: editAddress,
        gst: editGst,
        state: editState,
        totalDigitsOfSerial: computedTotal,
        numericDigitsOfSerial: editNumericDigitsOfSerial ? parseInt(editNumericDigitsOfSerial, 10) : undefined,
        uniqueCodeLength: editUniqueCodeLength ? parseInt(editUniqueCodeLength, 10) : undefined
      });
      setSuccess('Customer record successfully updated!');
      setEditingCustomer(null);
      loadCustomers();
    } catch (err: any) {
      setError(err.message || 'Failed to update customer');
    }
  };

  const handleDelete = async (id: string) => {
    setError('');
    setSuccess('');

    try {
      await api.customers.delete(id);
      setSuccess('Customer record successfully deleted!');
      setConfirmDeleteId(null);
      loadCustomers();
    } catch (err: any) {
      setError(err.message || 'Failed to delete customer');
    }
  };

  const statesList = [
    'Andhra Pradesh',
    'Arunachal Pradesh',
    'Assam',
    'Bihar',
    'Chhattisgarh',
    'Goa',
    'Gujarat',
    'Haryana',
    'Himachal Pradesh',
    'Jammu and Kashmir',
    'Jharkhand',
    'Karnataka',
    'Kerala',
    'Ladakh',
    'Madhya Pradesh',
    'Maharashtra',
    'Manipur',
    'Meghalaya',
    'Mizoram',
    'Nagaland',
    'Odisha',
    'Punjab',
    'Rajasthan',
    'Sikkim',
    'Tamil Nadu',
    'Telangana',
    'Tripura',
    'Uttar Pradesh',
    'Uttarakhand',
    'West Bengal',
    'Andaman and Nicobar Islands',
    'Chandigarh',
    'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi',
    'Lakshadweep',
    'Puducherry'
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1200px] mx-auto animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Customer Directory Master</h2>
          <p className="text-xs text-gray-500">Manage registered dealers, distributors, and direct clients with GST profiles.</p>
        </div>
        {!showAddForm && perms.add && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
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

      {/* Add Form */}
      {showAddForm && (
        <form onSubmit={handleAdd} className="p-5 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Register Corporate Customer / Dealer</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Customer Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Mahindra Electric"
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Unique Client Code</label>
              <input
                type="text"
                required
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="e.g. CUST-MAHI"
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white uppercase focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">GST Registration No.</label>
              <input
                type="text"
                required
                value={gst}
                onChange={e => setGst(e.target.value)}
                placeholder="e.g. 27AAAAA1111A1Z1"
                maxLength={15}
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white uppercase focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Billing & Delivery Address</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Industrial Plot 42, Sector 5..."
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">State</label>
              <select
                value={state}
                onChange={e => setState(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none"
              >
                {statesList.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
                <span>Number of Digits for Unique Code (Prefix)</span>
                <span className="text-[10px] text-gray-400 font-normal">(Optional)</span>
              </label>
              <input type="number" min={1} max={50} value={uniqueCodeLength}
                onChange={e => setUniqueCodeLength(e.target.value)}
                placeholder="e.g. 4"
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
                <span>Numeric Suffix Digits</span>
                <span className="text-[10px] text-gray-400 font-normal">(Mandatory, e.g. 4)</span>
              </label>
              <input required type="number" min={1} max={50} value={numericDigitsOfSerial}
                onChange={e => setNumericDigitsOfSerial(e.target.value)}
                placeholder="e.g. 4"
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
                <span>Total Length of Serial Number</span>
                <span className="text-[10px] text-gray-400 font-normal">(Prefix + Suffix)</span>
              </label>
              <input readOnly type="number" value={(parseInt(uniqueCodeLength, 10) || 0) + (parseInt(numericDigitsOfSerial, 10) || 0) || ''}
                className="w-full bg-gray-100 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none cursor-not-allowed"
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
              className="px-4 py-1.5 bg-cyan-600 text-white rounded-lg text-xs font-semibold hover:bg-cyan-500"
            >
              Register Customer
            </button>
          </div>
        </form>
      )}

      {/* Grid List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-gray-400">Loading customers...</div>
      ) : customers.length === 0 ? (
        <div className="p-12 border border-dashed border-gray-200 dark:border-slate-800 rounded-2xl text-center text-xs text-gray-500">
          No corporate customers registered.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {customers.map(cust => (
            <div key={cust.id} className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 hover:shadow">
              <div className="flex items-start justify-between">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/25 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Building2 className="w-5 h-5" />
                </div>
                <span className="font-mono text-[10px] bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300 font-bold">
                  {cust.code}
                </span>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-sm text-gray-950 dark:text-white leading-tight">{cust.name}</h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{cust.address || 'Address unlisted'}</span>
                </p>
                <div className="flex items-center gap-4 text-[11px] text-gray-400 pt-1.5 border-t border-gray-50 dark:border-slate-800/50">
                  <span className="font-semibold font-mono bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-300 px-1.5 py-0.5 rounded">
                    GST: {cust.gst}
                  </span>
                  <span className="flex items-center gap-1 text-xs">
                    <Globe className="w-3.5 h-3.5 text-gray-400" />
                    {cust.state}
                  </span>
                </div>
                {(cust.totalDigitsOfSerial || cust.numericDigitsOfSerial || cust.uniqueCode) && (
                  <div className="pt-2 border-t border-dashed border-gray-100 dark:border-slate-800/30 flex flex-wrap gap-1.5">
                    {cust.uniqueCode && (
                      <span className="text-[10px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-md">
                        Code: {cust.uniqueCode}
                      </span>
                    )}
                    {cust.totalDigitsOfSerial && (
                      <span className="text-[10px] font-mono font-bold bg-cyan-50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-400 px-2 py-0.5 rounded-md">
                        Total Len: {cust.totalDigitsOfSerial}
                      </span>
                    )}
                    {cust.numericDigitsOfSerial && (
                      <span className="text-[10px] font-mono font-bold bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded-md">
                        Suffix Digits: {cust.numericDigitsOfSerial}
                      </span>
                    )}
                  </div>
                )}
                {(perms.edit || perms.delete) && (
                  <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-slate-800/50">
                    {perms.edit && (
                      <button
                        onClick={() => startEdit(cust)}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 text-cyan-600 rounded-lg transition"
                        title="Edit Customer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {perms.delete && (
                      confirmDeleteId === cust.id ? (
                        <div className="flex items-center gap-1.5 animate-fade-in">
                          <button
                            onClick={() => handleDelete(cust.id)}
                            className="px-2 py-1 bg-red-600 text-white rounded text-[10px] font-bold hover:bg-red-500 cursor-pointer"
                            title="Confirm customer deletion"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-1.5 py-1 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 rounded text-[10px] hover:bg-gray-200 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(cust.id)}
                          className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 rounded-lg transition"
                          title="Delete Customer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>


            </div>
          ))}
        </div>
      )}

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-scale-up space-y-4 text-left">
            <button
              onClick={() => setEditingCustomer(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
            
            <h3 className="text-base font-bold text-gray-950 dark:text-white">Edit Customer Profile</h3>
            
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Customer Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-950 dark:text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Unique Client Code</label>
                <input
                  type="text"
                  required
                  value={editCode}
                  onChange={e => setEditCode(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-950 dark:text-white uppercase focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">GST Registration No.</label>
                <input
                  type="text"
                  required
                  value={editGst}
                  onChange={e => setEditGst(e.target.value)}
                  maxLength={15}
                  className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-950 dark:text-white uppercase focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Billing & Delivery Address</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={e => setEditAddress(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-950 dark:text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">State</label>
                <select
                  value={editState}
                  onChange={e => setEditState(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-950 dark:text-white focus:outline-none"
                >
                  {statesList.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Number of Digits for Unique Code (Prefix) (Optional)</label>
                <input
                  type="number" min={1} max={50}
                  value={editUniqueCodeLength}
                  onChange={e => setEditUniqueCodeLength(e.target.value)}
                  placeholder="e.g. 4"
                  className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-950 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Numeric Suffix Digits</label>
                <input
                  type="number"
                  value={editNumericDigitsOfSerial}
                  onChange={e => setEditNumericDigitsOfSerial(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-950 dark:text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Total Length of Serial Number</label>
                <input
                  readOnly
                  type="number"
                  value={(parseInt(editUniqueCodeLength, 10) || 0) + (parseInt(editNumericDigitsOfSerial, 10) || 0) || ''}
                  className="w-full bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-gray-950 dark:text-white focus:outline-none cursor-not-allowed"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
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
