import { useState } from 'react';
import { useGuests } from '../../contexts/GuestContext';
import { useHotel } from '../../contexts/HotelContext';
import { X } from 'lucide-react';
import { toast } from 'sonner';

interface Props { onClose: () => void; initialPhone?: string; }

export function GuestFormModal({ onClose, initialPhone = '' }: Props) {
  const { addGuest, findGuestByPhone } = useGuests();
  const { generateId } = useHotel();
  const [form, setForm] = useState({
    phone: initialPhone, name: '', fatherName: '', motherName: '',
    nid: '', passport: '', nationality: 'Bangladeshi',
    address: '', email: '', preferences: '', vipLevel: 0,
  });

  const set = (k: string, v: string | number) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = () => {
    if (!form.phone.trim()) { toast.error('ফোন নম্বর আবশ্যক'); return; }
    if (!form.name.trim()) { toast.error('নাম আবশ্যক'); return; }
    if (findGuestByPhone(form.phone)) { toast.error('এই ফোন নম্বরে ইতিমধ্যে গেস্ট আছে'); return; }
    addGuest({
      id: generateId('g'),
      phone: form.phone, name: form.name, fatherName: form.fatherName || undefined,
      motherName: form.motherName || undefined, nid: form.nid || undefined,
      passport: form.passport || undefined, nationality: form.nationality,
      address: form.address || undefined, email: form.email || undefined,
      preferences: form.preferences || undefined,
      vipLevel: form.vipLevel as 0|1|2|3,
      createdAt: new Date().toISOString(),
    });
    toast.success('গেস্ট প্রোফাইল তৈরি হয়েছে।');
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: '#1a2235', border: '1px solid #2d3f6a', borderRadius: 12, width: 520, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #2d3f6a', display: 'flex', alignItems: 'center' }}>
          <h3 style={{ margin: 0, color: '#fff', flex: 1 }}>নতুন গেস্ট প্রোফাইল</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Row>
            <F label="ফোন নম্বর *" value={form.phone} onChange={v => set('phone', v)} placeholder="017XXXXXXXX" />
            <F label="পুরো নাম *" value={form.name} onChange={v => set('name', v)} />
          </Row>
          <Row>
            <F label="পিতার নাম" value={form.fatherName} onChange={v => set('fatherName', v)} />
            <F label="মাতার নাম" value={form.motherName} onChange={v => set('motherName', v)} />
          </Row>
          <Row>
            <F label="NID নম্বর" value={form.nid} onChange={v => set('nid', v)} />
            <F label="পাসপোর্ট নম্বর" value={form.passport} onChange={v => set('passport', v)} />
          </Row>
          <Row>
            <F label="জাতীয়তা" value={form.nationality} onChange={v => set('nationality', v)} />
            <F label="ইমেইল" value={form.email} onChange={v => set('email', v)} type="email" />
          </Row>
          <F label="ঠিকানা" value={form.address} onChange={v => set('address', v)} />
          <F label="বিশেষ পছন্দ / নোট" value={form.preferences} onChange={v => set('preferences', v)} placeholder="Non-smoking, High floor, Coffee etc." />
          <div>
            <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>VIP স্তর</label>
            <select value={form.vipLevel} onChange={e => set('vipLevel', Number(e.target.value))}
              style={{ width: '100%', background: '#0f1623', border: '1px solid #2d3f6a', borderRadius: 6, padding: '8px 10px', color: '#e2e8f0', fontSize: 13 }}>
              <option value={0}>Regular</option>
              <option value={1}>Silver</option>
              <option value={2}>Gold</option>
              <option value={3}>Platinum</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={onClose} style={{ flex: 1, background: '#1e293b', color: '#94a3b8', border: 'none', borderRadius: 6, padding: '10px', cursor: 'pointer', fontSize: 13 }}>বাতিল</button>
            <button onClick={handleSave} style={{ flex: 2, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '10px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>সংরক্ষণ করুন</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', gap: 10 }}>{children}</div>;
}

function F({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div style={{ flex: 1 }}>
      <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', background: '#0f1623', border: '1px solid #2d3f6a', borderRadius: 6, padding: '8px 10px', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' }} />
    </div>
  );
}
