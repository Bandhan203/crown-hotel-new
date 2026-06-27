import { useState } from 'react';
import { useHotel } from '../../contexts/HotelContext';
import { Settings as SettingsIcon, Save, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export function Settings() {
  const { config, updateConfig } = useHotel();
  const [form, setForm] = useState({ ...config });

  const handleSave = () => {
    updateConfig(form);
    toast.success('সেটিংস সংরক্ষিত হয়েছে।');
  };

  const handleReset = () => {
    if (confirm('সমস্ত ডেটা রিসেট করবেন? এটি পূর্বাবস্থায় ফেরানো যাবে না।')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 680, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <SettingsIcon size={18} color="#94a3b8" />
        <h2 style={{ margin: 0, color: '#fff' }}>সিস্টেম সেটিংস</h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Section title="হোটেল তথ্য">
          <F label="হোটেলের নাম" value={form.hotelName} onChange={v => setForm(p => ({ ...p, hotelName: v }))} />
          <F label="ঠিকানা" value={form.hotelAddress} onChange={v => setForm(p => ({ ...p, hotelAddress: v }))} />
          <div style={{ display: 'flex', gap: 10 }}>
            <F label="ফোন" value={form.hotelPhone} onChange={v => setForm(p => ({ ...p, hotelPhone: v }))} />
            <F label="ইমেইল" value={form.hotelEmail} onChange={v => setForm(p => ({ ...p, hotelEmail: v }))} />
          </div>
        </Section>

        <Section title="আর্থিক সেটিংস">
          <div style={{ display: 'flex', gap: 10 }}>
            <F label="কর হার (%)" value={String(form.taxRate)} onChange={v => setForm(p => ({ ...p, taxRate: Number(v) }))} type="number" />
            <F label="মুদ্রা" value={form.currency} onChange={v => setForm(p => ({ ...p, currency: v }))} />
          </div>
        </Section>

        <Section title="ব্যবহারকারী">
          <div style={{ display: 'flex', gap: 10 }}>
            <F label="ব্যবহারকারীর নাম" value={form.currentUser} onChange={v => setForm(p => ({ ...p, currentUser: v }))} />
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>ভূমিকা</label>
              <select value={form.currentRole} onChange={e => setForm(p => ({ ...p, currentRole: e.target.value as any }))}
                style={{ width: '100%', background: '#0f1623', border: '1px solid #2d3f6a', borderRadius: 6, padding: '8px 10px', color: '#e2e8f0', fontSize: 13 }}>
                <option value="receptionist">রিসেপশনিস্ট</option>
                <option value="manager">ম্যানেজার</option>
                <option value="admin">অ্যাডমিন</option>
                <option value="storekeeper">স্টোরকিপার</option>
              </select>
            </div>
          </div>
        </Section>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleSave} style={{ flex: 2, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '10px', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Save size={14} /> সেটিংস সংরক্ষণ করুন
          </button>
          <button onClick={handleReset} style={{ flex: 1, background: '#3b1111', color: '#ef4444', border: '1px solid #ef444433', borderRadius: 6, padding: '10px', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <RefreshCw size={14} /> ডেটা রিসেট
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#1a2235', borderRadius: 10, border: '1px solid #2d3f6a', overflow: 'hidden' }}>
      <div style={{ padding: '10px 16px', background: '#111827', borderBottom: '1px solid #2d3f6a', fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: 1 }}>{title}</div>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </div>
  );
}

function F({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div style={{ flex: 1 }}>
      <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', background: '#0f1623', border: '1px solid #2d3f6a', borderRadius: 6, padding: '8px 10px', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' }} />
    </div>
  );
}
