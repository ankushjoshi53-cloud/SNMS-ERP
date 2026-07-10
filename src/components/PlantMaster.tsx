import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Plant } from '../types';
import { Plus, Edit2, Trash2, MapPin, Check, X } from 'lucide-react';
import { getPermissions } from '../lib/permissions';

interface PlantMasterProps {
  currentUser: any;
}

export default function PlantMaster({ currentUser }: PlantMasterProps) {
  const perms = getPermissions(currentUser, 'plantMaster');
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const canEdit = perms.add || perms.edit;

  useEffect(() => {
    loadPlants();
  }, []);

  const loadPlants = async () => {
    setLoading(true);
    try {
      const data = await api.plants.list();
      setPlants(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load plants');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !location) return;
    setError('');
    setSuccess('');

    try {
      await api.plants.create({ name, location });
      setSuccess('Plant created successfully!');
      setName('');
      setLocation('');
      setShowAddForm(false);
      loadPlants();
    } catch (err: any) {
      setError(err.message || 'Failed to create plant');
    }
  };

  const handleUpdate = async (id: string) => {
    setError('');
    setSuccess('');
    try {
      await api.plants.update(id, { name, location });
      setSuccess('Plant updated successfully!');
      setEditingId(null);
      setName('');
      setLocation('');
      loadPlants();
    } catch (err: any) {
      setError(err.message || 'Failed to update plant');
    }
  };

  const handleDelete = async (id: string) => {
    setError('');
    setSuccess('');
    try {
      await api.plants.delete(id);
      setSuccess('Plant deleted successfully!');
      setConfirmDeleteId(null);
      loadPlants();
    } catch (err: any) {
      setError(err.message || 'Failed to delete plant');
    }
  };

  const startEdit = (p: Plant) => {
    setEditingId(p.id);
    setName(p.name);
    setLocation(p.location);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName('');
    setLocation('');
  };

  return (
    <div className="p-6 space-y-6 max-w-[1200px] mx-auto animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Plant Master Registry</h2>
          <p className="text-xs text-gray-500">Add, configure, and maintain battery manufacturing plants.</p>
        </div>
        {perms.add && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Plant</span>
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

      {/* Add New Plant Form Card */}
      {showAddForm && (
        <form onSubmit={handleAdd} className="p-5 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Configure New Manufacturing Plant</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Plant Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Plant Alpha"
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Geographical Location</label>
              <input
                type="text"
                required
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Chennai, India"
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
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
              Save Plant
            </button>
          </div>
        </form>
      )}

      {/* Plants Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-gray-400">Syncing with server master lists...</div>
      ) : plants.length === 0 ? (
        <div className="p-12 border border-dashed border-gray-200 dark:border-slate-800 rounded-2xl text-center text-xs text-gray-500">
          No plants registered. Please create a plant.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plants.map(plant => {
            const isEditing = editingId === plant.id;
            return (
              <div key={plant.id} className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 hover:shadow">
                <div className="flex justify-between items-start">
                  <div className="p-2.5 bg-cyan-50 dark:bg-cyan-950/25 text-cyan-600 dark:text-cyan-400 rounded-xl">
                    <MapPin className="w-5 h-5" />
                  </div>
                  {(perms.edit || perms.delete) && (
                    <div className="flex space-x-1">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleUpdate(plant.id)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-lg"
                            title="Confirm Changes"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg"
                            title="Cancel Edit"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          {perms.edit && (
                            <button
                              onClick={() => startEdit(plant)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {perms.delete && (
                            confirmDeleteId === plant.id ? (
                              <div className="flex items-center gap-1.5 animate-fade-in">
                                <button
                                  onClick={() => handleDelete(plant.id)}
                                  className="px-2 py-1 bg-red-600 text-white rounded text-[10px] font-bold hover:bg-red-500 cursor-pointer"
                                  title="Confirm plant deletion"
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
                                onClick={() => setConfirmDeleteId(plant.id)}
                                className="p-1.5 text-red-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 dark:text-white"
                      />
                      <input
                        type="text"
                        value={location}
                        onChange={e => setLocation(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 dark:text-white"
                      />
                    </div>
                  ) : (
                    <div>
                      <h4 className="font-bold text-sm text-gray-950 dark:text-white">{plant.name}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                        <span>{plant.location}</span>
                      </p>
                    </div>
                  )}

                  <div className="pt-2 border-t border-gray-50 dark:border-slate-800/60 flex justify-between items-center text-[10px] text-gray-400 font-mono">
                    <span>ID: {plant.id}</span>
                    <span>Created: {new Date(plant.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
