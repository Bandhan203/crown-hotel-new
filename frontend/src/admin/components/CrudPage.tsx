import { useCallback, useEffect, useState } from 'react';
import { type ColDef, type ICellRendererParams } from 'ag-grid-community';
import { MdAdd, MdEdit, MdDelete } from 'react-icons/md';
import toast from 'react-hot-toast';
import api from '../../services/api';
import AdminDataGrid from './AdminDataGrid';

/**
 * Generic CRUD management component for CMS resources.
 */
interface FieldDef {
  key: string; label: string;
  type?: 'text' | 'textarea' | 'number' | 'checkbox' | 'select' | 'image';
  options?: string[][]; // [value, label][]
  placeholder?: string;
}

interface CrudPageProps {
  title: string;
  icon: React.ReactNode;
  endpoint: string;
  columns: ColDef[];
  formFields: FieldDef[];
  defaultValues?: Record<string, any>;
  gridQueryParams?: Record<string, string | number | boolean | undefined>;
  filterToolbar?: React.ReactNode;
}

export default function CrudPage({
  title,
  icon,
  endpoint,
  columns,
  formFields,
  defaultValues = {},
  gridQueryParams = {},
  filterToolbar,
}: CrudPageProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/${endpoint}/`);
      setData(res.data.results || res.data);
    } catch { toast.error('Failed to load data'); }
    setLoading(false);
  }, [endpoint]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure?')) return;
    try {
      await api.delete(`/admin/${endpoint}/${id}/`);
      toast.success('Deleted');
      fetchData();
    } catch { toast.error('Failed to delete'); }
  };

  const handleSave = async (formData: any) => {
    try {
      const hasFile = Object.values(formData).some((value) => value instanceof File);
      let payload: any = formData;
      let config: any = undefined;

      if (hasFile) {
        const multipart = new FormData();
        Object.entries(formData).forEach(([key, value]) => {
          if (value === null || value === undefined || value === '') return;
          multipart.append(key, value as any);
        });
        payload = multipart;
        config = { headers: { 'Content-Type': 'multipart/form-data' } };
      }

      if (editItem?.id) await api.put(`/admin/${endpoint}/${editItem.id}/`, payload, config);
      else await api.post(`/admin/${endpoint}/`, payload, config);
      toast.success(editItem ? 'Updated' : 'Created');
      setShowModal(false); setEditItem(null); fetchData();
    } catch (err: any) {
      const d = err.response?.data;
      toast.error(d ? Object.entries(d).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('\n') : 'Failed');
    }
  };

  const ActionRenderer = (params: ICellRendererParams) => (
    <div className="flex items-center gap-1 h-full">
      <button onClick={() => { setEditItem(params.data); setShowModal(true); }}
        className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded"><MdEdit size={16} /></button>
      <button onClick={() => handleDelete(params.data.id)}
        className="p-1.5 text-red-400 hover:bg-red-500/10 rounded"><MdDelete size={16} /></button>
    </div>
  );

  const allCols: ColDef[] = [
    ...columns,
    { headerName: 'Actions', width: 100, cellRenderer: ActionRenderer, sortable: false, filter: false },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: '"Gilda Display", serif' }}>
          <span className="inline mr-2 text-primary">{icon}</span>{title}
        </h1>
        <button onClick={() => { setEditItem(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-teal-600 text-white rounded-lg text-sm font-medium">
          <MdAdd size={18} /> Add New
        </button>
      </div>

      {filterToolbar && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          {filterToolbar}
        </div>
      )}

      <AdminDataGrid url={`/admin/${endpoint}/`} columnDefs={allCols} pageSize={15} queryParams={gridQueryParams} />

      {showModal && (
        <FormModal
          fields={formFields} item={editItem} defaults={defaultValues}
          onClose={() => { setShowModal(false); setEditItem(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function FormModal({ fields, item, defaults, onClose, onSave }: {
  fields: FieldDef[]; item: any; defaults: Record<string, any>;
  onClose: () => void; onSave: (data: any) => void;
}) {
  const [form, setForm] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    fields.forEach(f => {
      if (f.type === 'image') {
        initial[f.key] = null;
        return;
      }
      initial[f.key] = item?.[f.key] ?? defaults[f.key] ?? (f.type === 'checkbox' ? false : f.type === 'number' ? 0 : '');
    });
    return initial;
  });

  const set = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white border border-gray-200 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-slate-800 mb-4">{item ? 'Edit' : 'Add New'}</h2>
        <div className="space-y-4">
          {fields.map(f => {
            if (f.type === 'textarea') return (
              <div key={f.key}>
                <label className="block text-sm text-gray-600 mb-1">{f.label}</label>
                <textarea value={form[f.key]} onChange={e => set(f.key, e.target.value)} rows={3}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm focus:border-primary outline-none resize-none" />
              </div>
            );
            if (f.type === 'checkbox') return (
              <label key={f.key} className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" checked={form[f.key]} onChange={e => set(f.key, e.target.checked)}
                  className="w-4 h-4 rounded border-gray-200 bg-gray-50" />{f.label}
              </label>
            );
            if (f.type === 'select') return (
              <div key={f.key}>
                <label className="block text-sm text-gray-600 mb-1">{f.label}</label>
                <select value={form[f.key]} onChange={e => set(f.key, e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm focus:border-primary outline-none">
                  {f.options?.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                </select>
              </div>
            );
            if (f.type === 'image') return (
              <div key={f.key}>
                <label className="block text-sm text-gray-600 mb-1">{f.label}</label>
                {item?.[f.key] && typeof item[f.key] === 'string' && (
                  <div className="mb-2 p-2 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-xs text-gray-500 mb-2">Existing image</p>
                    <img src={item[f.key]} alt="Existing" className="w-full h-36 object-cover rounded" />
                    <p className="text-[11px] text-gray-500 mt-2">Select a new file only if you want to replace it.</p>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={e => set(f.key, e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm focus:border-primary outline-none"
                />
                {form[f.key] instanceof File && (
                  <p className="text-xs text-emerald-300 mt-2">Selected replacement: {form[f.key].name}</p>
                )}
              </div>
            );
            return (
              <div key={f.key}>
                <label className="block text-sm text-gray-600 mb-1">{f.label}</label>
                <input type={f.type || 'text'} value={form[f.key]} onChange={e => set(f.key, f.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm focus:border-primary outline-none" />
              </div>
            );
          })}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-500 hover:text-slate-800 text-sm">Cancel</button>
          <button onClick={() => onSave(form)} className="px-4 py-2 bg-primary hover:bg-teal-600 text-white rounded-lg text-sm font-medium">
            {item ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
