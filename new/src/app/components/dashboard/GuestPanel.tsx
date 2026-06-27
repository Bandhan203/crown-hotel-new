import { useState } from 'react';
import { X, Phone, CreditCard, Star, Clock, Receipt, LogOut, Printer, ArrowRightLeft, Users } from 'lucide-react';
import type { Room } from '../../data/types';
import { useRooms } from '../../contexts/RoomsContext';
import { useGuests } from '../../contexts/GuestContext';
import { useHotel } from '../../contexts/HotelContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLang } from '../../contexts/LanguageContext';
import { CheckoutModal } from '../checkin/CheckoutModal';
import { PrintInvoice } from '../print/PrintInvoice';

interface GuestPanelProps { room: Room; onClose: () => void; }

export function GuestPanel({ room, onClose }: GuestPanelProps) {
  const { folios, getFolioBalance, getFolioTransactions } = useRooms();
  const { guests } = useGuests();
  const { config } = useHotel();
  const { colors, theme } = useTheme();
  const { t } = useLang();
  const [showCheckout, setShowCheckout] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);

  const folio = folios.find(f => f.roomId === room.id && (f.status === 'inhouse' || f.status === 'reserved'));
  const guest = folio ? guests.find(g => g.id === folio.guestId) : undefined;
  const balance = folio ? getFolioBalance(folio.id) : 0;
  const txs = folio ? getFolioTransactions(folio.id) : [];

  const nights = folio
    ? Math.max(1, Math.ceil((new Date(folio.checkOut).getTime() - new Date(folio.checkIn).getTime()) / 86400000))
    : 0;

  const vipColors = ['#64748b', '#22c55e', '#3b82f6', '#f59e0b'];
  const statusColors: Record<string, { bg: string; color: string; label: string }> = {
    reserved: { bg: colors.primaryBg, color: colors.primary, label: t('reserved') },
    inhouse: { bg: colors.successBg, color: colors.success, label: t('inhouse') },
    checkedout: { bg: colors.warningBg, color: colors.warning, label: t('checkedout') },
  };

  return (
    <>
      <div style={{ width: 320, background: colors.bgCard, borderLeft: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden', boxShadow: theme === 'light' ? '-4px 0 16px rgba(0,0,0,0.08)' : '-4px 0 16px rgba(0,0,0,0.3)' }}>
        {/* Header */}
        <div style={{ padding: '12px 14px', background: theme === 'light' ? '#1e3a5f' : '#1e3a5f', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: '#93c5fd', marginBottom: 2 }}>{t('room')} {room.number} — {room.type}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{guest?.name || (folio ? '—' : t('vacant'))}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer', padding: 5, borderRadius: 5, display: 'flex' }}>
            <X size={15} />
          </button>
        </div>

        {folio && guest ? (
          <div style={{ flex: 1, overflow: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* VIP + status badges */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {guest.vipLevel > 0 && (
                <div style={{ display: 'flex', gap: 2 }}>
                  {Array.from({ length: guest.vipLevel }).map((_, i) => (
                    <Star key={i} size={11} fill={vipColors[guest.vipLevel]} color={vipColors[guest.vipLevel]} />
                  ))}
                </div>
              )}
              <span style={{ fontSize: 10, background: statusColors[folio.status].bg, color: statusColors[folio.status].color, padding: '2px 8px', borderRadius: 12, border: `1px solid ${statusColors[folio.status].color}33`, fontWeight: 600 }}>
                {statusColors[folio.status].label}
              </span>
              <span style={{ fontSize: 10, background: colors.bgSecondary, color: colors.textSecondary, padding: '2px 8px', borderRadius: 12 }}>{folio.mealPlan}</span>
            </div>

            {/* Preferences popup */}
            {guest.preferences && (
              <div style={{ padding: '6px 10px', background: colors.warningBg, borderRadius: 6, border: `1px solid ${colors.warning}33`, fontSize: 11, color: colors.warning, borderLeft: `3px solid ${colors.warning}` }}>
                ⭐ {guest.preferences}
              </div>
            )}

            {/* Guest info */}
            <div style={{ background: colors.bgSecondary, borderRadius: 8, padding: 10, display: 'flex', flexDirection: 'column', gap: 5, fontSize: 11 }}>
              <InfoRow icon={<Phone size={10} />} label={t('phone')} value={guest.phone} colors={colors} />
              <InfoRow icon={<CreditCard size={10} />} label={t('nid')} value={guest.nid || guest.passport || 'N/A'} colors={colors} />
              <InfoRow icon={null} label={t('nationality')} value={guest.nationality} colors={colors} />
            </div>

            {/* Stay info */}
            <div style={{ background: colors.bgSecondary, borderRadius: 8, padding: 10, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted }}>
                <span>Ref#</span><span style={{ color: colors.textSecondary, fontFamily: 'monospace', fontSize: 10 }}>{folio.referenceNo}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted }}>
                <span>{t('checkIn')}</span><span style={{ color: colors.success }}>{folio.checkIn}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted }}>
                <span>{t('checkOut')}</span><span style={{ color: colors.danger }}>{folio.checkOut}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted }}>
                <span>{t('nights')}</span><span style={{ color: colors.text }}>{nights}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted }}>
                <span>{t('adults')}</span><span style={{ color: colors.text }}>{folio.adults}</span>
              </div>
            </div>

            {/* Balance card */}
            <div style={{ background: balance > 0 ? colors.dangerBg : colors.successBg, border: `1px solid ${balance > 0 ? colors.danger : colors.success}55`, borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: colors.textMuted, marginBottom: 3 }}>{t('balance')}</div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'monospace', color: balance > 0 ? colors.danger : colors.success }}>
                ৳ {Math.abs(balance).toLocaleString()}
              </div>
              <div style={{ fontSize: 9, color: balance > 0 ? colors.danger : colors.success, marginTop: 1 }}>
                {balance > 0 ? 'Due' : balance < 0 ? 'Credit' : 'Settled'}
              </div>
            </div>

            {/* Recent transactions */}
            <div>
              <div style={{ fontSize: 9, color: colors.textMuted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 1 }}>Recent</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {txs.slice(-5).reverse().map(tx => (
                  <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, padding: '4px 7px', background: colors.bgSecondary, borderRadius: 4 }}>
                    <span style={{ color: tx.type === 'void' ? colors.textMuted : colors.textSecondary, textDecoration: tx.type === 'void' ? 'line-through' : 'none' }}>{tx.category}</span>
                    <span style={{ color: tx.amount < 0 ? colors.success : tx.type === 'void' ? colors.textMuted : colors.text, fontFamily: 'monospace' }}>
                      {tx.amount < 0 ? '-' : '+'}৳{Math.abs(tx.amount).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 'auto' }}>
              {folio.status === 'inhouse' && (
                <button onClick={() => setShowCheckout(true)}
                  style={{ background: colors.danger, color: '#fff', border: 'none', borderRadius: 7, padding: '9px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, fontWeight: 700 }}>
                  <LogOut size={13} /> {t('checkOut')}
                </button>
              )}
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setShowInvoice(true)}
                  style={{ flex: 1, background: colors.primaryBg, color: colors.primary, border: `1px solid ${colors.primary}33`, borderRadius: 6, padding: '7px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 11 }}>
                  <Printer size={11} /> {t('print')}
                </button>
                <button style={{ flex: 1, background: colors.bgSecondary, color: colors.textSecondary, border: `1px solid ${colors.border}`, borderRadius: 6, padding: '7px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 11 }}>
                  <ArrowRightLeft size={11} /> Transfer
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: colors.textMuted, gap: 8 }}>
            <Clock size={28} />
            <div style={{ fontSize: 12 }}>No active folio</div>
            <div style={{ fontSize: 10, color: colors.textMuted }}>Room {room.status}</div>
          </div>
        )}
      </div>

      {showCheckout && folio && guest && (
        <CheckoutModal folio={folio} guest={guest} room={room} onClose={() => setShowCheckout(false)} />
      )}
      {showInvoice && folio && guest && (
        <PrintInvoice folio={folio} guest={guest} room={room} onClose={() => setShowInvoice(false)} />
      )}
    </>
  );
}

function InfoRow({ icon, label, value, colors }: { icon: React.ReactNode; label: string; value: string; colors: any }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: colors.textMuted, display: 'flex', alignItems: 'center', gap: 4 }}>{icon}{label}</span>
      <span style={{ color: colors.text }}>{value}</span>
    </div>
  );
}
