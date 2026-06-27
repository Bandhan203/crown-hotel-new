import { useState } from 'react';
import { useRooms } from '../../contexts/RoomsContext';
import { useGuests } from '../../contexts/GuestContext';
import { useHotel } from '../../contexts/HotelContext';
import type { MealPlan } from '../../data/types';
import { X, Search, Printer } from 'lucide-react';
import { toast } from 'sonner';

interface Props { onClose: () => void; }

export function ReservationForm({ onClose }: Props) {
  const { rooms, addFolio, updateRoomStatus, addTransaction } = useRooms();
  const { guests, findGuestByPhone } = useGuests();
  const { config, generateId, generateRefNo } = useHotel();

  const [phone, setPhone] = useState('');
  const [guestId, setGuestId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [checkIn, setCheckIn] = useState(config.systemDate);
  const [checkOut, setCheckOut] = useState('');
  const [mealPlan, setMealPlan] = useState<MealPlan>('EP');
  const [adults, setAdults] = useState(1);
  const [arrivalMode, setArrivalMode] = useState('');
  const [flightNo, setFlightNo] = useState('');
  const [pickup, setPickup] = useState(false);
  const [advance, setAdvance] = useState('');
  const [payMode, setPayMode] = useState('Cash');
  const [company, setCompany] = useState('');
  const [notes, setNotes] = useState('');
  const [done, setDone] = useState(false);
  const [refNo, setRefNo] = useState('');

  const foundGuest = guests.find(g => g.id === guestId);
  const vacantRooms = rooms.filter(r => r.status === 'vacant');

  const searchGuest = () => {
    const g = findGuestByPhone(phone);
    if (g) { setGuestId(g.id); toast.success(`গেস্ট: ${g.name}`); }
    else toast.error('গেস্ট পাওয়া যায়নি। চেক-ইন পেজ থেকে নতুন গেস্ট তৈরি করুন।');
  };

  const handleSubmit = () => {
    if (!guestId) { toast.error('গেস্ট সিলেক্ট করুন'); return; }
    if (!roomId) { toast.error('রুম সিলেক্ট করুন'); return; }
    if (!checkOut) { toast.error('চেক-আউট তারিখ দিন'); return; }

    const ref = generateRefNo();
    const folioId = generateId('f');
    const advAmt = parseFloat(advance) || 0;

    addFolio({
      id: folioId,
      referenceNo: ref,
      guestId,
      roomId,
      checkIn,
      checkOut,
      mealPlan,
      status: 'reserved',
      adults,
      children: 0,
      company: company || undefined,
      arrivalMode: arrivalMode || undefined,
      flightBusNo: flightNo || undefined,
      pickupRequired: pickup,
      advancePaid: advAmt,
      notes: notes || undefined,
      createdAt: new Date().toISOString(),
      createdBy: config.currentUser,
    });

    updateRoomStatus(roomId, 'reserved');

    if (advAmt > 0) {
      addTransaction({
        id: generateId('tx'),
        folioId,
        date: config.systemDate,
        category: 'Payment',
        description: `Reservation Advance - ${payMode}`,
        amount: -advAmt,
        type: 'payment',
        postedBy: config.currentUser,
        timestamp: new Date().toISOString(),
        printed: true,
      });
    }

    setRefNo(ref);
    setDone(true);
    toast.success(`রিজার্ভেশন নিশ্চিত: ${ref}`);
  };

  if (done) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
        <div style={{ background: '#1a2235', border: '1px solid #22c55e', borderRadius: 12, width: 400, padding: 32, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 56, height: 56, background: '#0f2d1a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>✓</div>
          <h3 style={{ margin: 0, color: '#22c55e' }}>রিজার্ভেশন নিশ্চিত হয়েছে!</h3>
          <div style={{ background: '#0f1623', borderRadius: 8, padding: '10px 20px', fontFamily: 'monospace', fontSize: 14, color: '#fbbf24' }}>{refNo}</div>
          <p style={{ color: '#94a3b8', fontSize: 12, margin: 0 }}>গেস্টকে এই রেফারেন্স নম্বর দিন</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button style={{ background: '#1e3a5f', color: '#93c5fd', border: '1px solid #2563eb', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
              <Printer size={12} /> মানি রিসিট প্রিন্ট
            </button>
            <button onClick={onClose} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 12 }}>বন্ধ করুন</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: '#1a2235', border: '1px solid #2d3f6a', borderRadius: 12, width: 560, maxHeight: '92vh', overflow: 'auto', boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #2d3f6a', display: 'flex', alignItems: 'center' }}>
          <h3 style={{ margin: 0, color: '#fff', flex: 1 }}>নতুন রিজার্ভেশন</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Guest */}
          <div>
            <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>গেস্ট খুঁজুন (ফোন নম্বর)</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={phone} onChange={e => setPhone(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchGuest()} placeholder="01XXXXXXXXX"
                style={{ flex: 1, background: '#0f1623', border: '1px solid #2d3f6a', borderRadius: 6, padding: '8px 10px', color: '#e2e8f0', fontSize: 13 }} />
              <button onClick={searchGuest} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 14px', cursor: 'pointer', fontSize: 12, display: 'flex', gap: 5, alignItems: 'center' }}>
                <Search size={12} /> খুঁজুন
              </button>
            </div>
            {foundGuest && (
              <div style={{ marginTop: 6, background: '#0f2d1a', border: '1px solid #22c55e44', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: '#22c55e' }}>
                ✓ {foundGuest.name} · {foundGuest.phone}
              </div>
            )}
          </div>

          {/* Room */}
          <div>
            <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>রুম বরাদ্দ</label>
            <select value={roomId} onChange={e => setRoomId(e.target.value)}
              style={{ width: '100%', background: '#0f1623', border: '1px solid #2d3f6a', borderRadius: 6, padding: '8px 10px', color: '#e2e8f0', fontSize: 13 }}>
              <option value="">— রুম সিলেক্ট করুন —</option>
              {vacantRooms.map(r => <option key={r.id} value={r.id}>রুম {r.number} — {r.type} — ৳{r.ratePerNight.toLocaleString()}/রাত</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <Inp label="চেক-ইন" type="date" value={checkIn} onChange={setCheckIn} />
            <Inp label="চেক-আউট *" type="date" value={checkOut} onChange={setCheckOut} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>মিল প্ল্যান</label>
              <select value={mealPlan} onChange={e => setMealPlan(e.target.value as MealPlan)}
                style={{ width: '100%', background: '#0f1623', border: '1px solid #2d3f6a', borderRadius: 6, padding: '8px 10px', color: '#e2e8f0', fontSize: 13 }}>
                <option value="EP">EP</option><option value="CP">CP</option><option value="MAP">MAP</option><option value="AP">AP</option>
              </select>
            </div>
            <Inp label="প্রাপ্তবয়স্ক" type="number" value={String(adults)} onChange={v => setAdults(Number(v))} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Inp label="আগমন মাধ্যম" value={arrivalMode} onChange={setArrivalMode} placeholder="Flight / Bus" />
            <Inp label="ফ্লাইট/বাস নম্বর" value={flightNo} onChange={setFlightNo} placeholder="BG401" />
          </div>
          <Inp label="কোম্পানি (গ্রুপ)" value={company} onChange={setCompany} placeholder="কোম্পানির নাম" />
          <Inp label="নোট" value={notes} onChange={setNotes} placeholder="বিশেষ নির্দেশনা" />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" id="pickres" checked={pickup} onChange={e => setPickup(e.target.checked)} />
            <label htmlFor="pickres" style={{ fontSize: 12, color: '#94a3b8', cursor: 'pointer' }}>পিকআপ প্রয়োজন</label>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Inp label="অ্যাডভান্স (৳)" type="number" value={advance} onChange={setAdvance} placeholder="0" />
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>পদ্ধতি</label>
              <select value={payMode} onChange={e => setPayMode(e.target.value)}
                style={{ width: '100%', background: '#0f1623', border: '1px solid #2d3f6a', borderRadius: 6, padding: '8px 10px', color: '#e2e8f0', fontSize: 13 }}>
                <option>Cash</option><option>Card</option><option>bKash</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button onClick={onClose} style={{ flex: 1, background: '#1e293b', color: '#94a3b8', border: 'none', borderRadius: 6, padding: '10px', cursor: 'pointer', fontSize: 13 }}>বাতিল</button>
            <button onClick={handleSubmit} style={{ flex: 2, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '10px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>রিজার্ভেশন নিশ্চিত করুন</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Inp({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div style={{ flex: 1 }}>
      <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', background: '#0f1623', border: '1px solid #2d3f6a', borderRadius: 6, padding: '8px 10px', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' }} />
    </div>
  );
}
