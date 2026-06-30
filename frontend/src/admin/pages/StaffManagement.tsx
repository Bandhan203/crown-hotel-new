import { useCallback, useEffect, useMemo, useState } from 'react';
import { type ColDef, type ICellRendererParams } from 'ag-grid-community';
import { MdAdd, MdDelete, MdContentCopy, MdLink, MdPeople, MdMail, MdClose } from 'react-icons/md';
import toast from 'react-hot-toast';
import api from '../../services/api';
import AdminDataGrid from '../components/AdminDataGrid';
import { ACTIVE_BADGE, BADGE, deleteBtn, goldBtn, pinCol } from '../utils/gridHelpers';

interface StaffProfile {
  id: number; email: string; full_name: string; phone: string;
  department: string; position: string; hire_date: string; is_active: boolean;
  permissions: { id: number; module: string; can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }[];
}

interface StaffInvite {
  id: number; email: string; full_name: string; department: string; position: string;
  invite_url: string | null; expires_at: string; created_by_name: string | null;
}

const MODULES = ['ROOMS', 'BOOKINGS', 'GUESTS', 'RESTAURANT', 'SPA', 'CMS', 'STAFF', 'INVENTORY', 'CORPORATE'];

const PRESET_LABELS: Record<string, string> = {
  NONE: 'No preset (set later)',
  FRONT_DESK: 'Front Desk',
  HOUSEKEEPING: 'Housekeeping',
  FB_MANAGER: 'F&B Manager',
  GENERAL_MANAGER: 'General Manager',
};

export default function StaffManagement() {
  const [showForm, setShowForm] = useState(false);
  const [showPerms, setShowPerms] = useState<StaffProfile | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [pendingInvites, setPendingInvites] = useState<StaffInvite[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [presets, setPresets] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const bumpRefresh = () => setRefreshKey(k => k + 1);

  const loadInvites = useCallback(async () => {
    try {
      const res = await api.get('/admin/staff/invites/');
      setPendingInvites(res.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadInvites();
    api.get('/admin/staff/meta/').then(res => {
      setDepartments(res.data.departments || []);
      setPresets(res.data.permission_presets || []);
    }).catch(() => {});
  }, [loadInvites, refreshKey]);

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Invite link copied!');
    } catch {
      toast.error('Copy failed — select and copy manually');
    }
  };

  const revokeInvite = async (id: number) => {
    if (!confirm('Revoke this invite link?')) return;
    try {
      await api.post(`/admin/staff/invites/${id}/revoke/`);
      toast.success('Invite revoked');
      loadInvites();
    } catch {
      toast.error('Failed to revoke');
    }
  };

  const handleDelete = useCallback(async (id: number) => {
    if (!confirm('Delete this staff member?')) return;
    try {
      await api.delete(`/admin/staff/${id}/`);
      toast.success('Staff deleted');
      bumpRefresh();
    } catch {
      toast.error('Failed to delete');
    }
  }, []);

  const columns = useMemo<ColDef[]>(() => [
    { field: 'full_name', headerName: 'Name', width: 140, minWidth: 140, maxWidth: 140, pinned: 'left', lockPinned: true, cellClass: 'cell-guest cell-pin cell-ellipsis', tooltipField: 'full_name', ...pinCol },
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 180, cellClass: 'cell-ellipsis', tooltipField: 'email' },
    { field: 'department', headerName: 'Department', width: 130 },
    { field: 'position', headerName: 'Position', width: 120 },
    { field: 'phone', headerName: 'Mobile', width: 118, valueFormatter: p => p.value || '—' },
    {
      field: 'is_active', headerName: 'Status', width: 90, cellClass: '',
      cellRenderer: (p: ICellRendererParams) => (
        <span className={`${BADGE} ${ACTIVE_BADGE[String(p.value)] || 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
          {p.value ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      headerName: 'Actions', width: 120, minWidth: 120, maxWidth: 120,
      pinned: 'right', lockPinned: true, sortable: false, filter: false,
      cellClass: 'cell-pin cell-actions', ...pinCol,
      cellRenderer: (p: ICellRendererParams) => (
        <div className="flex items-center gap-1 h-full">
          <button type="button" title="Permissions" onClick={() => setShowPerms(p.data)} className={goldBtn}>Perms</button>
          <button type="button" title="Delete" onClick={() => handleDelete(p.data.id)} className={deleteBtn}>
            <MdDelete size={12} />
          </button>
        </div>
      ),
    },
  ], [handleDelete]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <MdPeople className="text-teal-700" /> Staff Management
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Create staff accounts or send secure invite links</p>
        </div>
        <button type="button" onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-teal-700 text-white rounded-lg text-sm font-medium hover:bg-teal-600">
          <MdAdd size={18} /> Add Staff
        </button>
      </div>

      {pendingInvites.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-amber-900 flex items-center gap-2">
            <MdMail size={16} /> Pending Invites ({pendingInvites.length})
          </h3>
          <div className="space-y-2">
            {pendingInvites.map(inv => (
              <div key={inv.id} className="flex flex-wrap items-center justify-between gap-2 bg-white border border-amber-100 rounded-lg px-3 py-2 text-sm">
                <div>
                  <span className="font-medium text-slate-800">{inv.full_name}</span>
                  <span className="text-gray-500 ml-2">{inv.email}</span>
                  {inv.department && <span className="text-xs text-gray-400 ml-2">· {inv.department}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400">Expires {inv.expires_at.slice(0, 10)}</span>
                  {inv.invite_url && (
                    <button type="button" onClick={() => copyLink(inv.invite_url!)}
                      className="flex items-center gap-1 px-2 py-1 bg-teal-50 text-teal-700 rounded text-xs font-medium hover:bg-teal-100">
                      <MdContentCopy size={12} /> Copy Link
                    </button>
                  )}
                  <button type="button" onClick={() => revokeInvite(inv.id)} className="text-red-500 text-xs hover:underline">Revoke</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AdminDataGrid url="/admin/staff/" columnDefs={columns} pageSize={15} refreshKey={refreshKey} rowLabel="staff member" />

      {showForm && (
        <CreateStaffModal
          departments={departments}
          presets={presets}
          onClose={() => setShowForm(false)}
          onCreated={() => { setShowForm(false); bumpRefresh(); loadInvites(); }}
          onInviteLink={url => { setShowForm(false); setInviteLink(url); loadInvites(); }}
        />
      )}

      {inviteLink && (
        <InviteSuccessModal url={inviteLink} onClose={() => { setInviteLink(null); bumpRefresh(); }} />
      )}

      {showPerms && (
        <PermissionsModal staff={showPerms} onClose={() => { setShowPerms(null); bumpRefresh(); }} />
      )}
    </div>
  );
}

function CreateStaffModal({
  departments, presets, onClose, onCreated, onInviteLink,
}: {
  departments: string[];
  presets: string[];
  onClose: () => void;
  onCreated: () => void;
  onInviteLink: (url: string) => void;
}) {
  const [mode, setMode] = useState<'invite' | 'direct'>('invite');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    email: '', full_name: '', phone: '', password: '', department: '', position: '', permission_preset: 'FRONT_DESK',
  });
  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const deptOptions = departments.length ? departments : [
    'Front Desk', 'Housekeeping', 'Food & Beverage', 'Engineering', 'Accounts', 'Management', 'Security', 'General',
  ];

  const submit = async () => {
    if (!form.email || !form.full_name) { toast.error('Email and name required'); return; }
    if (mode === 'direct' && form.password.length < 6) { toast.error('Password min 6 characters'); return; }

    setSaving(true);
    try {
      if (mode === 'invite') {
        const res = await api.post('/admin/staff/invites/', {
          email: form.email,
          full_name: form.full_name,
          phone: form.phone,
          department: form.department,
          position: form.position,
          permission_preset: form.permission_preset,
        });
        onInviteLink(res.data.invite_url);
      } else {
        await api.post('/admin/staff/', {
          email: form.email,
          full_name: form.full_name,
          phone: form.phone,
          password: form.password,
          department: form.department,
          position: form.position,
        });
        toast.success('Staff created — share login at /admin/login');
        onCreated();
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: Record<string, unknown> } };
      const detail = e.response?.data;
      if (detail && typeof detail === 'object') {
        toast.error(Object.entries(detail).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`).join(' '));
      } else {
        toast.error('Failed to create staff');
      }
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white border border-gray-200 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Add Staff Member</h2>
            <p className="text-xs text-gray-500 mt-1">Invite link recommended — staff sets own password</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-slate-800"><MdClose size={20} /></button>
        </div>

        <div className="flex gap-2 mb-4 p-1 bg-gray-100 rounded-lg">
          <button type="button" onClick={() => setMode('invite')}
            className={`flex-1 py-2 text-xs font-semibold rounded-md flex items-center justify-center gap-1 ${mode === 'invite' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500'}`}>
            <MdLink size={14} /> Invite Link
          </button>
          <button type="button" onClick={() => setMode('direct')}
            className={`flex-1 py-2 text-xs font-semibold rounded-md ${mode === 'direct' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500'}`}>
            Direct Password
          </button>
        </div>

        <div className="space-y-3">
          <Field label="Email *" value={form.email} onChange={v => set('email', v)} type="email" />
          <Field label="Full Name *" value={form.full_name} onChange={v => set('full_name', v)} />
          <Field label="Phone" value={form.phone} onChange={v => set('phone', v)} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium">Department</label>
              <select value={form.department} onChange={e => set('department', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="">— Select —</option>
                {deptOptions.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <Field label="Position" value={form.position} onChange={v => set('position', v)} placeholder="e.g. Receptionist" />
          </div>

          {mode === 'invite' ? (
            <div>
              <label className="text-xs text-gray-500 font-medium">Permission Preset</label>
              <select value={form.permission_preset} onChange={e => set('permission_preset', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="NONE">{PRESET_LABELS.NONE}</option>
                {presets.map(p => (
                  <option key={p} value={p}>{PRESET_LABELS[p] || p}</option>
                ))}
              </select>
              <p className="text-[10px] text-gray-400 mt-1">Permissions apply when staff accepts the invite. Adjust later via Perms.</p>
            </div>
          ) : (
            <Field label="Password *" value={form.password} onChange={v => set('password', v)} type="password" />
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 text-gray-500 border border-gray-200 rounded-lg text-sm">Cancel</button>
          <button type="button" disabled={saving} onClick={submit}
            className="flex-[2] py-2.5 bg-teal-700 hover:bg-teal-600 disabled:opacity-50 text-white rounded-lg text-sm font-bold">
            {saving ? 'Saving…' : mode === 'invite' ? 'Generate Invite Link' : 'Create Staff'}
          </button>
        </div>
      </div>
    </div>
  );
}

function InviteSuccessModal({ url, onClose }: { url: string; onClose: () => void }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied!');
    } catch {
      toast.error('Copy failed');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-lg p-6 space-y-4">
        <h2 className="text-lg font-bold text-green-700 flex items-center gap-2">
          <MdLink /> Invite Link Ready
        </h2>
        <p className="text-sm text-gray-600">
          এই link staff-কে পাঠান (WhatsApp/Email)। তারা link খুলে password set করলেই admin panel access পাবে। Link <strong>৭ দিন</strong> valid।
        </p>
        <div className="flex gap-2">
          <input readOnly value={url} className="flex-1 text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-slate-700" />
          <button type="button" onClick={copy} className="px-3 py-2 bg-teal-700 text-white rounded-lg text-sm flex items-center gap-1">
            <MdContentCopy size={16} /> Copy
          </button>
        </div>
        <button type="button" onClick={onClose} className="w-full py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600">Done</button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs text-gray-500 font-medium">{label}</label>
      <input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)}
        className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-teal-600 outline-none" />
    </div>
  );
}

function PermissionsModal({ staff, onClose }: { staff: StaffProfile; onClose: () => void }) {
  const [perms, setPerms] = useState<Record<string, { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }>>(
    () => {
      const map: Record<string, { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }> = {};
      MODULES.forEach(m => {
        const existing = staff.permissions.find(p => p.module === m);
        map[m] = existing
          ? { can_view: existing.can_view, can_create: existing.can_create, can_edit: existing.can_edit, can_delete: existing.can_delete }
          : { can_view: false, can_create: false, can_edit: false, can_delete: false };
      });
      return map;
    }
  );
  const [saving, setSaving] = useState(false);

  const toggle = (module: string, perm: string) => {
    setPerms(prev => ({ ...prev, [module]: { ...prev[module], [perm]: !prev[module][perm as keyof typeof prev[typeof module]] } }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = Object.entries(perms).map(([module, p]) => ({ module, ...p }));
      await api.put(`/admin/staff/${staff.id}/permissions/`, payload);
      toast.success('Permissions updated');
      onClose();
    } catch {
      toast.error('Failed to update permissions');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white border border-gray-200 rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-slate-800 mb-1">Permissions — {staff.full_name}</h2>
        <p className="text-sm text-gray-500 mb-4">{staff.email}</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-left border-b border-gray-200">
              <th className="py-2 pr-4">Module</th>
              {['View', 'Create', 'Edit', 'Delete'].map(h => <th key={h} className="py-2 px-3 text-center">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {MODULES.map(m => (
              <tr key={m} className="border-b border-gray-100">
                <td className="py-2 pr-4 text-slate-800 font-medium">{m}</td>
                {(['can_view', 'can_create', 'can_edit', 'can_delete'] as const).map(p => (
                  <td key={p} className="py-2 px-3 text-center">
                    <input type="checkbox" checked={perms[m][p]} onChange={() => toggle(m, p)} className="w-4 h-4 rounded text-teal-700" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-500 text-sm">Cancel</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 bg-teal-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Permissions'}
          </button>
        </div>
      </div>
    </div>
  );
}
