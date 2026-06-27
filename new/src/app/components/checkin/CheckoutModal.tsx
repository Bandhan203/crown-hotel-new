import { useState } from 'react';
import type { Folio, Guest, Room } from '../../data/types';
import { useRooms } from '../../contexts/RoomsContext';
import { useHotel } from '../../contexts/HotelContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLang } from '../../contexts/LanguageContext';
import { X, AlertTriangle, CheckCircle, Printer } from 'lucide-react';
import { toast } from 'sonner';

interface Props { folio: Folio; guest: Guest; room: Room; onClose: () => void; }

export function CheckoutModal({ folio, guest, room, onClose }: Props) {
  const { getFolioBalance, getFolioTransactions, updateFolio, updateRoomStatus, addTransaction } = useRooms();
  const { config, generateId } = useHotel();
  const { colors } = useTheme();
  const { t } = useLang();
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [step, setStep] = useState<'review' | 'success'>('review');

  const balance = getFolioBalance(folio.id);
  const txs = getFolioTransactions(folio.id);
  const charges = txs.filter(t => t.amount > 0 && t.type !== 'void').reduce((s, t) => s + t.amount, 0);
  const payments = txs.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  const handleCheckout = () => {
    const payAmt = parseFloat(paymentAmount) || 0;
    if (balance > 0 && payAmt < balance) {
      toast.error(t('checkoutBlocked'));
      return;
    }
    if (payAmt > 0) {
      addTransaction({
        id: generateId('tx'),
        folioId: folio.id,
        date: config.systemDate,
        category: 'Payment',
        description: `Checkout Payment — ${paymentMode}`,
        amount: -payAmt,
        type: 'payment',
        postedBy: config.currentUser,
        timestamp: new Date().toISOString(),
        printed: true,
      });
    }
    updateFolio(folio.id, { status: 'checkedout' });
    updateRoomStatus(room.id, 'dirty');
    setStep('success');
    toast.success(t('checkoutSuccess'));
  };

  const inp = (extra?: object) => ({
    background: colors.bgSecondary,
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
    padding: '8px 12px',
    color: colors.text,
    fontSize: 13,
    ...extra,
  });

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: 12, width: 480, maxHeight: '90vh', overflow: 'auto', boxShadow: colors.shadow }}>
        {/* Header */}
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: 10, background: '#dc2626' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: '#fca5a5' }}>{t('checkOut')} Process</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{guest.name} — Room {room.number}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', cursor: 'pointer', padding: 5, borderRadius: 5 }}><X size={15} /></button>
        </div>

        {step === 'review' ? (
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Stay summary */}
            <div style={{ background: colors.bgSecondary, borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12 }}>
              <div style={{ fontSize: 10, color: colors.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Stay Summary</div>
              {[
                [t('checkIn'), folio.checkIn],
                [t('checkOut'), folio.checkOut],
                [t('mealPlan'), folio.mealPlan],
                ['Reference', folio.referenceNo],
              ].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: colors.textMuted }}>{l}</span>
                  <span style={{ color: colors.text, fontFamily: 'monospace', fontSize: 11 }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Financial */}
            <div style={{ background: colors.bgSecondary, borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12 }}>
              <div style={{ fontSize: 10, color: colors.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Financials</div>
              <Row l="Total Charges" v={`৳ ${charges.toLocaleString()}`} vc={colors.text} colors={colors} />
              <Row l="Total Payments" v={`৳ ${payments.toLocaleString()}`} vc={colors.success} colors={colors} />
              <div style={{ height: 1, background: colors.border, margin: '5px 0' }} />
              <Row l="Balance Due" v={`৳ ${balance.toLocaleString()}`} vc={balance > 0 ? colors.danger : colors.success} colors={colors} bold />
            </div>

            {balance > 0 && (
              <div style={{ background: colors.dangerBg, border: `1px solid ${colors.danger}44`, borderRadius: 8, padding: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                <AlertTriangle size={14} color={colors.danger} />
                <div style={{ fontSize: 12, color: colors.danger }}>{t('checkoutBlocked')}</div>
              </div>
            )}

            {balance > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 11, color: colors.textMuted }}>Payment Amount</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)}
                    placeholder={`${balance}`} style={{ ...inp({ flex: 1 }) }} />
                  <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)} style={{ ...inp() }}>
                    <option>Cash</option><option>Card</option><option>bKash</option><option>Nagad</option><option>Bank</option>
                  </select>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onClose} style={{ flex: 1, background: colors.bgSecondary, color: colors.textSecondary, border: 'none', borderRadius: 6, padding: '10px', cursor: 'pointer', fontSize: 13 }}>{t('cancel')}</button>
              <button onClick={handleCheckout} style={{ flex: 2, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, padding: '10px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                Confirm Check-Out
              </button>
            </div>
          </div>
        ) : (
          <div style={{ padding: 32, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <CheckCircle size={48} color={colors.success} />
            <h3 style={{ margin: 0, color: colors.text }}>Check-Out Complete!</h3>
            <p style={{ margin: 0, color: colors.textSecondary, fontSize: 13 }}>
              {guest.name} checked out from Room {room.number}.<br />
              Room is now marked as Dirty for housekeeping.
            </p>
            <button onClick={onClose} style={{ background: colors.primary, color: '#fff', border: 'none', borderRadius: 6, padding: '10px 24px', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', gap: 6, alignItems: 'center', marginTop: 8 }}>
              <Printer size={14} /> Print Invoice & Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ l, v, vc, colors, bold = false }: { l: string; v: string; vc: string; colors: any; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
      <span style={{ color: colors.textMuted }}>{l}</span>
      <span style={{ color: vc, fontWeight: bold ? 800 : 400, fontFamily: 'monospace' }}>{v}</span>
    </div>
  );
}
