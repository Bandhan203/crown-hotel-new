import { useState } from 'react';
import { MdBusiness, MdAdd, MdEdit, MdStar, MdAttachMoney, MdPeople, MdCake, MdCheckCircle, MdClose } from 'react-icons/md';
import toast from 'react-hot-toast';

// ─── Types ───
interface Company { id: string; name: string; contactPerson: string; contactPersonBirthday?: string; personalPhone: string; officePhone?: string; email?: string; address?: string; discountRate: number; creditLimit: number; notes?: string; createdAt: string; }
interface Agent { id: string; name: string; type: 'OTA' | 'TA' | 'Corporate' | 'Walk-in'; commissionRate: number; contactPerson?: string; phone?: string; email?: string; totalBookings: number; totalCommission: number; createdAt: string; }
interface CommissionEntry { id: string; agentId: string; folioId: string; date: string; amount: number; commissionAmount: number; status: 'pending' | 'paid'; paidDate?: string; }

const SEED_COMPANIES: Company[] = [
  { id: 'c001', name: 'Grameenphone Ltd.', contactPerson: 'Tanvir Ahmed', contactPersonBirthday: '1985-03-15', personalPhone: '01711900001', officePhone: '09600000001', email: 'tanvir@gp.com.bd', address: 'GP House, Bashundhara, Dhaka', discountRate: 15, creditLimit: 500000, notes: 'Corporate account. Monthly invoice.', createdAt: '2024-01-01T00:00:00Z' },
  { id: 'c002', name: 'BRAC', contactPerson: 'Nasrin Sultana', contactPersonBirthday: '1979-07-22', personalPhone: '01711900002', officePhone: '02-8824180', email: 'nasrin@brac.net', address: 'BRAC Centre, Mohakhali, Dhaka', discountRate: 10, creditLimit: 300000, notes: 'NGO rate. Tax exemption applicable.', createdAt: '2024-01-15T00:00:00Z' },
  { id: 'c003', name: 'Square Group', contactPerson: 'Rahim Chowdhury', personalPhone: '01711900003', discountRate: 20, creditLimit: 1000000, createdAt: '2024-02-01T00:00:00Z' },
];

const SEED_AGENTS: Agent[] = [
  { id: 'a001', name: 'Booking.com', type: 'OTA', commissionRate: 15, contactPerson: 'Online Portal', email: 'partner@booking.com', totalBookings: 24, totalCommission: 48000, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'a002', name: 'Expedia', type: 'OTA', commissionRate: 12, contactPerson: 'Online Portal', email: 'partner@expedia.com', totalBookings: 12, totalCommission: 22000, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'a003', name: 'Cox Travel Agency', type: 'TA', commissionRate: 8, contactPerson: 'Kabir Hassan', phone: '01811000001', totalBookings: 18, totalCommission: 15000, createdAt: '2024-02-01T00:00:00Z' },
];

const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
const todayStr = new Date().toISOString().split('T')[0];

const SEED_COMMISSIONS: CommissionEntry[] = [
  { id: 'cm001', agentId: 'a001', folioId: 'f002', date: yesterday, amount: 15000, commissionAmount: 2250, status: 'pending' },
  { id: 'cm002', agentId: 'a002', folioId: 'f005', date: yesterday, amount: 8000, commissionAmount: 960, status: 'pending' },
  { id: 'cm003', agentId: 'a001', folioId: 'f012', date: yesterday, amount: 8000, commissionAmount: 1200, status: 'paid', paidDate: todayStr },
];

function usePMSStorage<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
  const [val, setVal] = useState<T>(() => { try { const item = localStorage.getItem(key); return item ? JSON.parse(item) : initial; } catch { return initial; } });
  const setter = (value: T | ((p: T) => T)) => { try { const v = value instanceof Function ? value(val) : value; setVal(v); localStorage.setItem(key, JSON.stringify(v)); } catch (e) { console.error(e); } };
  return [val, setter];
}
function genId(prefix = 'id') { return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`; }

export default function CorporateManagement() {
  const [companies, setCompanies] = usePMSStorage<Company[]>('pms_companies', SEED_COMPANIES);
  const [agents, setAgents] = usePMSStorage<Agent[]>('pms_agents', SEED_AGENTS);
  const [commissions, setCommissions] = usePMSStorage<CommissionEntry[]>('pms_commissions', SEED_COMMISSIONS);
  const [tab, setTab] = useState<'companies' | 'agents' | 'commissions'>('companies');
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [companyForm, setCompanyForm] = useState({ name: '', contactPerson: '', contactPersonBirthday: '', personalPhone: '', officePhone: '', email: '', address: '', discountRate: '', creditLimit: '', notes: '' });

  const todayMD = todayStr.slice(5);
  const birthdaysToday = companies.filter(c => c.contactPersonBirthday?.slice(5) === todayMD);
  const pendingCommissions = commissions.filter(c => c.status === 'pending');
  const totalPending = pendingCommissions.reduce((s, c) => s + c.commissionAmount, 0);

  const saveCompany = () => {
    if (!companyForm.name || !companyForm.personalPhone) { toast.error('Company name and phone required'); return; }
    if (editCompany) {
      setCompanies(prev => prev.map(c => c.id === editCompany.id ? { ...c, ...companyForm, discountRate: Number(companyForm.discountRate), creditLimit: Number(companyForm.creditLimit) } : c));
      toast.success('Company updated');
    } else {
      setCompanies(prev => [...prev, { id: genId('co'), ...companyForm, discountRate: Number(companyForm.discountRate) || 0, creditLimit: Number(companyForm.creditLimit) || 0, createdAt: new Date().toISOString() }]);
      toast.success('Company added');
    }
    setShowCompanyForm(false); setEditCompany(null);
    setCompanyForm({ name: '', contactPerson: '', contactPersonBirthday: '', personalPhone: '', officePhone: '', email: '', address: '', discountRate: '', creditLimit: '', notes: '' });
  };

  const openEditCompany = (c: Company) => {
    setEditCompany(c);
    setCompanyForm({ name: c.name, contactPerson: c.contactPerson, contactPersonBirthday: c.contactPersonBirthday || '', personalPhone: c.personalPhone, officePhone: c.officePhone || '', email: c.email || '', address: c.address || '', discountRate: String(c.discountRate), creditLimit: String(c.creditLimit), notes: c.notes || '' });
    setShowCompanyForm(true);
  };

  const payCommission = (id: string) => {
    setCommissions(prev => prev.map(c => c.id === id ? { ...c, status: 'paid' as const, paidDate: todayStr } : c));
    toast.success('Commission marked as paid');
  };

  const tabs = [
    { key: 'companies', label: `Companies (${companies.length})`, icon: <MdPeople size={14} /> },
    { key: 'agents', label: `Agents (${agents.length})`, icon: <MdStar size={14} /> },
    { key: 'commissions', label: `Commissions (${pendingCommissions.length} pending)`, icon: <MdAttachMoney size={14} /> },
  ];

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <MdBusiness className="text-[#aa8453]" size={24} /> Corporate CRM
        </h1>
      </div>

      {/* Alerts */}
      {birthdaysToday.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-2.5 flex items-center gap-2 text-xs">
          <MdCake size={14} className="text-yellow-400" />
          <span className="text-yellow-400 font-semibold">Birthday Today: </span>
          <span className="text-white">{birthdaysToday.map(c => `${c.contactPerson} (${c.name})`).join(', ')}</span>
        </div>
      )}
      {pendingCommissions.length > 0 && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg px-4 py-2.5 flex items-center gap-2 text-xs">
          <MdAttachMoney size={14} className="text-orange-400" />
          <span className="text-orange-400 font-semibold">{pendingCommissions.length} Pending Commissions — ৳{totalPending.toLocaleString()}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition ${tab === t.key ? 'bg-[#aa8453] text-white' : 'bg-[#1a1a1a] text-gray-400 border border-white/10 hover:border-white/20'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* COMPANIES */}
      {tab === 'companies' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setShowCompanyForm(true)} className="flex items-center gap-1.5 bg-[#aa8453] text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-[#8c6c44] transition">
              <MdAdd size={14} /> Add Company
            </button>
          </div>
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden">
            <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_0.8fr_80px] px-4 py-2.5 bg-white/5 text-[10px] text-gray-500 uppercase tracking-wider gap-3">
              <span>Company</span><span>Contact Person</span><span>Phone</span><span>Discount</span><span>Credit Limit</span><span>Action</span>
            </div>
            {companies.map((co, i) => {
              const isBirthday = co.contactPersonBirthday?.slice(5) === todayMD;
              return (
                <div key={co.id} className={`grid grid-cols-[2fr_1.5fr_1fr_1fr_0.8fr_80px] px-4 py-2.5 border-t border-white/5 gap-3 items-center text-xs ${i % 2 === 1 ? 'bg-white/[0.02]' : ''}`}>
                  <div>
                    <div className="text-white font-semibold">{co.name}</div>
                    {co.notes && <div className="text-[10px] text-gray-500">{co.notes}</div>}
                  </div>
                  <div>
                    <div className="text-gray-400 flex items-center gap-1">
                      {isBirthday && <MdCake size={10} className="text-yellow-400" />}
                      {co.contactPerson}
                    </div>
                    {co.contactPersonBirthday && <div className="text-[10px] text-gray-500">🎂 {co.contactPersonBirthday}</div>}
                  </div>
                  <span className="text-gray-400 font-mono text-[11px]">{co.personalPhone}</span>
                  <span className="text-green-400 font-bold">{co.discountRate}% off</span>
                  <span className="text-white font-mono text-[11px]">৳{co.creditLimit.toLocaleString()}</span>
                  <button onClick={() => openEditCompany(co)} className="flex items-center gap-1 bg-[#aa8453]/20 text-[#aa8453] rounded px-2 py-1 text-[10px] hover:bg-[#aa8453]/30 transition">
                    <MdEdit size={10} /> Edit
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AGENTS */}
      {tab === 'agents' && (
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] px-4 py-2.5 bg-white/5 text-[10px] text-gray-500 uppercase tracking-wider gap-3">
            <span>Agent</span><span>Type</span><span>Commission Rate</span><span>Total Bookings</span><span>Total Commission</span>
          </div>
          {agents.map((a, i) => (
            <div key={a.id} className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr] px-4 py-2.5 border-t border-white/5 gap-3 items-center text-xs ${i % 2 === 1 ? 'bg-white/[0.02]' : ''}`}>
              <div>
                <div className="text-white font-semibold">{a.name}</div>
                <div className="text-[10px] text-gray-500">{a.email}</div>
              </div>
              <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded w-fit">{a.type}</span>
              <span className="text-green-400 font-bold">{a.commissionRate}%</span>
              <span className="text-white font-mono">{a.totalBookings}</span>
              <span className="text-yellow-400 font-mono font-bold">৳{a.totalCommission.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {/* COMMISSIONS */}
      {tab === 'commissions' && (
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden">
          <div className="grid grid-cols-[1fr_1.5fr_1fr_1fr_1fr_100px] px-4 py-2.5 bg-white/5 text-[10px] text-gray-500 uppercase tracking-wider gap-3">
            <span>Date</span><span>Agent</span><span>Booking Amt</span><span>Commission</span><span>Status</span><span>Action</span>
          </div>
          {commissions.slice().reverse().map((cm, i) => {
            const agent = agents.find(a => a.id === cm.agentId);
            return (
              <div key={cm.id} className={`grid grid-cols-[1fr_1.5fr_1fr_1fr_1fr_100px] px-4 py-2.5 border-t border-white/5 gap-3 items-center text-xs ${i % 2 === 1 ? 'bg-white/[0.02]' : ''}`}>
                <span className="text-gray-500">{cm.date}</span>
                <span className="text-white">{agent?.name || '—'}</span>
                <span className="text-white font-mono">৳{cm.amount.toLocaleString()}</span>
                <span className="text-yellow-400 font-mono font-bold">৳{cm.commissionAmount.toLocaleString()}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded w-fit font-semibold ${cm.status === 'pending' ? 'bg-orange-500/10 text-orange-400' : 'bg-green-500/10 text-green-400'}`}>
                  {cm.status === 'pending' ? 'Pending' : `Paid ${cm.paidDate}`}
                </span>
                {cm.status === 'pending' ? (
                  <button onClick={() => payCommission(cm.id)} className="bg-green-500/10 text-green-400 border border-green-500/30 rounded px-2 py-1 text-[10px] flex items-center gap-1 hover:bg-green-500/20 transition">
                    <MdCheckCircle size={10} /> Mark Paid
                  </button>
                ) : (
                  <span className="text-gray-600 text-[10px]">✓ Settled</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Company Form Modal */}
      {showCompanyForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl w-[540px] max-h-[90vh] overflow-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg">{editCompany ? 'Edit Company' : 'Add Company'}</h3>
              <button onClick={() => { setShowCompanyForm(false); setEditCompany(null); }} className="text-gray-500 hover:text-white transition"><MdClose size={18} /></button>
            </div>
            <div className="space-y-3">
              <FormField label="Company Name *" value={companyForm.name} onChange={v => setCompanyForm(p => ({ ...p, name: v }))} />
              <div className="flex gap-3">
                <FormField label="Contact Person" value={companyForm.contactPerson} onChange={v => setCompanyForm(p => ({ ...p, contactPerson: v }))} />
                <FormField label="Birthday" value={companyForm.contactPersonBirthday} onChange={v => setCompanyForm(p => ({ ...p, contactPersonBirthday: v }))} type="date" />
              </div>
              <div className="flex gap-3">
                <FormField label="Personal Phone *" value={companyForm.personalPhone} onChange={v => setCompanyForm(p => ({ ...p, personalPhone: v }))} />
                <FormField label="Office Phone" value={companyForm.officePhone} onChange={v => setCompanyForm(p => ({ ...p, officePhone: v }))} />
              </div>
              <div className="flex gap-3">
                <FormField label="Email" value={companyForm.email} onChange={v => setCompanyForm(p => ({ ...p, email: v }))} />
                <FormField label="Discount Rate (%)" value={companyForm.discountRate} onChange={v => setCompanyForm(p => ({ ...p, discountRate: v }))} type="number" />
              </div>
              <FormField label="Credit Limit (৳)" value={companyForm.creditLimit} onChange={v => setCompanyForm(p => ({ ...p, creditLimit: v }))} type="number" />
              <FormField label="Address" value={companyForm.address} onChange={v => setCompanyForm(p => ({ ...p, address: v }))} />
              <FormField label="Notes" value={companyForm.notes} onChange={v => setCompanyForm(p => ({ ...p, notes: v }))} />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setShowCompanyForm(false); setEditCompany(null); }} className="flex-1 bg-white/10 text-gray-400 rounded-lg py-2.5 text-sm hover:bg-white/15 transition">Cancel</button>
              <button onClick={saveCompany} className="flex-[2] bg-[#aa8453] text-white rounded-lg py-2.5 text-sm font-bold hover:bg-[#8c6c44] transition">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormField({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string; }) {
  return (
    <div className="flex-1">
      <label className="text-[11px] text-gray-500 block mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-[#0f0f0f] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#aa8453]/30" />
    </div>
  );
}
