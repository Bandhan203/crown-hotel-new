import { useState } from 'react';
import { useHotel } from '../../contexts/HotelContext';
import { useRooms } from '../../contexts/RoomsContext';
import { useGuests } from '../../contexts/GuestContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLang } from '../../contexts/LanguageContext';
import type { DayCloseRecord } from '../../data/types';
import { Moon, Lock, CheckCircle, AlertTriangle, Printer, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

const CLOSE_PASSWORD = 'NICE2024';

export function NightAudit() {
  const { config, updateConfig, dayCloseRecords, addDayCloseRecord, generateId } = useHotel();
  const { rooms, folios, transactions, addTransaction } = useRooms();
  const { guests } = useGuests();
  const { colors, theme } = useTheme();
  const { t } = useLang();
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'review' | 'confirm' | 'done'>('review');
  const [postingPreview, setPostingPreview] = useState<{ guestName: string; room: string; amount: number }[]>([]);

  const today = config.systemDate;
  const inHouseFolios = folios.filter(f => f.status === 'inhouse');
  const todayTxs = transactions.filter(t => t.date === today);
  const todayRevenue = todayTxs.filter(t => t.amount > 0 && t.type !== 'void').reduce((s, t) => s + t.amount, 0);
  const roomRevenue = todayTxs.filter(t => t.category === 'Room Rent' && t.type !== 'void').reduce((s, t) => s + t.amount, 0);
  const fbRevenue = todayTxs.filter(t => t.category === 'Restaurant' && t.type !== 'void').reduce((s, t) => s + t.amount, 0);
  const spaRevenue = todayTxs.filter(t => t.category === 'Spa' && t.type !== 'void').reduce((s, t) => s + t.amount, 0);
  const otherRevenue = todayRevenue - roomRevenue - fbRevenue - spaRevenue;
  const occupied = rooms.filter(r => r.status === 'occupied').length;
  const maintenance = rooms.filter(r => r.status === 'maintenance').length;
  const availableRooms = rooms.length - maintenance;
  const occupancyPct = availableRooms > 0 ? Math.round((occupied / availableRooms) * 100) : 0;
  const adr = occupied > 0 ? Math.round(roomRevenue / occupied) : 0;
  const revPAR = availableRooms > 0 ? Math.round(roomRevenue / availableRooms) : 0;
  const arrivalsToday = folios.filter(f => f.checkIn === today).length;
  const departuresToday = folios.filter(f => f.checkOut === today && f.status === 'inhouse').length;

  const nextDate = new Date(today);
  nextDate.setDate(nextDate.getDate() + 1);
  const nextDateStr = nextDate.toISOString().split('T')[0];
  const alreadyClosed = dayCloseRecords.some(r => r.date === today);

  const buildPreview = () => inHouseFolios.map(f => {
    const room = rooms.find(r => r.id === f.roomId);
    const guest = guests.find(g => g.id === f.guestId);
    return { guestName: guest?.name || '—', room: room?.number || '—', amount: room?.ratePerNight || 0 };
  });

  const handleReview = () => {
    if (alreadyClosed) { toast.error(`${today} already closed.`); return; }
    setPostingPreview(buildPreview());
    setStep('confirm');
  };

  const handleDayClose = () => {
    if (password !== CLOSE_PASSWORD) { toast.error('Incorrect password.'); return; }

    inHouseFolios.forEach(f => {
      const room = rooms.find(r => r.id === f.roomId);
      if (room) {
        const alreadyPosted = transactions.some(t => t.folioId === f.id && t.date === today && t.category === 'Room Rent');
        if (!alreadyPosted) {
          addTransaction({
            id: generateId('tx'),
            folioId: f.id,
            date: today,
            category: 'Room Rent',
            description: `Room ${room.number} — ${room.type} — 1 Night`,
            amount: room.ratePerNight,
            type: 'charge',
            postedBy: 'system',
            timestamp: new Date().toISOString(),
            printed: false,
          });
        }
      }
    });

    const record: DayCloseRecord = {
      id: generateId('dc'),
      date: today,
      totalRevenue: todayRevenue,
      roomRevenue,
      fbRevenue,
      otherRevenue: spaRevenue + otherRevenue,
      totalArrivals: arrivalsToday,
      totalDepartures: departuresToday,
      occupiedRooms: occupied,
      totalRooms: rooms.length,
      closedBy: config.currentUser,
      timestamp: new Date().toISOString(),
    };
    addDayCloseRecord(record);
    updateConfig({ systemDate: nextDateStr, lastDayClose: today });
    setStep('done');
    toast.success(`Day Close complete. New system date: ${nextDateStr}`);
  };

  const Card = ({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) => (
    <div style={{ background: bg, border: `1px solid ${color}33`, borderRadius: 8, padding: '12px 14px', boxShadow: theme === 'light' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none' }}>
      <div style={{ fontSize: 18, fontWeight: 800, color, fontFamily: 'monospace' }}>{value}</div>
      <div style={{ fontSize: 10, color: colors.textMuted, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
    </div>
  );

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto', background: colors.bg }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <Moon size={20} color={colors.purple} />
        <h2 style={{ margin: 0, color: colors.text }}>{t('nightAuditTitle')}</h2>
        <div style={{ marginLeft: 'auto', background: colors.warningBg, border: `1px solid ${colors.warning}44`, borderRadius: 6, padding: '4px 12px', fontSize: 11, color: colors.warning, fontFamily: 'monospace', fontWeight: 700 }}>
          {today}
        </div>
      </div>

      {step === 'done' && (
        <div style={{ background: colors.successBg, border: `1px solid ${colors.success}44`, borderRadius: 10, padding: 24, textAlign: 'center', marginBottom: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <CheckCircle size={40} color={colors.success} />
          <h3 style={{ color: colors.success, margin: 0 }}>Day Close Complete!</h3>
          <p style={{ color: colors.textSecondary, margin: 0, fontSize: 13 }}>New system date: <strong style={{ color: colors.warning }}>{config.systemDate}</strong></p>
          <button onClick={() => window.print()} style={{ background: colors.primaryBg, color: colors.primary, border: `1px solid ${colors.primary}33`, borderRadius: 6, padding: '8px 18px', cursor: 'pointer', fontSize: 12, display: 'flex', gap: 5, alignItems: 'center', marginTop: 4 }}>
            <Printer size={12} /> Print Top Sheet
          </button>
        </div>
      )}

      {/* KPI Grid — Top Sheet */}
      <div style={{ background: colors.bgCard, borderRadius: 10, border: `1px solid ${colors.border}`, padding: 16, marginBottom: 16, boxShadow: theme === 'light' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none' }}>
        <div style={{ fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <TrendingUp size={12} /> Daily Top Sheet — {today}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 12 }}>
          <Card label="Occupancy %" value={`${occupancyPct}%`} color={colors.primary} bg={colors.primaryBg} />
          <Card label="ADR (৳)" value={adr.toLocaleString()} color={colors.warning} bg={colors.warningBg} />
          <Card label="RevPAR (৳)" value={revPAR.toLocaleString()} color={colors.purple} bg={colors.purpleBg} />
          <Card label="Arrivals" value={String(arrivalsToday)} color={colors.success} bg={colors.successBg} />
          <Card label="Departures" value={String(departuresToday)} color={colors.orange} bg={colors.orangeBg} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          <Card label="Room Revenue" value={`৳${roomRevenue.toLocaleString()}`} color={colors.success} bg={colors.successBg} />
          <Card label="F&B Revenue" value={`৳${fbRevenue.toLocaleString()}`} color={colors.orange} bg={colors.orangeBg} />
          <Card label="Spa Revenue" value={`৳${spaRevenue.toLocaleString()}`} color={colors.purple} bg={colors.purpleBg} />
          <Card label="Total Revenue" value={`৳${todayRevenue.toLocaleString()}`} color={colors.primary} bg={colors.primaryBg} />
        </div>
      </div>

      {/* In-house table */}
      <div style={{ background: colors.bgCard, borderRadius: 10, border: `1px solid ${colors.border}`, overflow: 'hidden', marginBottom: 16, boxShadow: theme === 'light' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none' }}>
        <div style={{ padding: '10px 14px', background: colors.bgSecondary, fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          In-House Guests ({inHouseFolios.length}) — Room Rent Auto-Post on Close
        </div>
        <div style={{ maxHeight: 260, overflow: 'auto' }}>
          {inHouseFolios.map((f, i) => {
            const room = rooms.find(r => r.id === f.roomId);
            const guest = guests.find(g => g.id === f.guestId);
            const posted = transactions.some(t => t.folioId === f.id && t.date === today && t.category === 'Room Rent');
            return (
              <div key={f.id} style={{ display: 'grid', gridTemplateColumns: '70px 1.5fr 0.8fr 1fr 100px', padding: '9px 14px', borderTop: `1px solid ${colors.borderLight}`, gap: 8, alignItems: 'center', fontSize: 11, background: i % 2 === 0 ? 'transparent' : colors.tableAlt }}>
                <span style={{ fontFamily: 'monospace', color: colors.primary, fontWeight: 800 }}>{room?.number}</span>
                <span style={{ color: colors.text }}>{guest?.name}</span>
                <span style={{ color: colors.textSecondary }}>{f.checkIn} → {f.checkOut}</span>
                <span style={{ color: colors.warning, fontFamily: 'monospace' }}>৳{room?.ratePerNight.toLocaleString()}/night</span>
                <span style={{ fontSize: 10, color: posted ? colors.success : colors.orange }}>
                  {posted ? '✓ Already posted' : '⟳ Will auto-post'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Day close history */}
      {dayCloseRecords.length > 0 && (
        <div style={{ background: colors.bgCard, borderRadius: 10, border: `1px solid ${colors.border}`, overflow: 'hidden', marginBottom: 16, boxShadow: theme === 'light' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none' }}>
          <div style={{ padding: '10px 14px', background: colors.bgSecondary, fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Day Close History
          </div>
          {dayCloseRecords.slice().reverse().slice(0, 7).map((r, i) => {
            const occ = r.totalRooms > 0 ? Math.round(r.occupiedRooms / r.totalRooms * 100) : 0;
            const adrV = r.occupiedRooms > 0 ? Math.round(r.roomRevenue / r.occupiedRooms) : 0;
            return (
              <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr 1fr 1fr 100px', padding: '8px 14px', borderTop: `1px solid ${colors.borderLight}`, fontSize: 11, gap: 8, alignItems: 'center', background: i % 2 === 0 ? 'transparent' : colors.tableAlt }}>
                <span style={{ color: colors.textMuted }}>{r.date}</span>
                <span style={{ color: colors.success, fontFamily: 'monospace' }}>৳{r.totalRevenue.toLocaleString()}</span>
                <span style={{ color: colors.primary }}>{occ}% occ</span>
                <span style={{ color: colors.warning, fontFamily: 'monospace' }}>ADR ৳{adrV.toLocaleString()}</span>
                <span style={{ color: colors.textSecondary }}>{r.totalArrivals}↓ {r.totalDepartures}↑</span>
                <span style={{ color: colors.textMuted, fontSize: 10 }}>{r.closedBy}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Close action */}
      {step === 'review' && !alreadyClosed && (
        <div style={{ background: colors.bgCard, borderRadius: 10, border: `1px solid ${colors.purple}33`, padding: 20, boxShadow: theme === 'light' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
            <AlertTriangle size={15} color={colors.warning} />
            <span style={{ fontSize: 13, color: colors.warning, fontWeight: 600 }}>Day Close is irreversible</span>
          </div>
          <p style={{ fontSize: 12, color: colors.textSecondary, margin: '0 0 14px' }}>
            This will auto-post room rent for all {inHouseFolios.length} in-house guests and advance system date to <strong style={{ color: colors.warning }}>{nextDateStr}</strong>.
          </p>
          <button onClick={handleReview} style={{ background: colors.purple, color: '#fff', border: 'none', borderRadius: 7, padding: '11px 20px', cursor: 'pointer', fontSize: 13, fontWeight: 700, display: 'flex', gap: 6, alignItems: 'center' }}>
            <Moon size={14} /> Start {t('dayClose')}
          </button>
        </div>
      )}

      {alreadyClosed && step !== 'done' && (
        <div style={{ background: colors.successBg, border: `1px solid ${colors.success}44`, borderRadius: 8, padding: 14, fontSize: 12, color: colors.success, display: 'flex', gap: 8, alignItems: 'center' }}>
          <CheckCircle size={14} /> Day Close for {today} already completed.
        </div>
      )}

      {step === 'confirm' && (
        <div style={{ background: colors.bgCard, borderRadius: 10, border: `1px solid ${colors.purple}44`, padding: 20, marginTop: 0, boxShadow: theme === 'light' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none' }}>
          <h4 style={{ margin: '0 0 12px', color: colors.purple }}>Enter Password to Confirm</h4>
          <div style={{ background: colors.bgSecondary, borderRadius: 8, padding: 12, marginBottom: 14, maxHeight: 180, overflow: 'auto' }}>
            <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 6 }}>Room rent auto-post preview:</div>
            {postingPreview.map((p, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: colors.textSecondary, marginBottom: 2 }}>
                <span>Room {p.room} — {p.guestName}</span>
                <span style={{ fontFamily: 'monospace', color: colors.warning }}>৳{p.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleDayClose()}
              placeholder="Day Close password"
              style={{ flex: 1, background: colors.bgSecondary, border: `1px solid ${colors.purple}44`, borderRadius: 6, padding: '9px 12px', color: colors.text, fontSize: 13 }} />
            <button onClick={handleDayClose} style={{ background: colors.purple, color: '#fff', border: 'none', borderRadius: 6, padding: '9px 20px', cursor: 'pointer', fontSize: 13, fontWeight: 700, display: 'flex', gap: 5, alignItems: 'center' }}>
              <Lock size={13} /> Confirm
            </button>
            <button onClick={() => setStep('review')} style={{ background: colors.bgSecondary, color: colors.textSecondary, border: 'none', borderRadius: 6, padding: '9px 14px', cursor: 'pointer', fontSize: 13 }}>{t('cancel')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
