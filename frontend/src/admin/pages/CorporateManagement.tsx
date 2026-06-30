import { useCallback, useEffect, useState } from 'react';
import {
  MdBusiness, MdAdd, MdEdit, MdStar, MdAttachMoney, MdPeople, MdCake,
  MdCheckCircle, MdClose, MdRefresh,
} from 'react-icons/md';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface Company {
  id: number; company_code: string; company_name: string; contact_person: string;
  contact_birthday: string | null; contact_phone: string; office_phone: string;
  contact_email: string; billing_address: string; negotiated_discount_pct: string;
  credit_limit: string; status: string; notes: string;
}

interface Agent {
  id: number; name: string; agent_type: string; commission_rate: string;
  contact_person: string; phone: string; email: string;
  total_commissions: number; pending_commissions: number; is_active: boolean;
}

interface Commission {
  id: number; agent: number; agent_name: string; booking_ref: string;
  commission_date: string; booking_amount: string; commission_amount: string;
  status: string; paid_date: string | null;
}

const EMPTY_COMPANY = {
  company_code: '', company_name: '', contact_person: '', contact_birthday: '',
  contact_phone: '', office_phone: '', contact_email: '', billing_address: '',
  negotiated_discount_pct: '0', credit_limit: '0', status: 'ACTIVE', notes: '',
};

export default function CorporateManagement() {
  const [tab, setTab] = useState<'companies' | 'agents' | 'commissions'>('companies');
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);

  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [companyForm, setCompanyForm] = useState(EMPTY_COMPANY);

  const [showAgentForm, setShowAgentForm] = useState(false);
  const [editAgent, setEditAgent] = useState<Agent | null>(null);
  const [agentForm, setAgentForm] = useState({ name: '', agent_type: 'TA', commission_rate: '0', contact_person: '', phone: '', email: '', notes: '' });

  const [showCommissionForm, setShowCommissionForm] = useState(false);
  const [commissionForm, setCommissionForm] = useState({
    agentId: '', booking_ref: '', commission_date: new Date().toISOString().split('T')[0],
    booking_amount: '', commission_amount: '', notes: '', autoCalc: true,
  });

  const todayMD = new Date().toISOString().slice(5, 10);
  const birthdaysToday = companies.filter(c => c.contact_birthday?.slice(5) === todayMD);
  const pendingCommissions = commissions.filter(c => c.status === 'PENDING');
  const totalPending = pendingCommissions.reduce((s, c) => s + Number(c.commission_amount), 0);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [coRes, agRes, cmRes] = await Promise.all([
        api.get('/admin/corporate/accounts/'),
        api.get('/admin/corporate/agents/'),
        api.get('/admin/corporate/commissions/'),
      ]);
      setCompanies(coRes.data.results ?? coRes.data);
      setAgents(agRes.data.results ?? agRes.data);
      setCommissions(cmRes.data.results ?? cmRes.data);
    } catch {
      toast.error('Failed to load corporate CRM data');
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const saveCompany = async () => {
    if (!companyForm.company_name || !companyForm.company_code) {
      toast.error('Company code and name required');
      return;
    }
    const payload = {
      ...companyForm,
      contact_birthday: companyForm.contact_birthday || null,
      negotiated_discount_pct: companyForm.negotiated_discount_pct || 0,
      credit_limit: companyForm.credit_limit || 0,
    };
    try {
      if (editCompany) {
        await api.patch(`/admin/corporate/accounts/${editCompany.id}/`, payload);
        toast.success('Company updated');
      } else {
        await api.post('/admin/corporate/accounts/', payload);
        toast.success('Company created');
      }
      setShowCompanyForm(false); setEditCompany(null); setCompanyForm(EMPTY_COMPANY);
      loadAll();
    } catch (e: unknown) {
      const err = e as { response?: { data?: Record<string, string[]> } };
      const msg = err.response?.data ? Object.values(err.response.data).flat().join(' ') : 'Save failed';
      toast.error(msg);
    }
  };

  const openEditCompany = (c: Company) => {
    setEditCompany(c);
    setCompanyForm({
      company_code: c.company_code, company_name: c.company_name, contact_person: c.contact_person,
      contact_birthday: c.contact_birthday || '', contact_phone: c.contact_phone,
      office_phone: c.office_phone || '', contact_email: c.contact_email || '',
      billing_address: c.billing_address || '', negotiated_discount_pct: c.negotiated_discount_pct,
      credit_limit: c.credit_limit, status: c.status, notes: c.notes || '',
    });
    setShowCompanyForm(true);
  };

  const saveAgent = async () => {
    if (!agentForm.name) { toast.error('Agent name required'); return; }
    try {
      const payload = { ...agentForm, commission_rate: agentForm.commission_rate || 0, is_active: true };
      if (editAgent) {
        await api.patch(`/admin/corporate/agents/${editAgent.id}/`, payload);
        toast.success('Agent updated');
      } else {
        await api.post('/admin/corporate/agents/', payload);
        toast.success('Agent created');
      }
      setShowAgentForm(false); setEditAgent(null);
      setAgentForm({ name: '', agent_type: 'TA', commission_rate: '0', contact_person: '', phone: '', email: '', notes: '' });
      loadAll();
    } catch {
      toast.error('Agent save failed');
    }
  };

  const payCommission = async (id: number) => {
    try {
      await api.post(`/admin/corporate/commissions/${id}/mark-paid/`);
      toast.success('Commission marked paid');
      loadAll();
    } catch {
      toast.error('Failed to update commission');
    }
  };

  const calcCommissionFromRate = (agentId: string, bookingAmount: string) => {
    const agent = agents.find(a => String(a.id) === agentId);
    if (!agent || !bookingAmount) return '';
    const amt = Number(bookingAmount);
    if (Number.isNaN(amt)) return '';
    return String(Math.round(amt * Number(agent.commission_rate) / 100 * 100) / 100);
  };

  const updateCommissionForm = (patch: Partial<typeof commissionForm>) => {
    setCommissionForm(prev => {
      const next = { ...prev, ...patch };
      if (next.autoCalc && (patch.agentId !== undefined || patch.booking_amount !== undefined)) {
        next.commission_amount = calcCommissionFromRate(next.agentId, next.booking_amount);
      }
      return next;
    });
  };

  const saveCommission = async () => {
    if (!commissionForm.agentId || !commissionForm.booking_amount || !commissionForm.commission_amount) {
      toast.error('Agent, booking amount, and commission amount required');
      return;
    }
    try {
      await api.post('/admin/corporate/commissions/', {
        agent: Number(commissionForm.agentId),
        booking_ref: commissionForm.booking_ref,
        commission_date: commissionForm.commission_date,
        booking_amount: commissionForm.booking_amount,
        commission_amount: commissionForm.commission_amount,
        notes: commissionForm.notes,
        status: 'PENDING',
      });
      toast.success('Commission added');
      setShowCommissionForm(false);
      setCommissionForm({
        agentId: '', booking_ref: '', commission_date: new Date().toISOString().split('T')[0],
        booking_amount: '', commission_amount: '', notes: '', autoCalc: true,
      });
      loadAll();
    } catch (e: unknown) {
      const err = e as { response?: { data?: Record<string, string[]> } };
      const msg = err.response?.data ? Object.values(err.response.data).flat().join(' ') : 'Failed to add commission';
      toast.error(msg);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <MdBusiness className="text-teal-700" size={24} /> Corporate CRM
        </h1>
        <button type="button" onClick={loadAll} className="p-2 border border-gray-200 rounded-lg text-gray-500"><MdRefresh size={18} /></button>
      </div>

      {birthdaysToday.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-xs flex items-center gap-2">
          <MdCake className="text-yellow-600" size={14} />
          <span className="text-yellow-800 font-semibold">Birthday today: </span>
          {birthdaysToday.map(c => `${c.contact_person} (${c.company_name})`).join(', ')}
        </div>
      )}
      {pendingCommissions.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-2 text-xs text-orange-700 flex items-center gap-2">
          <MdAttachMoney size={14} /> {pendingCommissions.length} pending — ৳{totalPending.toLocaleString()}
        </div>
      )}

      <div className="flex gap-2">
        {[
          { key: 'companies', label: `Companies (${companies.length})`, icon: <MdPeople size={14} /> },
          { key: 'agents', label: `Agents (${agents.length})`, icon: <MdStar size={14} /> },
          { key: 'commissions', label: `Commissions (${pendingCommissions.length})`, icon: <MdAttachMoney size={14} /> },
        ].map(t => (
          <button key={t.key} type="button" onClick={() => setTab(t.key as typeof tab)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium ${tab === t.key ? 'bg-teal-700 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'companies' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button type="button" onClick={() => { setEditCompany(null); setCompanyForm(EMPTY_COMPANY); setShowCompanyForm(true); }}
              className="flex items-center gap-1.5 bg-teal-700 text-white px-4 py-2 rounded-lg text-xs font-medium">
              <MdAdd size={14} /> Add Company
            </button>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-[10px] text-gray-500 uppercase">
                  <th className="py-2 px-3 text-left">Code</th><th className="text-left">Company</th><th className="text-left">Contact</th>
                  <th className="text-left">Phone</th><th className="text-center">Discount</th><th className="text-right">Credit Limit</th><th className="text-center">Status</th><th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {companies.map(co => (
                  <tr key={co.id} className="border-t border-gray-100">
                    <td className="py-2 px-3 font-mono text-xs text-teal-700">{co.company_code}</td>
                    <td>
                      <div className="font-semibold text-slate-800">{co.company_name}</div>
                      {co.notes && <div className="text-[10px] text-gray-500">{co.notes}</div>}
                    </td>
                    <td className="text-gray-600">
                      {co.contact_person}
                      {co.contact_birthday?.slice(5) === todayMD && <MdCake className="inline ml-1 text-yellow-500" size={12} />}
                    </td>
                    <td className="text-gray-500 text-xs font-mono">{co.contact_phone}</td>
                    <td className="text-center text-green-600 font-bold">{co.negotiated_discount_pct}%</td>
                    <td className="text-right font-mono">৳{Number(co.credit_limit).toLocaleString()}</td>
                    <td className="text-center"><span className={`text-[10px] px-2 py-0.5 rounded ${co.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{co.status}</span></td>
                    <td className="text-center">
                      <button type="button" onClick={() => openEditCompany(co)} className="text-teal-700 text-xs inline-flex items-center gap-0.5"><MdEdit size={12} /> Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {companies.length === 0 && <p className="p-6 text-center text-gray-500 text-sm">No accounts — run <code className="bg-gray-100 px-1 rounded">seed_corporate</code> or add manually.</p>}
          </div>
        </div>
      )}

      {tab === 'agents' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button type="button" onClick={() => { setEditAgent(null); setShowAgentForm(true); }}
              className="flex items-center gap-1.5 bg-teal-700 text-white px-4 py-2 rounded-lg text-xs font-medium">
              <MdAdd size={14} /> Add Agent
            </button>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-[10px] text-gray-500 uppercase">
                  <th className="py-2 px-3 text-left">Agent</th><th className="text-center">Type</th><th className="text-center">Rate</th>
                  <th className="text-right">Total Comm.</th><th className="text-right">Pending</th><th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {agents.map(a => (
                  <tr key={a.id} className="border-t border-gray-100">
                    <td className="py-2 px-3">
                      <div className="font-semibold">{a.name}</div>
                      <div className="text-[10px] text-gray-500">{a.email}</div>
                    </td>
                    <td className="text-center"><span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{a.agent_type}</span></td>
                    <td className="text-center font-bold text-green-600">{a.commission_rate}%</td>
                    <td className="text-right font-mono">৳{a.total_commissions.toLocaleString()}</td>
                    <td className="text-right font-mono text-amber-600">৳{a.pending_commissions.toLocaleString()}</td>
                    <td className="text-center">
                      <button type="button" onClick={() => { setEditAgent(a); setAgentForm({ name: a.name, agent_type: a.agent_type, commission_rate: a.commission_rate, contact_person: a.contact_person, phone: a.phone, email: a.email, notes: '' }); setShowAgentForm(true); }}
                        className="text-teal-700 text-xs"><MdEdit size={12} /> Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'commissions' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button type="button" onClick={() => setShowCommissionForm(true)}
              className="flex items-center gap-1.5 bg-teal-700 text-white px-4 py-2 rounded-lg text-xs font-medium">
              <MdAdd size={14} /> Add Commission
            </button>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-[10px] text-gray-500 uppercase">
                  <th className="py-2 px-3 text-left">Date</th><th className="text-left">Agent</th><th className="text-left">Ref</th>
                  <th className="text-right">Booking</th><th className="text-right">Commission</th><th className="text-center">Status</th><th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map(cm => (
                  <tr key={cm.id} className="border-t border-gray-100">
                    <td className="py-2 px-3 text-xs text-gray-500">{cm.commission_date}</td>
                    <td>{cm.agent_name}</td>
                    <td className="font-mono text-xs text-teal-700">{cm.booking_ref || '—'}</td>
                    <td className="text-right">৳{Number(cm.booking_amount).toLocaleString()}</td>
                    <td className="text-right font-bold text-amber-600">৳{Number(cm.commission_amount).toLocaleString()}</td>
                    <td className="text-center">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${cm.status === 'PENDING' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>{cm.status}</span>
                    </td>
                    <td className="text-center">
                      {cm.status === 'PENDING' ? (
                        <button type="button" onClick={() => payCommission(cm.id)} className="text-green-700 text-[10px] inline-flex items-center gap-0.5">
                          <MdCheckCircle size={12} /> Mark Paid
                        </button>
                      ) : <span className="text-gray-400 text-[10px]">{cm.paid_date}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {commissions.length === 0 && (
              <p className="p-6 text-center text-gray-500 text-sm">No commissions yet — click <strong>Add Commission</strong> above.</p>
            )}
          </div>
        </div>
      )}

      {showCommissionForm && (
        <Modal title="Add Commission" onClose={() => setShowCommissionForm(false)}>
          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-gray-500">Travel Agent *</label>
              <select value={commissionForm.agentId} onChange={e => updateCommissionForm({ agentId: e.target.value })}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="">— Select agent —</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.commission_rate}%)</option>
                ))}
              </select>
              {agents.length === 0 && (
                <p className="text-xs text-amber-700 mt-1">প্রথমে Agents ট্যাবে agent যোগ করুন।</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Booking Ref" value={commissionForm.booking_ref} onChange={v => updateCommissionForm({ booking_ref: v })} />
              <FormField label="Commission Date *" value={commissionForm.commission_date} onChange={v => updateCommissionForm({ commission_date: v })} type="date" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Booking Amount (৳) *" value={commissionForm.booking_amount} onChange={v => updateCommissionForm({ booking_amount: v })} type="number" />
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-gray-500">Commission (৳) *</label>
                  <label className="text-[10px] text-teal-700 flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={commissionForm.autoCalc} onChange={e => updateCommissionForm({ autoCalc: e.target.checked })} className="rounded" />
                    Auto from rate
                  </label>
                </div>
                <input type="number" value={commissionForm.commission_amount}
                  onChange={e => setCommissionForm(p => ({ ...p, commission_amount: e.target.value, autoCalc: false }))}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            {commissionForm.agentId && commissionForm.booking_amount && commissionForm.autoCalc && (
              <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                Agent rate অনুযায়ী: ৳{Number(commissionForm.booking_amount).toLocaleString()} × {agents.find(a => String(a.id) === commissionForm.agentId)?.commission_rate}% ={' '}
                <strong className="text-amber-700">৳{commissionForm.commission_amount}</strong>
              </p>
            )}
            <FormField label="Notes" value={commissionForm.notes} onChange={v => updateCommissionForm({ notes: v })} />
          </div>
          <div className="flex gap-2 mt-4">
            <button type="button" onClick={() => setShowCommissionForm(false)} className="flex-1 border rounded-lg py-2 text-sm">Cancel</button>
            <button type="button" onClick={saveCommission} className="flex-[2] bg-teal-700 text-white rounded-lg py-2 text-sm font-bold">Save Commission</button>
          </div>
        </Modal>
      )}

      {showCompanyForm && (
        <Modal title={editCompany ? 'Edit Company' : 'Add Company'} onClose={() => { setShowCompanyForm(false); setEditCompany(null); }}>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Company Code *" value={companyForm.company_code} onChange={v => setCompanyForm(p => ({ ...p, company_code: v }))} />
            <FormField label="Company Name *" value={companyForm.company_name} onChange={v => setCompanyForm(p => ({ ...p, company_name: v }))} />
            <FormField label="Contact Person" value={companyForm.contact_person} onChange={v => setCompanyForm(p => ({ ...p, contact_person: v }))} />
            <FormField label="Birthday" value={companyForm.contact_birthday} onChange={v => setCompanyForm(p => ({ ...p, contact_birthday: v }))} type="date" />
            <FormField label="Phone *" value={companyForm.contact_phone} onChange={v => setCompanyForm(p => ({ ...p, contact_phone: v }))} />
            <FormField label="Office Phone" value={companyForm.office_phone} onChange={v => setCompanyForm(p => ({ ...p, office_phone: v }))} />
            <FormField label="Email" value={companyForm.contact_email} onChange={v => setCompanyForm(p => ({ ...p, contact_email: v }))} />
            <FormField label="Discount %" value={companyForm.negotiated_discount_pct} onChange={v => setCompanyForm(p => ({ ...p, negotiated_discount_pct: v }))} type="number" />
            <FormField label="Credit Limit ৳" value={companyForm.credit_limit} onChange={v => setCompanyForm(p => ({ ...p, credit_limit: v }))} type="number" />
            <div>
              <label className="text-[11px] text-gray-500">Status</label>
              <select value={companyForm.status} onChange={e => setCompanyForm(p => ({ ...p, status: e.target.value }))}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option><option value="INACTIVE">Inactive</option>
              </select>
            </div>
            <div className="col-span-2"><FormField label="Notes" value={companyForm.notes} onChange={v => setCompanyForm(p => ({ ...p, notes: v }))} /></div>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="button" onClick={() => { setShowCompanyForm(false); setEditCompany(null); }} className="flex-1 border rounded-lg py-2 text-sm">Cancel</button>
            <button type="button" onClick={saveCompany} className="flex-[2] bg-teal-700 text-white rounded-lg py-2 text-sm font-bold">Save</button>
          </div>
        </Modal>
      )}

      {showAgentForm && (
        <Modal title={editAgent ? 'Edit Agent' : 'Add Agent'} onClose={() => setShowAgentForm(false)}>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Name *" value={agentForm.name} onChange={v => setAgentForm(p => ({ ...p, name: v }))} />
            <div>
              <label className="text-[11px] text-gray-500">Type</label>
              <select value={agentForm.agent_type} onChange={e => setAgentForm(p => ({ ...p, agent_type: e.target.value }))}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="OTA">OTA</option><option value="TA">Travel Agent</option><option value="CORPORATE">Corporate</option><option value="WALK_IN">Walk-in</option>
              </select>
            </div>
            <FormField label="Commission %" value={agentForm.commission_rate} onChange={v => setAgentForm(p => ({ ...p, commission_rate: v }))} type="number" />
            <FormField label="Contact" value={agentForm.contact_person} onChange={v => setAgentForm(p => ({ ...p, contact_person: v }))} />
            <FormField label="Phone" value={agentForm.phone} onChange={v => setAgentForm(p => ({ ...p, phone: v }))} />
            <FormField label="Email" value={agentForm.email} onChange={v => setAgentForm(p => ({ ...p, email: v }))} />
          </div>
          <div className="flex gap-2 mt-4">
            <button type="button" onClick={() => setShowAgentForm(false)} className="flex-1 border rounded-lg py-2 text-sm">Cancel</button>
            <button type="button" onClick={saveAgent} className="flex-[2] bg-teal-700 text-white rounded-lg py-2 text-sm font-bold">Save</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-auto p-6">
        <div className="flex justify-between mb-4">
          <h3 className="font-bold text-lg">{title}</h3>
          <button type="button" onClick={onClose} className="text-gray-500"><MdClose size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormField({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-[11px] text-gray-500">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
    </div>
  );
}
