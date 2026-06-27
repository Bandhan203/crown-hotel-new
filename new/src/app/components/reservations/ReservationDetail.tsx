import type { Folio } from '../../data/types';
import { useGuests } from '../../contexts/GuestContext';
import { useRooms } from '../../contexts/RoomsContext';
import { X, Printer } from 'lucide-react';

interface Props { folio: Folio; onClose: () => void; }

export function ReservationDetail({ folio, onClose }: Props) {
  const { guests } = useGuests();
  const { rooms, getFolioBalance, getFolioTransactions } = useRooms();
  const guest = guests.find(g => g.id === folio.guestId);
  const room = rooms.find(r => r.id === folio.roomId);
  const balance = getFolioBalance(folio.id);
  const txs = getFolioTransactions(folio.id);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: '#1a2235', border: '1px solid #2d3f6a', borderRadius: 12, width: 520, maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #2d3f6a', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>{folio.referenceNo}</div>
            <h3 style={{ margin: 0, color: '#fff' }}>{guest?.name}</h3>
          </div>
          <button style={{ background: '#1e3a5f', color: '#93c5fd', border: '1px solid #2563eb', borderRadius: 5, padding: '5px 10px', cursor: 'pointer', fontSize: 11, display: 'flex', gap: 4, alignItems: 'center' }}>
            <Printer size={11} /> প্রিন্ট
          </button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Section title="গেস্ট তথ্য">
            <Row l="নাম" v={guest?.name || '—'} />
            <Row l="ফোন" v={guest?.phone || '—'} />
            <Row l="জাতীয়তা" v={guest?.nationality || '—'} />
          </Section>
          <Section title="স্টে তথ্য">
            <Row l="রুম" v={room ? `${room.number} (${room.type})` : '—'} />
            <Row l="চেক-ইন" v={folio.checkIn} />
            <Row l="চেক-আউট" v={folio.checkOut} />
            <Row l="মিল প্ল্যান" v={folio.mealPlan} />
            <Row l="প্রাপ্তবয়স্ক" v={String(folio.adults)} />
            {folio.company && <Row l="কোম্পানি" v={folio.company} />}
          </Section>
          {(folio.arrivalMode || folio.flightBusNo || folio.pickupRequired) && (
            <Section title="লজিস্টিক্স">
              {folio.arrivalMode && <Row l="আগমন" v={folio.arrivalMode} />}
              {folio.flightBusNo && <Row l="নম্বর" v={folio.flightBusNo} />}
              <Row l="পিকআপ" v={folio.pickupRequired ? 'হ্যাঁ' : 'না'} />
            </Section>
          )}
          <Section title="আর্থিক">
            <Row l="অ্যাডভান্স" v={`৳ ${folio.advancePaid.toLocaleString()}`} />
            <Row l="বর্তমান ব্যালেন্স" v={`৳ ${balance.toLocaleString()}`} vc={balance > 0 ? '#ef4444' : '#22c55e'} />
          </Section>
          {txs.length > 0 && (
            <Section title="লেনদেন">
              {txs.map(tx => (
                <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4, opacity: tx.type === 'void' ? 0.5 : 1 }}>
                  <span style={{ color: '#64748b' }}>{tx.date} · {tx.category}</span>
                  <span style={{ fontFamily: 'monospace', color: tx.amount < 0 ? '#22c55e' : '#e2e8f0' }}>
                    {tx.amount < 0 ? '-' : '+'}৳{Math.abs(tx.amount).toLocaleString()}
                  </span>
                </div>
              ))}
            </Section>
          )}
          {folio.notes && <div style={{ background: '#2d2100', border: '1px solid #f59e0b44', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#fbbf24' }}>📝 {folio.notes}</div>}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#0f1623', borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ l, v, vc = '#e2e8f0' }: { l: string; v: string; vc?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
      <span style={{ color: '#64748b' }}>{l}</span>
      <span style={{ color: vc }}>{v}</span>
    </div>
  );
}
