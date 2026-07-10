import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { User, Plant, UserRole, CustomerAuthorizations, ModulePermissions } from '../types';
import { Plus, Users, Shield, Trash2, Edit2, Check, X, ShieldAlert, ChevronDown, ChevronUp, Lock, ShieldCheck } from 'lucide-react';

const initialPermissions = (): ModulePermissions => ({
  view: true,
  add: true,
  edit: true,
  delete: true,
});

const defaultAuthorizations = (): CustomerAuthorizations => ({
  plantMaster: initialPermissions(),
  modelMaster: initialPermissions(),
  customerMaster: initialPermissions(),
  rangeAllotment: initialPermissions(),
  packingEntry: initialPermissions(),
  pdiQualityCheck: initialPermissions(),
  interPlantTransfer: initialPermissions(),
  dispatchControl: initialPermissions(),
});

const modulesList: Array<{ key: keyof CustomerAuthorizations; label: string }> = [
  { key: 'plantMaster', label: 'Plant Master' },
  { key: 'modelMaster', label: 'Model Master' },
  { key: 'customerMaster', label: 'Customer Master' },
  { key: 'rangeAllotment', label: 'Range Allotment' },
  { key: 'packingEntry', label: 'Packing Entry (Production)' },
  { key: 'pdiQualityCheck', label: 'PDI Quality Check' },
  { key: 'interPlantTransfer', label: 'Inter-Plant Transfer' },
  { key: 'dispatchControl', label: 'Dispatch Control' },
];

interface UserMasterProps {
  currentUser?: { name: string; email: string; role: string; plant: string } | null;
}

export default function UserMaster({ currentUser }: UserMasterProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('Production');
  const [plant, setPlant] = useState('Plant Alpha');
  const [password, setPassword] = useState('');
  const [authorizations, setAuthorizations] = useState<CustomerAuthorizations>(defaultAuthorizations());
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [userList, plantList] = await Promise.all([
        api.users.list(),
        api.plants.list()
      ]);
      setUsers(userList);
      setPlants(plantList);
      if (plantList.length > 0) setPlant(plantList[0].name);
    } catch (err: any) {
      setError(err.message || 'Failed to sync users database');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (moduleKey: keyof CustomerAuthorizations, permissionKey: keyof ModulePermissions) => {
    setAuthorizations(prev => ({
      ...prev,
      [moduleKey]: {
        ...prev[moduleKey],
        [permissionKey]: !prev[moduleKey][permissionKey]
      }
    }));
  };

  const toggleRowAll = (moduleKey: keyof CustomerAuthorizations, enable: boolean) => {
    setAuthorizations(prev => ({
      ...prev,
      [moduleKey]: {
        view: enable,
        add: enable,
        edit: enable,
        delete: enable
      }
    }));
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !employeeId || !email || !password) return;
    setError('');
    setSuccess('');

    try {
      await api.users.create({ name, employeeId, email, role, password, plant, authorizations });
      setSuccess('Enterprise User account established successfully!');
      setName('');
      setEmployeeId('');
      setEmail('');
      setPassword('');
      setAuthorizations(defaultAuthorizations());
      setShowAddForm(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to register account');
    }
  };

  const handleUpdate = async (id: string) => {
    setError('');
    setSuccess('');
    try {
      await api.users.update(id, { name, employeeId, role, plant, password: password || undefined, authorizations });
      setSuccess('Enterprise User account credentials modified!');
      setEditingId(null);
      setName('');
      setEmployeeId('');
      setPassword('');
      setAuthorizations(defaultAuthorizations());
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to modify account');
    }
  };

  const handleDelete = async (id: string) => {
    setError('');
    setSuccess('');
    try {
      await api.users.delete(id);
      setSuccess('Account terminated successfully.');
      setConfirmDeleteId(null);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to terminate account');
    }
  };

  const startEdit = (u: User) => {
    setEditingId(u.id);
    setName(u.name);
    setEmployeeId(u.employeeId);
    setRole(u.role);
    setPlant(u.plant);
    setPassword(''); // Leave blank to skip updating password
    setAuthorizations(u.authorizations || defaultAuthorizations());
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName('');
    setEmployeeId('');
    setPassword('');
    setAuthorizations(defaultAuthorizations());
  };

  const rolesList: UserRole[] = ['Super Admin', 'QA', 'Production', 'PDI', 'Dispatch', 'Viewer'];

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Role-Based Access Control (User Master)</h2>
          <p className="text-xs text-gray-500">Authorize operators, assign security access levels, and restrict database visibility per plant unit.</p>
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow transition"
          >
            <Plus className="w-4 h-4" />
            <span>Provision User</span>
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

      {/* Provision Form */}
      {showAddForm && (
        <form onSubmit={handleAdd} className="p-5 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-purple-500" />
            Provision New Corporate Security Account
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Employee ID</label>
              <input
                type="text"
                required
                value={employeeId}
                onChange={e => setEmployeeId(e.target.value)}
                placeholder="e.g. EMP482"
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Email (Login Handle)</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="e.g. operator@company.com"
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Security Access Role</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value as UserRole)}
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none"
              >
                {rolesList.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Station/Plant Authorization</label>
              <select
                value={plant}
                onChange={e => setPlant(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none"
              >
                <option value="All">All Plants (Corporate)</option>
                {plants.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Account Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Custom Interactive Permissions Grid */}
          <div className="border-t border-gray-100 dark:border-slate-800 pt-4 mt-2">
            <div className="flex items-center gap-2 mb-1.5">
              <Shield className="w-4.5 h-4.5 text-purple-600 dark:text-purple-400" />
              <h4 className="text-xs font-bold text-gray-800 dark:text-white uppercase tracking-wide">
                Role-Based Feature & Action Access Grid
              </h4>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-3.5">
              Configure fine-grained read/write privileges (View, Add, Edit, Delete) for this security profile.
            </p>

            <div className="overflow-x-auto border border-gray-150 dark:border-slate-800 rounded-xl bg-gray-50/50 dark:bg-slate-950/20">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-150 dark:border-slate-800 bg-gray-100/80 dark:bg-slate-900/80 text-gray-500 dark:text-gray-400 font-bold">
                    <th className="p-2.5 pl-3.5">System Module</th>
                    <th className="p-2.5 text-center">READ / View</th>
                    <th className="p-2.5 text-center">WRITE / Add</th>
                    <th className="p-2.5 text-center">WRITE / Edit</th>
                    <th className="p-2.5 text-center">WRITE / Delete</th>
                    <th className="p-2.5 text-center pr-3.5">Bulk Options</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 dark:divide-slate-800 bg-white/50 dark:bg-slate-900/50">
                  {modulesList.map(({ key, label }) => (
                    <tr key={key} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/25 text-gray-700 dark:text-gray-300">
                      <td className="p-2.5 pl-3.5 font-semibold text-gray-900 dark:text-white">{label}</td>
                      <td className="p-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={authorizations[key].view}
                          onChange={() => handlePermissionChange(key, 'view')}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer"
                        />
                      </td>
                      <td className="p-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={authorizations[key].add}
                          onChange={() => handlePermissionChange(key, 'add')}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer"
                        />
                      </td>
                      <td className="p-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={authorizations[key].edit}
                          onChange={() => handlePermissionChange(key, 'edit')}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer"
                        />
                      </td>
                      <td className="p-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={authorizations[key].delete}
                          onChange={() => handlePermissionChange(key, 'delete')}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer"
                        />
                      </td>
                      <td className="p-2.5 text-center pr-3.5 space-x-2 font-mono text-[10px]">
                        <button
                          type="button"
                          onClick={() => toggleRowAll(key, true)}
                          className="text-purple-600 dark:text-purple-400 hover:underline font-bold"
                        >
                          ALL
                        </button>
                        <span className="text-gray-300 dark:text-slate-800">|</span>
                        <button
                          type="button"
                          onClick={() => toggleRowAll(key, false)}
                          className="text-gray-400 hover:underline"
                        >
                          NONE
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
              className="px-4 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-500"
            >
              Provision Account
            </button>
          </div>
        </form>
      )}

      {/* Users List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-gray-400">Synchronizing users list...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map(u => {
            const isEditing = editingId === u.id;
            return (
              <div key={u.id} className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 hover:shadow">
                <div className="flex items-start justify-between">
                  <div className="p-2.5 bg-purple-50 dark:bg-purple-950/25 text-purple-600 dark:text-purple-400 rounded-xl">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="flex space-x-1">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => handleUpdate(u.id)}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-lg"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(u)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {u.email !== currentUser?.email ? (
                          confirmDeleteId === u.id ? (
                            <div className="flex items-center gap-1.5 animate-fade-in">
                              <button
                                onClick={() => handleDelete(u.id)}
                                className="px-2 py-1 bg-red-600 text-white rounded text-[10px] font-bold hover:bg-red-500 cursor-pointer"
                                title="Confirm user deletion"
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
                              onClick={() => setConfirmDeleteId(u.id)}
                              className="p-1.5 text-red-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg cursor-pointer"
                              title="Delete user account"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )
                        ) : (
                          <span
                            className="p-1.5 text-slate-400 dark:text-slate-600 cursor-not-allowed"
                            title="Cannot delete your own active session account"
                          >
                            <Lock className="w-4 h-4" />
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {isEditing ? (
                    <div className="space-y-2.5">
                      <div>
                        <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Full Name</label>
                        <input
                          type="text"
                          value={name}
                          onChange={e => setName(e.target.value)}
                          placeholder="User Name"
                          className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded px-2 py-1 text-xs text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Employee ID</label>
                        <input
                          type="text"
                          value={employeeId}
                          onChange={e => setEmployeeId(e.target.value)}
                          placeholder="EMP ID"
                          className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded px-2 py-1 text-xs text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Security Access Role</label>
                        <select
                          value={role}
                          onChange={e => setRole(e.target.value as UserRole)}
                          className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded px-2 py-1 text-xs text-gray-900 dark:text-white"
                        >
                          {rolesList.map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Station/Plant Authorization</label>
                        <select
                          value={plant}
                          onChange={e => setPlant(e.target.value)}
                          className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded px-2 py-1 text-xs text-gray-900 dark:text-white"
                        >
                          <option value="All">All Plants</option>
                          {plants.map(p => (
                            <option key={p.id} value={p.name}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Account Password (Optional)</label>
                        <input
                          type="password"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          placeholder="New password (optional)"
                          className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded px-2 py-1 text-xs text-gray-900 dark:text-white"
                        />
                      </div>

                      {/* Edit mode: interactive permissions list in card */}
                      <div className="pt-2.5 border-t border-gray-100 dark:border-slate-800/80">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Edit Access Permissions</span>
                        <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-purple-500">
                          {modulesList.map(({ key, label }) => (
                            <div key={key} className="bg-gray-50 dark:bg-slate-950 p-1.5 rounded border border-gray-150 dark:border-slate-850 space-y-1">
                              <div className="flex justify-between items-center text-[10px] font-semibold text-gray-750 dark:text-gray-300">
                                <span>{label}</span>
                                <div className="space-x-1.5">
                                  <button
                                    type="button"
                                    onClick={() => toggleRowAll(key, true)}
                                    className="text-purple-600 dark:text-purple-400 hover:underline font-bold text-[9px]"
                                  >
                                    All
                                  </button>
                                  <span className="text-gray-300 font-normal">|</span>
                                  <button
                                    type="button"
                                    onClick={() => toggleRowAll(key, false)}
                                    className="text-gray-400 hover:underline text-[9px]"
                                  >
                                    None
                                  </button>
                                </div>
                              </div>
                              <div className="flex justify-between items-center gap-1 text-[10px]">
                                <label className="flex items-center gap-0.5 cursor-pointer text-gray-600 dark:text-gray-400">
                                  <input
                                    type="checkbox"
                                    checked={authorizations[key].view}
                                    onChange={() => handlePermissionChange(key, 'view')}
                                    className="w-3 h-3 rounded text-purple-600 border-gray-300 focus:ring-purple-500"
                                  />
                                  <span>View</span>
                                </label>
                                <label className="flex items-center gap-0.5 cursor-pointer text-gray-600 dark:text-gray-400">
                                  <input
                                    type="checkbox"
                                    checked={authorizations[key].add}
                                    onChange={() => handlePermissionChange(key, 'add')}
                                    className="w-3 h-3 rounded text-purple-600 border-gray-300 focus:ring-purple-500"
                                  />
                                  <span>Add</span>
                                </label>
                                <label className="flex items-center gap-0.5 cursor-pointer text-gray-600 dark:text-gray-400">
                                  <input
                                    type="checkbox"
                                    checked={authorizations[key].edit}
                                    onChange={() => handlePermissionChange(key, 'edit')}
                                    className="w-3 h-3 rounded text-purple-600 border-gray-300 focus:ring-purple-500"
                                  />
                                  <span>Edit</span>
                                </label>
                                <label className="flex items-center gap-0.5 cursor-pointer text-gray-600 dark:text-gray-400">
                                  <input
                                    type="checkbox"
                                    checked={authorizations[key].delete}
                                    onChange={() => handlePermissionChange(key, 'delete')}
                                    className="w-3 h-3 rounded text-purple-600 border-gray-300 focus:ring-purple-500"
                                  />
                                  <span>Del</span>
                                </label>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-sm text-gray-950 dark:text-white">{u.name}</h4>
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300 font-mono">
                          {u.employeeId}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 font-mono mt-0.5">{u.email}</p>
                    </div>
                  )}

                  {!isEditing && (
                    <div className="space-y-3 pt-1">
                      <div className="pt-3 border-t border-gray-50 dark:border-slate-800/60 flex items-center justify-between text-xs">
                        <span className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/25 text-purple-700 dark:text-purple-400 font-bold text-[10px] flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          {u.role}
                        </span>
                        <span className="text-gray-500 text-[10px] font-medium">Plant Auth: {u.plant}</span>
                      </div>

                      {/* Expandable permissions summary details */}
                      <div className="pt-2.5 border-t border-dashed border-gray-100 dark:border-slate-800/40 flex justify-between items-center text-xs">
                        <span className="text-gray-450 font-medium text-[10px]">Access Permissions</span>
                        <button
                          type="button"
                          onClick={() => setExpandedUserId(expandedUserId === u.id ? null : u.id)}
                          className="flex items-center gap-1 px-2 py-0.5 bg-gray-50 hover:bg-gray-100 dark:bg-slate-950 dark:hover:bg-slate-850 text-[10px] text-purple-600 dark:text-purple-400 font-bold rounded transition border border-gray-200 dark:border-slate-800"
                        >
                          <Shield className="w-3 h-3" />
                          <span>{expandedUserId === u.id ? 'Hide Permissions' : 'View Permissions'}</span>
                          {expandedUserId === u.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </div>

                      {expandedUserId === u.id && (
                        <div className="pt-2 space-y-1 text-[10px] bg-gray-50 dark:bg-slate-950/80 p-2 rounded-xl border border-gray-100 dark:border-slate-850/50 animate-fade-in max-h-[180px] overflow-y-auto">
                          {modulesList.map(({ key, label }) => {
                            const perms = u.authorizations?.[key] || { view: true, add: true, edit: true, delete: true };
                            return (
                              <div key={key} className="flex justify-between items-center py-1 border-b border-gray-100 dark:border-slate-900 last:border-0">
                                <span className="font-semibold text-gray-750 dark:text-gray-300">{label}</span>
                                <div className="flex gap-1">
                                  {['view', 'add', 'edit', 'delete'].map((action) => {
                                    const hasPerm = (perms as any)[action];
                                    return (
                                      <span
                                        key={action}
                                        title={`${action.toUpperCase()}: ${hasPerm ? 'Allowed' : 'Denied'}`}
                                        className={`px-1 rounded text-[8px] font-extrabold uppercase ${
                                          hasPerm
                                            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400'
                                            : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 line-through'
                                        }`}
                                      >
                                        {action === 'view' ? 'R' : action === 'add' ? 'A' : action === 'edit' ? 'E' : 'D'}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
