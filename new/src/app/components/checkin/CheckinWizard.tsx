import { useState, useRef } from 'react';
import type { Guest, MealPlan } from '../../data/types';
import { useRooms } from '../../contexts/RoomsContext';
import { useGuests } from '../../contexts/GuestContext';
import { useHotel } from '../../contexts/HotelContext';
import { Search, User, BedDouble, CheckCircle, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const STEPS = ['গেস্ট খুঁজুন', 'রুম বরাদ্দ', 'স্টে তথ্য', 'নিশ্চিত করুন'];

export function CheckinWizard() {
  const { rooms, addFolio, updateRoomStatus, addTransaction } = useRooms();
  const { guests, addGuest, findGuestByPhone } = useGuests();
  const { config, generateId, generateRefNo } = useHotel();

  const [step, setStep] = useState(0);
  const [phone, setPhone] = useState('');
  const [foundGuest, setFoundGuest] = useState<Guest | null>(null);
  const [newGuestMode, setNewGuestMode] = useState(false);
  const [newGuest, setNewGuest] = useState({ name: '', nationality: 'Bangladeshi', nid: '', passport: '', address: '', preferences: '' });
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [checkIn, setCheckIn] = useState(config.systemDate);
  const [checkOut, setCheckOut] = useState('');
  const [mealPlan, setMealPlan] = useState<MealPlan>('EP');
  const [adults, setAdults] = useState(1);
  const [advance, setAdvance] = useState('');
  const [payMode, setPayMode] = useState('Cash');
  const [arrivalMode, setArrivalMode] = useState('');
  const [flightNo, setFlightNo] = useState('');
  const [pickup, setPickup] = useState(false);
  const [done, setDone] = useState(false);

  const phoneRef = useRef<HTMLInputElement>(null);
  const vacantRooms = rooms.filter(r => r.status === 'vacant');

  const searchGuest = () => {
    const g = findGuestByPhone(phone);
    if (g) {
      setFoundGuest(g);
      setNewGuestMode(false);
      toast.success(`গেস্ট পাওয়া গেছে: ${g.name}`);
      if (g.preferences) toast.info(`পছন্দ: ${g.preferences}`);
    } else {
      setFoundGuest(null);
      setNewGuestMode(true);
    }
  };

  const handleStep1 = () => {
    if (!foundGuest && newGuestMode) {
      if (!newGuest.name.trim()) { toast.error('নাম আবশ্যক'); return; }
      const g: Guest = {
        id: generateId('g'),
        phone,
        name: newGuest.name,
        nationality: newGuest.nationality,
        nid: newGuest.nid || undefined,
        passport: newGuest.passport || undefined,
        address: newGuest.address || undefined,
        preferences: newGuest.preferences || undefined,
        vipLevel: 0,
        createdAt: new Date().toISOString(),
      };
      addGuest(g);
      setFoundGuest(g);
      toast.success('নতুন গেস্ট প্রোফাইল তৈরি হয়েছে।');
    }
    setStep(1);
  };

  const handleStep2 = () => {
    if (!selectedRoomId) { toast.error('রুম সিলেক্ট করুন'); return; }
    setStep(2);
  };

  const handleStep3 = () => {
    if (!checkOut) { toast.error('চেক-আউট তারিখ দিন'); return; }
    if (checkOut <= checkIn) { toast.error('চেক-আউট তারিখ চেক-ইনের পরে হতে হবে'); return; }
    setStep(3);
  };

  const handleConfirm = () => {
    const guest = foundGuest!;
    const refNo = generateRefNo();
    const folioId = generateId('f');
    const advAmt = parseFloat(advance) || 0;

    addFolio({
      id: folioId,
      referenceNo: refNo,
      guestId: guest.id,
      roomId: selectedRoomId,
      checkIn,
      checkOut,
      mealPlan,
      status: 'inhouse',
      adults,
      children: 0,
      pickupRequired: pickup,
      arrivalMode: arrivalMode || undefined,
      flightBusNo: flightNo || undefined,
      advancePaid: advAmt,
      createdAt: new Date().toISOString(),
      createdBy: config.currentUser,
    });

    updateRoomStatus(selectedRoomId, 'occupied');

    if (advAmt > 0) {
      addTransaction({
        id: generateId('tx'),
        folioId,
        date: config.systemDate,
        category: 'Payment',
        description: `Advance Payment - ${payMode}`,
        amount: -advAmt,
        type: 'payment',
        postedBy: config.currentUser,
        timestamp: new Date().toISOString(),
        printed: true,
      });
    }

    setDone(true);
    toast.success(`${guest.name} রুম ${rooms.find(r => r.id === selectedRoomId)?.number}-এ চেক-ইন সম্পন্ন।`);
  };

  const selectedRoom = rooms.find(r => r.id === selectedRoomId);

  if (done) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, color: '#e2e8f0' }}>
        <CheckCircle size={64} color="#22c55e" />
        <h2 style={{ margin: 0 }}>চেক-ইন সম্পন্ন!</h2>
        <p style={{ color: '#94a3b8', margin: 0, textAlign: 'center' }}>
          {foundGuest?.name} সফলভাবে চেক-ইন হয়েছেন।<br />
          রুম: {selectedRoom?.number} | মিল: {mealPlan}
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button onClick={() => { setStep(0); setDone(false); setPhone(''); setFoundGuest(null); setSelectedRoomId(''); setCheckOut(''); setAdvance(''); }}
            style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 20px', cursor: 'pointer', fontSize: 13 }}>
            নতুন চেক-ইন
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 680, margin: '0 auto' }}>
      <h2 style={{ margin: '0 0 20px', color: '#fff', fontSize: 18 }}>চেক-ইন উইজার্ড</h2>

      {/* Step progress */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 28 }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: i < step ? '#22c55e' : i === step ? '#2563eb' : '#1e293b',
                color: '#fff', fontSize: 13, fontWeight: 700, marginBottom: 4,
              }}>{i < step ? '✓' : i + 1}</div>
              <div style={{ fontSize: 10, color: i <= step ? '#e2e8f0' : '#475569', textAlign: 'center', whiteSpace: 'nowrap' }}>{s}</div>
            </div>
            {i < STEPS.length - 1 && <div style={{ flex: 1, height: 2, background: i < step ? '#22c55e' : '#1e293b', marginBottom: 16 }} />}
          </div>
        ))}
      </div>

      <div style={{ background: '#1a2235', borderRadius: 10, padding: 24, border: '1px solid #2d3f6a' }}>
        {/* Step 0: Guest search */}
        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ margin: 0, color: '#93c5fd', fontSize: 14 }}>ধাপ ১: গেস্ট খুঁজুন বা নতুন তৈরি করুন</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                ref={phoneRef}
                value={phone}
                onChange={e => setPhone(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchGuest()}
                placeholder="ফোন নম্বর দিন (Enter চাপুন)"
                style={{ flex: 1, background: '#0f1623', border: '1px solid #2d3f6a', borderRadius: 6, padding: '9px 12px', color: '#e2e8f0', fontSize: 14 }}
                autoFocus
              />
              <button onClick={searchGuest} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '9px 16px', cursor: 'pointer', display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
                <Search size={14} /> খুঁজুন
              </button>
            </div>

            {foundGuest && (
              <div style={{ background: '#0f2d1a', border: '1px solid #22c55e', borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 11, color: '#22c55e', marginBottom: 4 }}>গেস্ট পাওয়া গেছে</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{foundGuest.name}</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>{foundGuest.phone} · {foundGuest.nationality}</div>
                {foundGuest.preferences && <div style={{ marginTop: 6, fontSize: 11, color: '#fbbf24', background: '#1e293b', padding: '4px 8px', borderRadius: 4 }}>⭐ {foundGuest.preferences}</div>}
              </div>
            )}

            {newGuestMode && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 12, color: '#f97316' }}>নতুন গেস্ট প্রোফাইল তৈরি করুন</div>
                <Field label="পুরো নাম *" value={newGuest.name} onChange={v => setNewGuest(p => ({ ...p, name: v }))} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <Field label="জাতীয়তা" value={newGuest.nationality} onChange={v => setNewGuest(p => ({ ...p, nationality: v }))} />
                  <Field label="NID নম্বর" value={newGuest.nid} onChange={v => setNewGuest(p => ({ ...p, nid: v }))} />
                </div>
                <Field label="পাসপোর্ট নম্বর (বিদেশি)" value={newGuest.passport} onChange={v => setNewGuest(p => ({ ...p, passport: v }))} />
                <Field label="ঠিকানা" value={newGuest.address} onChange={v => setNewGuest(p => ({ ...p, address: v }))} />
                <Field label="বিশেষ পছন্দ/নোট" value={newGuest.preferences} onChange={v => setNewGuest(p => ({ ...p, preferences: v }))} />
              </div>
            )}

            <button
              onClick={handleStep1}
              disabled={!foundGuest && !newGuestMode}
              style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '10px', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: (!foundGuest && !newGuestMode) ? 0.4 : 1 }}>
              পরবর্তী ধাপ <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* Step 1: Room selection */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ margin: 0, color: '#93c5fd', fontSize: 14 }}>ধাপ ২: রুম বরাদ্দ করুন</h3>
            <div style={{ fontSize: 12, color: '#64748b' }}>খালি রুমসমূহ ({vacantRooms.length}টি)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 6 }}>
              {vacantRooms.map(r => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRoomId(r.id)}
                  style={{
                    background: selectedRoomId === r.id ? '#0f2d1a' : '#0f1623',
                    border: `2px solid ${selectedRoomId === r.id ? '#22c55e' : '#1e293b'}`,
                    borderRadius: 6, padding: '10px 8px', cursor: 'pointer', color: '#e2e8f0', textAlign: 'left',
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#22c55e', fontFamily: 'monospace' }}>{r.number}</div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>{r.type} · {r.floor}তলা</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>৳{r.ratePerNight.toLocaleString()}</div>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setStep(0)} style={{ flex: 1, background: '#1e293b', color: '#94a3b8', border: 'none', borderRadius: 6, padding: '10px', cursor: 'pointer', fontSize: 13 }}>পেছনে</button>
              <button onClick={handleStep2} style={{ flex: 2, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '10px', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>পরবর্তী ধাপ <ChevronRight size={14} /></button>
            </div>
          </div>
        )}

        {/* Step 2: Stay info */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ margin: 0, color: '#93c5fd', fontSize: 14 }}>ধাপ ৩: স্টে তথ্য</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>চেক-ইন তারিখ</label>
                <input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)}
                  style={{ width: '100%', background: '#0f1623', border: '1px solid #2d3f6a', borderRadius: 6, padding: '8px 10px', color: '#e2e8f0', fontSize: 13 }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>চেক-আউট তারিখ *</label>
                <input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)}
                  style={{ width: '100%', background: '#0f1623', border: '1px solid #2d3f6a', borderRadius: 6, padding: '8px 10px', color: '#e2e8f0', fontSize: 13 }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>মিল প্ল্যান</label>
                <select value={mealPlan} onChange={e => setMealPlan(e.target.value as MealPlan)}
                  style={{ width: '100%', background: '#0f1623', border: '1px solid #2d3f6a', borderRadius: 6, padding: '8px 10px', color: '#e2e8f0', fontSize: 13 }}>
                  <option value="EP">EP (কোনো খাবার নেই)</option>
                  <option value="CP">CP (শুধু সকালের নাস্তা)</option>
                  <option value="MAP">MAP (সকাল + রাতের খাবার)</option>
                  <option value="AP">AP (সব খাবার)</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>প্রাপ্তবয়স্ক</label>
                <input type="number" min={1} max={10} value={adults} onChange={e => setAdults(Number(e.target.value))}
                  style={{ width: '100%', background: '#0f1623', border: '1px solid #2d3f6a', borderRadius: 6, padding: '8px 10px', color: '#e2e8f0', fontSize: 13 }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>আগমন মাধ্যম</label>
                <input value={arrivalMode} onChange={e => setArrivalMode(e.target.value)} placeholder="Flight / Bus / Car"
                  style={{ width: '100%', background: '#0f1623', border: '1px solid #2d3f6a', borderRadius: 6, padding: '8px 10px', color: '#e2e8f0', fontSize: 13 }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>ফ্লাইট/বাস নম্বর</label>
                <input value={flightNo} onChange={e => setFlightNo(e.target.value)} placeholder="BG401 / Green Line 12"
                  style={{ width: '100%', background: '#0f1623', border: '1px solid #2d3f6a', borderRadius: 6, padding: '8px 10px', color: '#e2e8f0', fontSize: 13 }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" id="pickup" checked={pickup} onChange={e => setPickup(e.target.checked)} />
              <label htmlFor="pickup" style={{ fontSize: 12, color: '#94a3b8', cursor: 'pointer' }}>পিকআপ প্রয়োজন</label>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 2 }}>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>অ্যাডভান্স পেমেন্ট (৳)</label>
                <input type="number" value={advance} onChange={e => setAdvance(e.target.value)} placeholder="0"
                  style={{ width: '100%', background: '#0f1623', border: '1px solid #2d3f6a', borderRadius: 6, padding: '8px 10px', color: '#e2e8f0', fontSize: 13 }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>পদ্ধতি</label>
                <select value={payMode} onChange={e => setPayMode(e.target.value)}
                  style={{ width: '100%', background: '#0f1623', border: '1px solid #2d3f6a', borderRadius: 6, padding: '8px 10px', color: '#e2e8f0', fontSize: 13 }}>
                  <option>Cash</option><option>Card</option><option>bKash</option><option>Nagad</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, background: '#1e293b', color: '#94a3b8', border: 'none', borderRadius: 6, padding: '10px', cursor: 'pointer', fontSize: 13 }}>পেছনে</button>
              <button onClick={handleStep3} style={{ flex: 2, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '10px', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>পর্যালোচনা করুন <ChevronRight size={14} /></button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && foundGuest && selectedRoom && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ margin: 0, color: '#93c5fd', fontSize: 14 }}>ধাপ ৪: নিশ্চিত করুন</h3>
            <div style={{ background: '#0f1623', borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
              <ConfRow label="গেস্ট" value={foundGuest.name} />
              <ConfRow label="ফোন" value={foundGuest.phone} />
              <ConfRow label="রুম" value={`${selectedRoom.number} (${selectedRoom.type})`} />
              <ConfRow label="চেক-ইন" value={checkIn} />
              <ConfRow label="চেক-আউট" value={checkOut} />
              <ConfRow label="মিল প্ল্যান" value={mealPlan} />
              <ConfRow label="রুম রেট" value={`৳ ${selectedRoom.ratePerNight.toLocaleString()}/রাত`} />
              <ConfRow label="অ্যাডভান্স" value={`৳ ${(parseFloat(advance) || 0).toLocaleString()} (${payMode})`} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setStep(2)} style={{ flex: 1, background: '#1e293b', color: '#94a3b8', border: 'none', borderRadius: 6, padding: '10px', cursor: 'pointer', fontSize: 13 }}>পেছনে</button>
              <button onClick={handleConfirm} style={{ flex: 2, background: '#22c55e', color: '#000', border: 'none', borderRadius: 6, padding: '10px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                ✓ চেক-ইন নিশ্চিত করুন
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ flex: 1 }}>
      <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', background: '#0f1623', border: '1px solid #2d3f6a', borderRadius: 6, padding: '8px 10px', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' }} />
    </div>
  );
}

function ConfRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: '#64748b' }}>{label}</span>
      <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{value}</span>
    </div>
  );
}
