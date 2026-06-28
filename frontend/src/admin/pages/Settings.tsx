import { useEffect, useState } from 'react';
import { MdSettings, MdSave, MdPayment, MdSearch, MdEdit, MdToggleOn, MdToggleOff } from 'react-icons/md';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

interface GatewayConfig {
  store_id: string;
  is_sandbox: boolean;
  store_password_set: boolean;
  frontend_url: string;
  is_active: boolean;
  source: 'database' | 'env';
}

export default function Settings() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
  });
  const [passwords, setPasswords] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [saving, setSaving] = useState(false);

  // Payment gateway state
  const [gateway, setGateway] = useState<GatewayConfig | null>(null);
  const [gwForm, setGwForm] = useState({ store_id: '', store_password: '', frontend_url: '', is_sandbox: true, is_active: true });
  const [gwEditing, setGwEditing] = useState(false);
  const [gwSaving, setGwSaving] = useState(false);
  const [queryTranId, setQueryTranId] = useState('');
  const [queryResult, setQueryResult] = useState<any>(null);
  const [querying, setQuerying] = useState(false);

  const set = (k: string, v: string) => setForm({ ...form, [k]: v });
  const setPwd = (k: string, v: string) => setPasswords({ ...passwords, [k]: v });

  const updateProfile = async () => {
    setSaving(true);
    try {
      await api.put('/auth/me/', form);
      toast.success('Profile updated');
      localStorage.setItem('user', JSON.stringify({ ...user, ...form }));
    } catch { toast.error('Failed to update'); }
    setSaving(false);
  };

  const changePassword = async () => {
    if (passwords.new_password !== passwords.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      await api.post('/auth/change-password/', {
        old_password: passwords.old_password,
        new_password: passwords.new_password,
      });
      toast.success('Password changed');
      setPasswords({ old_password: '', new_password: '', confirm_password: '' });
    } catch { toast.error('Failed to change password'); }
  };

  // Fetch gateway settings
  useEffect(() => {
    api.get('/admin/payment-gateway/settings/')
      .then(r => {
        setGateway(r.data);
        setGwForm({
          store_id: r.data.store_id || '',
          store_password: '',
          frontend_url: r.data.frontend_url || '',
          is_sandbox: r.data.is_sandbox,
          is_active: r.data.is_active,
        });
      })
      .catch(() => {});
  }, []);

  const handleGatewaySave = async () => {
    if (!gwForm.store_id.trim()) { toast.error('Store ID is required'); return; }
    if (!gwForm.frontend_url.trim()) { toast.error('Frontend URL is required'); return; }
    if (!gateway?.store_password_set && !gwForm.store_password.trim()) { toast.error('Store Password is required'); return; }
    setGwSaving(true);
    try {
      const res = await api.put('/admin/payment-gateway/settings/', gwForm);
      setGateway(res.data);
      setGwForm(prev => ({ ...prev, store_password: '' }));
      setGwEditing(false);
      toast.success('Payment gateway settings saved');
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to save settings');
    }
    setGwSaving(false);
  };

  const handleTransactionQuery = async () => {
    if (!queryTranId.trim()) { toast.error('Enter a transaction / booking ref'); return; }
    setQuerying(true);
    setQueryResult(null);
    try {
      const res = await api.post('/admin/payment-gateway/query/', { tran_id: queryTranId.trim() });
      setQueryResult(res.data);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Query failed');
    }
    setQuerying(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: '"Gilda Display", serif' }}>
        <MdSettings className="inline mr-2 text-teal-700" />Settings
      </h1>

      {/* Profile */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-slate-800 font-semibold mb-4">Profile Information</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Email</label>
            <input value={user?.email || ''} disabled
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 text-sm cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Full Name</label>
            <input value={form.full_name} onChange={e => set('full_name', e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm focus:border-teal-600 outline-none" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Phone</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm focus:border-teal-600 outline-none" />
          </div>
          <button onClick={updateProfile} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
            <MdSave size={18} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-slate-800 font-semibold mb-4">Change Password</h2>
        <div className="space-y-4">
          {[['old_password', 'Current Password'], ['new_password', 'New Password'], ['confirm_password', 'Confirm Password']].map(([key, label]) => (
            <div key={key}>
              <label className="block text-sm text-gray-600 mb-1">{label}</label>
              <input type="password" value={(passwords as any)[key]} onChange={e => setPwd(key, e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm focus:border-teal-600 outline-none" />
            </div>
          ))}
          <button onClick={changePassword}
            className="flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-600 text-white rounded-lg text-sm font-medium">
            Change Password
          </button>
        </div>
      </div>

      {/* Payment Gateway */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-slate-800 font-semibold flex items-center gap-2">
            <MdPayment size={20} className="text-teal-700" /> Payment Gateway (SSLCommerz)
          </h2>
          {gateway && !gwEditing && (
            <button onClick={() => setGwEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-white/10 border border-gray-200 text-gray-600 rounded-lg text-xs font-medium transition">
              <MdEdit size={14} /> Edit
            </button>
          )}
        </div>

        {gateway && !gwEditing ? (
          /* ── Read-only view ── */
          <div className="space-y-3 mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 block text-xs uppercase tracking-wider mb-1">Store ID</span>
                <span className="text-slate-800 font-mono">{gateway.store_id}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs uppercase tracking-wider mb-1">Mode</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${gateway.is_sandbox ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
                  {gateway.is_sandbox ? 'SANDBOX' : 'LIVE'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs uppercase tracking-wider mb-1">Password</span>
                <span className="text-slate-800">{gateway.store_password_set ? '••••••••' : <span className="text-red-400">Not Set</span>}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs uppercase tracking-wider mb-1">Frontend URL</span>
                <span className="text-slate-800 text-xs font-mono">{gateway.frontend_url}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs uppercase tracking-wider mb-1">Gateway Status</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${gateway.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {gateway.is_active ? 'ACTIVE' : 'DISABLED'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs uppercase tracking-wider mb-1">Config Source</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${gateway.source === 'database' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'}`}>
                  {gateway.source === 'database' ? 'DATABASE' : '.ENV FILE'}
                </span>
              </div>
            </div>
            {gateway.source === 'env' && (
              <p className="text-xs text-yellow-500/80 bg-yellow-500/10 rounded-lg px-3 py-2">
                Configuration is loaded from <code className="font-mono">.env</code> file. Click <strong>Edit</strong> to save settings to the database for dynamic control.
              </p>
            )}
          </div>
        ) : gateway || gwEditing ? (
          /* ── Editable form ── */
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Store ID <span className="text-red-400">*</span></label>
                <input value={gwForm.store_id} onChange={e => setGwForm({ ...gwForm, store_id: e.target.value })}
                  placeholder="e.g. yourstore_live"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm font-mono focus:border-teal-600 outline-none" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Store Password {gateway?.store_password_set ? <span className="text-gray-500">(leave blank to keep)</span> : <span className="text-red-400">*</span>}
                </label>
                <input type="password" value={gwForm.store_password} onChange={e => setGwForm({ ...gwForm, store_password: e.target.value })}
                  placeholder={gateway?.store_password_set ? '••••••••' : 'Enter store password'}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm font-mono focus:border-teal-600 outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Frontend URL <span className="text-red-400">*</span></label>
              <input value={gwForm.frontend_url} onChange={e => setGwForm({ ...gwForm, frontend_url: e.target.value })}
                placeholder="e.g. https://yourdomain.com"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm font-mono focus:border-teal-600 outline-none" />
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => setGwForm({ ...gwForm, is_sandbox: !gwForm.is_sandbox })}>
                {gwForm.is_sandbox
                  ? <MdToggleOn size={28} className="text-yellow-400" />
                  : <MdToggleOff size={28} className="text-gray-500" />}
                <span className="text-sm text-gray-600">Sandbox Mode</span>
                {!gwForm.is_sandbox && <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">LIVE — real transactions</span>}
              </div>
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => setGwForm({ ...gwForm, is_active: !gwForm.is_active })}>
                {gwForm.is_active
                  ? <MdToggleOn size={28} className="text-green-400" />
                  : <MdToggleOff size={28} className="text-gray-500" />}
                <span className="text-sm text-gray-600">Gateway Active</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleGatewaySave} disabled={gwSaving}
                className="flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
                <MdSave size={16} /> {gwSaving ? 'Saving...' : 'Save Settings'}
              </button>
              {gwEditing && (
                <button onClick={() => { setGwEditing(false); if (gateway) setGwForm({ store_id: gateway.store_id, store_password: '', frontend_url: gateway.frontend_url, is_sandbox: gateway.is_sandbox, is_active: gateway.is_active }); }}
                  className="px-4 py-2 bg-gray-50 hover:bg-white/10 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium">
                  Cancel
                </button>
              )}
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Loading gateway configuration...</p>
        )}

        {/* Transaction Query */}
        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-slate-800 text-sm font-medium mb-3">Query Transaction</h3>
          <div className="flex gap-2">
            <input
              value={queryTranId}
              onChange={e => setQueryTranId(e.target.value)}
              placeholder="Booking ref / Transaction ID..."
              className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm focus:border-teal-600 outline-none font-mono"
            />
            <button onClick={handleTransactionQuery} disabled={querying}
              className="flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
              <MdSearch size={16} /> {querying ? 'Querying...' : 'Query'}
            </button>
          </div>
          {queryResult && (
            <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-64 overflow-auto">
              <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono">
                {JSON.stringify(queryResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
