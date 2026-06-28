import { useCallback, useEffect, useState } from 'react';
import { MdAdd, MdDiscount, MdEdit, MdDelete, MdRefresh } from 'react-icons/md';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface RatePlan {
  id: number;
  name: string;
  code: string;
  description: string;
  discount_type: string;
  discount_value: string;
  valid_from: string | null;
  valid_to: string | null;
  min_nights: number;
  max_nights: number | null;
  is_active: boolean;
  room_types: number[];
  created_at: string;
}

interface RoomType {
  id: number;
  name: string;
}

const emptyForm = {
  name: '',
  code: '',
  description: '',
  discount_type: 'PERCENTAGE',
  discount_value: '',
  valid_from: '',
  valid_to: '',
  min_nights: 1,
  max_nights: '',
  is_active: true,
  room_types: [] as number[],
};

export default function RatePlanManagement() {
  const [plans, setPlans] = useState<RatePlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RatePlan | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/rate-plans/');
      setPlans(res.data.results ?? res.data);
    } catch {
      toast.error('Failed to load rate plans');
    }
    setLoading(false);
  }, []);

  const fetchRoomTypes = useCallback(async () => {
    try {
      const res = await api.get('/rooms/');
      setRoomTypes(res.data.results ?? res.data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchPlans(); fetchRoomTypes(); }, [fetchPlans, fetchRoomTypes]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(plan: RatePlan) {
    setEditing(plan);
    setForm({
      name: plan.name,
      code: plan.code,
      description: plan.description,
      discount_type: plan.discount_type,
      discount_value: plan.discount_value,
      valid_from: plan.valid_from || '',
      valid_to: plan.valid_to || '',
      min_nights: plan.min_nights,
      max_nights: plan.max_nights !== null ? String(plan.max_nights) : '',
      is_active: plan.is_active,
      room_types: plan.room_types,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        valid_from: form.valid_from || null,
        valid_to: form.valid_to || null,
        max_nights: form.max_nights ? Number(form.max_nights) : null,
      };
      if (editing) {
        await api.put(`/admin/rate-plans/${editing.id}/`, payload);
        toast.success('Rate plan updated');
      } else {
        await api.post('/admin/rate-plans/', payload);
        toast.success('Rate plan created');
      }
      setShowForm(false);
      fetchPlans();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.code?.[0] || 'Failed to save';
      toast.error(String(msg));
    }
    setSaving(false);
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this rate plan?')) return;
    try {
      await api.delete(`/admin/rate-plans/${id}/`);
      toast.success('Rate plan deleted');
      fetchPlans();
    } catch {
      toast.error('Failed to delete');
    }
  }

  function toggleRoomType(id: number) {
    setForm(prev => ({
      ...prev,
      room_types: prev.room_types.includes(id)
        ? prev.room_types.filter(r => r !== id)
        : [...prev.room_types, id],
    }));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: '"Gilda Display", serif' }}>
            <MdDiscount className="inline mr-2 text-teal-700" />Rate Plans
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage rate plans and pricing discounts</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchPlans} className="p-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 hover:text-slate-800">
            <MdRefresh size={18} />
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-teal-700 text-white rounded-lg text-sm font-medium hover:bg-teal-600">
            <MdAdd size={18} />New Rate Plan
          </button>
        </div>
      </div>

      {/* Plans List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
          <MdDiscount size={48} className="mx-auto text-gray-600 mb-3" />
          <p className="text-gray-500">No rate plans yet</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map(plan => (
            <div key={plan.id} className="bg-gray-50 border border-gray-200 rounded-xl p-5 hover:border-teal-600/30 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-slate-800 font-semibold">{plan.name}</h3>
                  <span className="font-mono text-xs text-teal-700">{plan.code}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${plan.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-500'}`}>
                  {plan.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {plan.description && <p className="text-gray-500 text-sm mb-3 line-clamp-2">{plan.description}</p>}

              <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                <div>
                  <span className="text-gray-500 text-xs">Discount</span>
                  <p className="text-slate-800">
                    {plan.discount_type === 'PERCENTAGE' ? `${plan.discount_value}%` : `BDT ${plan.discount_value}`}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">Min Nights</span>
                  <p className="text-slate-800">{plan.min_nights}</p>
                </div>
                {plan.valid_from && (
                  <div>
                    <span className="text-gray-500 text-xs">Valid From</span>
                    <p className="text-slate-800">{plan.valid_from}</p>
                  </div>
                )}
                {plan.valid_to && (
                  <div>
                    <span className="text-gray-500 text-xs">Valid To</span>
                    <p className="text-slate-800">{plan.valid_to}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-200">
                <button onClick={() => openEdit(plan)} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-50 text-gray-600 hover:text-white rounded-lg border border-gray-200">
                  <MdEdit size={14} />Edit
                </button>
                <button onClick={() => handleDelete(plan.id)} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-500/10 text-red-400 hover:text-red-300 rounded-lg border border-red-500/20">
                  <MdDelete size={14} />Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-slate-800">{editing ? 'Edit Rate Plan' : 'New Rate Plan'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Name *</label>
                  <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-teal-600" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Code *</label>
                  <input required value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm font-mono focus:outline-none focus:border-teal-600" />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={2} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-teal-600" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Discount Type</label>
                  <select value={form.discount_type} onChange={e => setForm(p => ({ ...p, discount_type: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-teal-600">
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Discount Value *</label>
                  <input required type="number" step="0.01" min="0" value={form.discount_value}
                    onChange={e => setForm(p => ({ ...p, discount_value: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-teal-600" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Valid From</label>
                  <input type="date" value={form.valid_from} onChange={e => setForm(p => ({ ...p, valid_from: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-teal-600" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Valid To</label>
                  <input type="date" value={form.valid_to} onChange={e => setForm(p => ({ ...p, valid_to: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-teal-600" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Min Nights</label>
                  <input type="number" min="1" value={form.min_nights} onChange={e => setForm(p => ({ ...p, min_nights: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-teal-600" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Max Nights</label>
                  <input type="number" min="1" value={form.max_nights} onChange={e => setForm(p => ({ ...p, max_nights: e.target.value }))}
                    placeholder="No limit" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm placeholder-gray-600 focus:outline-none focus:border-teal-600" />
                </div>
              </div>

              {/* Room Types */}
              <div>
                <label className="text-xs text-gray-500 mb-2 block">Applicable Room Types</label>
                <div className="flex flex-wrap gap-2">
                  {roomTypes.map(rt => (
                    <button key={rt.id} type="button" onClick={() => toggleRoomType(rt.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        form.room_types.includes(rt.id)
                          ? 'bg-teal-50 text-teal-700 border-teal-600/40'
                          : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'
                      }`}>
                      {rt.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
                  className="w-4 h-4 rounded bg-white/10 border-gray-300 text-teal-700 focus:ring-teal-600" />
                <span className="text-sm text-gray-600">Active</span>
              </label>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 bg-teal-700 text-white rounded-lg text-sm font-medium hover:bg-teal-600 disabled:opacity-50">
                  {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-6 py-2.5 border border-gray-200 text-gray-500 rounded-lg text-sm hover:text-slate-800">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
