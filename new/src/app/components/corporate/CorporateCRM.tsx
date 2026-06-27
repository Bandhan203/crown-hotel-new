import { useState } from 'react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useHotel } from '../../contexts/HotelContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLang } from '../../contexts/LanguageContext';
import type { Company, Agent, CommissionEntry } from '../../data/extendedTypes';
import { initialCompanies, initialAgents, initialCommissions } from '../../data/mockData';
import { Building2, Plus, Star, DollarSign, Users, Gift, CheckCircle, Pencil } from 'lucide-react';
import { toast } from 'sonner';

export function CorporateCRM() {
  const { config, generateId } = useHotel();
  const { colors, theme } = useTheme();
  const { t } = useLang();
  const [companies, setCompanies] = useLocalStorage<Company[]>('hotel_companies', initialCompanies);
  const [agents, setAgents] = useLocalStorage<Agent[]>('hotel_agents', initialAgents);
  const [commissions, setCommissions] = useLocalStorage<CommissionEntry[]>('hotel_commissions', initialCommissions);
  const [tab, setTab] = useState<'companies' | 'agents' | 'commissions'>('companies');
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [companyForm, setCompanyForm] = useState({ name: '', contactPerson: '', contactPersonBirthday: '', personalPhone: '', officePhone: '', email: '', address: '', discountRate: '', creditLimit: '', notes: '' });

  const today = config.systemDate;
  const todayMD = today.slice(5); // MM-DD

  // Birthdays today
  const birthdaysToday = companies.filter(c => c.contactPersonBirthday?.slice(5) === todayMD);

  const pendingCommissions = commissions.filter(c => c.status === 'pending');
  const totalPending = pendingCommissions.reduce((s, c) => s + c.commissionAmount, 0);

  const saveCompany = () => {
    if (!companyForm.name || !companyForm.personalPhone) { toast.error('Company name and phone required'); return; }
    if (editCompany) {
      setCompanies(prev => prev.map(c => c.id === editCompany.id ? { ...c, ...companyForm, discountRate: Number(companyForm.discountRate), creditLimit: Number(companyForm.creditLimit) } : c));
      toast.success('Company updated.');
    } else {
      setCompanies(prev => [...prev, { id: generateId('co'), ...companyForm, discountRate: Number(companyForm.discountRate) || 0, creditLimit: Number(companyForm.creditLimit) || 0, totalBookings: 0, createdAt: new Date().toISOString() }]);
      toast.success('Company added.');
    }
    setShowCompanyForm(false);
    setEditCompany(null);
    setCompanyForm({ name: '', contactPerson: '', contactPersonBirthday: '', personalPhone: '', officePhone: '', email: '', address: '', discountRate: '', creditLimit: '', notes: '' });
  };

  const payCommission = (id: string) => {
    setCommissions(prev => prev.map(c => c.id === id ? { ...c, status: 'paid', paidDate: today } : c));
    setAgents(prev => prev.map(a => {
      const cm = commissions.find(c => c.id === id);
      if (!cm || a.id !== cm.agentId) return a;
      return { ...a, totalCommission: a.totalCommission + cm.commissionAmount };
    }));
    toast.success('Commission marked as paid.');
  };

  const openEditCompany = (c: Company) => {
    setEditCompany(c);
    setCompanyForm({ name: c.name, contactPerson: c.contactPerson, contactPersonBirthday: c.contactPersonBirthday || '', personalPhone: c.personalPhone, officePhone: c.officePhone || '', email: c.email || '', address: c.address || '', discountRate: String(c.discountRate), creditLimit: String(c.creditLimit), notes: c.notes || '' });
    setShowCompanyForm(true);
  };

  const tabStyle = (active: boolean) => ({
    background: active ? colors.primary : colors.bgCard,
    color: active ? '#fff' : colors.textSecondary,
    border: `1px solid ${active ? colors.primary : colors.border}`,
    borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 12,
  });

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Building2 size={18} color={colors.primary} />
        <h2 style={{ margin: 0, color: colors.text, flex: 1, fontSize: 17 }}>{t('corporateCRM')}</h2>
      </div>

      {/* Alerts */}
      {birthdaysToday.length > 0 && (
        <div style={{ background: colors.warningBg, border: `1px solid ${colors.warning}44`, borderRadius: 8, padding: '10px 14px', marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
          <Gift size={14} color={colors.warning} />
          <span style={{ color: colors.warning, fontWeight: 600 }}>Birthday Today: </span>
          <span style={{ color: colors.text }}>{birthdaysToday.map(c => `${c.contactPerson} (${c.name})`).join(', ')}</span>
        </div>
      )}
      {pendingCommissions.length > 0 && (
        <div style={{ background: colors.orangeBg, border: `1px solid ${colors.orange}44`, borderRadius: 8, padding: '10px 14px', marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
          <DollarSign size={14} color={colors.orange} />
          <span style={{ color: colors.orange, fontWeight: 600 }}>{pendingCommissions.length} Pending Commissions — ৳{totalPending.toLocaleString()}</span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        <button onClick={() => setTab('companies')} style={tabStyle(tab === 'companies')}>
          <Users size={12} style={{ marginRight: 4 }} />Companies ({companies.length})
        </button>
        <button onClick={() => setTab('agents')} style={tabStyle(tab === 'agents')}>
          <Star size={12} style={{ marginRight: 4 }} />Agents ({agents.length})
        </button>
        <button onClick={() => setTab('commissions')} style={tabStyle(tab === 'commissions')}>
          <DollarSign size={12} style={{ marginRight: 4 }} />Commission ({pendingCommissions.length} pending)
        </button>
      </div>

      {/* COMPANIES */}
      {tab === 'companies' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
            <button onClick={() => setShowCompanyForm(true)} style={{ background: colors.primary, color: '#fff', border: 'none', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontSize: 12, display: 'flex', gap: 5, alignItems: 'center' }}>
              <Plus size={12} /> Add Company
            </button>
          </div>
          <div style={{ background: colors.bgCard, borderRadius: 10, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 0.8fr 80px', padding: '9px 14px', background: colors.bgSecondary, fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, gap: 8 }}>
              <span>Company</span><span>Contact Person</span><span>Phone</span><span>Discount</span><span>Credit Limit</span><span>Action</span>
            </div>
            {companies.map((co, i) => {
              const isBirthday = co.contactPersonBirthday?.slice(5) === todayMD;
              return (
                <div key={co.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 0.8fr 80px', padding: '10px 14px', borderTop: `1px solid ${colors.borderLight}`, gap: 8, alignItems: 'center', fontSize: 12, background: i % 2 === 0 ? 'transparent' : colors.tableAlt }}>
                  <div>
                    <div style={{ color: colors.text, fontWeight: 600 }}>{co.name}</div>
                    {co.notes && <div style={{ fontSize: 10, color: colors.textMuted }}>{co.notes}</div>}
                  </div>
                  <div>
                    <div style={{ color: colors.textSecondary, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {isBirthday && <Gift size={10} color={colors.warning} />}
                      {co.contactPerson}
                    </div>
                    {co.contactPersonBirthday && <div style={{ fontSize: 10, color: colors.textMuted }}>🎂 {co.contactPersonBirthday}</div>}
                  </div>
                  <span style={{ color: colors.textSecondary, fontFamily: 'monospace', fontSize: 11 }}>{co.personalPhone}</span>
                  <span style={{ color: colors.success, fontWeight: 700 }}>{co.discountRate}% off</span>
                  <span style={{ color: colors.text, fontFamily: 'monospace', fontSize: 11 }}>৳{co.creditLimit.toLocaleString()}</span>
                  <button onClick={() => openEditCompany(co)} style={{ background: colors.primaryBg, color: colors.primary, border: 'none', borderRadius: 5, padding: '4px 8px', cursor: 'pointer', fontSize: 10, display: 'flex', gap: 3, alignItems: 'center' }}>
                    <Pencil size={10} /> Edit
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AGENTS */}
      {tab === 'agents' && (
        <div style={{ background: colors.bgCard, borderRadius: 10, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '9px 14px', background: colors.bgSecondary, fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, gap: 8 }}>
            <span>Agent</span><span>Type</span><span>Commission Rate</span><span>Total Bookings</span><span>Total Commission</span>
          </div>
          {agents.map((a, i) => (
            <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '10px 14px', borderTop: `1px solid ${colors.borderLight}`, gap: 8, alignItems: 'center', fontSize: 12, background: i % 2 === 0 ? 'transparent' : colors.tableAlt }}>
              <div>
                <div style={{ color: colors.text, fontWeight: 600 }}>{a.name}</div>
                <div style={{ fontSize: 10, color: colors.textMuted }}>{a.email}</div>
              </div>
              <span style={{ fontSize: 10, background: colors.primaryBg, color: colors.primary, padding: '2px 8px', borderRadius: 4 }}>{a.type}</span>
              <span style={{ color: colors.success, fontWeight: 700 }}>{a.commissionRate}%</span>
              <span style={{ color: colors.text, fontFamily: 'monospace' }}>{a.totalBookings}</span>
              <span style={{ color: colors.warning, fontFamily: 'monospace', fontWeight: 700 }}>৳{a.totalCommission.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {/* COMMISSIONS */}
      {tab === 'commissions' && (
        <div style={{ background: colors.bgCard, borderRadius: 10, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr 1fr 1fr 100px', padding: '9px 14px', background: colors.bgSecondary, fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, gap: 8 }}>
            <span>Date</span><span>Agent</span><span>Booking Amount</span><span>Commission</span><span>Status</span><span>Action</span>
          </div>
          {commissions.slice().reverse().map((cm, i) => {
            const agent = agents.find(a => a.id === cm.agentId);
            return (
              <div key={cm.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr 1fr 1fr 100px', padding: '10px 14px', borderTop: `1px solid ${colors.borderLight}`, gap: 8, alignItems: 'center', fontSize: 12, background: i % 2 === 0 ? 'transparent' : colors.tableAlt }}>
                <span style={{ color: colors.textMuted }}>{cm.date}</span>
                <span style={{ color: colors.text }}>{agent?.name || '—'}</span>
                <span style={{ color: colors.text, fontFamily: 'monospace' }}>৳{cm.amount.toLocaleString()}</span>
                <span style={{ color: colors.warning, fontFamily: 'monospace', fontWeight: 700 }}>৳{cm.commissionAmount.toLocaleString()}</span>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: cm.status === 'pending' ? colors.orangeBg : colors.successBg, color: cm.status === 'pending' ? colors.orange : colors.success, fontWeight: 600 }}>
                  {cm.status === 'pending' ? 'Pending' : `Paid ${cm.paidDate}`}
                </span>
                {cm.status === 'pending' ? (
                  <button onClick={() => payCommission(cm.id)} style={{ background: colors.successBg, color: colors.success, border: `1px solid ${colors.success}44`, borderRadius: 5, padding: '4px 8px', cursor: 'pointer', fontSize: 10, display: 'flex', gap: 3, alignItems: 'center' }}>
                    <CheckCircle size={10} /> Mark Paid
                  </button>
                ) : (
                  <span style={{ fontSize: 10, color: colors.textMuted }}>✓ Settled</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Company Form Modal */}
      {showCompanyForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: 12, width: 540, maxHeight: '90vh', overflow: 'auto', padding: 24, boxShadow: colors.shadow }}>
            <h3 style={{ margin: '0 0 16px', color: colors.text }}>{editCompany ? 'Edit Company' : 'Add Company'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <CF label="Company Name *" value={companyForm.name} onChange={v => setCompanyForm(p => ({ ...p, name: v }))} colors={colors} />
              <div style={{ display: 'flex', gap: 10 }}>
                <CF label="Contact Person" value={companyForm.contactPerson} onChange={v => setCompanyForm(p => ({ ...p, contactPerson: v }))} colors={colors} />
                <CF label="Birthday" value={companyForm.contactPersonBirthday} onChange={v => setCompanyForm(p => ({ ...p, contactPersonBirthday: v }))} type="date" colors={colors} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <CF label="Personal Phone *" value={companyForm.personalPhone} onChange={v => setCompanyForm(p => ({ ...p, personalPhone: v }))} colors={colors} />
                <CF label="Office Phone" value={companyForm.officePhone} onChange={v => setCompanyForm(p => ({ ...p, officePhone: v }))} colors={colors} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <CF label="Email" value={companyForm.email} onChange={v => setCompanyForm(p => ({ ...p, email: v }))} colors={colors} />
                <CF label="Discount Rate (%)" value={companyForm.discountRate} onChange={v => setCompanyForm(p => ({ ...p, discountRate: v }))} type="number" colors={colors} />
              </div>
              <CF label="Credit Limit (৳)" value={companyForm.creditLimit} onChange={v => setCompanyForm(p => ({ ...p, creditLimit: v }))} type="number" colors={colors} />
              <CF label="Notes" value={companyForm.notes} onChange={v => setCompanyForm(p => ({ ...p, notes: v }))} colors={colors} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => { setShowCompanyForm(false); setEditCompany(null); }} style={{ flex: 1, background: colors.bgSecondary, color: colors.textSecondary, border: 'none', borderRadius: 6, padding: '10px', cursor: 'pointer', fontSize: 13 }}>{t('cancel')}</button>
              <button onClick={saveCompany} style={{ flex: 2, background: colors.primary, color: '#fff', border: 'none', borderRadius: 6, padding: '10px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>{t('save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CF({ label, value, onChange, type = 'text', colors }: { label: string; value: string; onChange: (v: string) => void; type?: string; colors: any }) {
  return (
    <div style={{ flex: 1 }}>
      <label style={{ fontSize: 11, color: colors.textMuted, display: 'block', marginBottom: 4 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', background: colors.bgSecondary, border: `1px solid ${colors.border}`, borderRadius: 6, padding: '8px 10px', color: colors.text, fontSize: 13, boxSizing: 'border-box' }} />
    </div>
  );
}
