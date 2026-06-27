import { useState, useRef, useEffect } from 'react';
import { useRooms } from '../../contexts/RoomsContext';
import { useGuests } from '../../contexts/GuestContext';
import { useHotel } from '../../contexts/HotelContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLang } from '../../contexts/LanguageContext';
import type { Transaction } from '../../data/types';
import { Keyboard, AlertTriangle, CheckCircle, Ban, Zap, ArrowRightLeft } from 'lucide-react';
import { toast } from 'sonner';
import { RoomTransferModal } from './RoomTransferModal';

const CATEGORIES = [
  'Room Rent', 'Restaurant', 'Laundry', 'Telephone', 'Transport',
  'Minibar', 'Spa', 'Damage', 'Miscellaneous', 'Adjustment', 'Payment',
];

export function ServiceEntry() {
  const { rooms, folios, getFolioBalance, getFolioTransactions, addTransaction, updateFolio, updateRoomStatus } = useRooms();
  const { guests } = useGuests();
  const { config, generateId } = useHotel();
  const { colors, theme } = useTheme();
  const { t } = useLang();

  const [roomNo, setRoomNo] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [payMode, setPayMode] = useState('Cash');
  const [voidId, setVoidId] = useState('');
  const [voidReason, setVoidReason] = useState('');
  const [voidMode, setVoidMode] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [autoHitRoomNo, setAutoHitRoomNo] = useState('');
  const [autoHitDept, setAutoHitDept] = useState<'Restaurant' | 'Spa' | 'Laundry'>('Restaurant');
  const [autoHitAmt, setAutoHitAmt] = useState('');
  const [autoHitDesc, setAutoHitDesc] = useState('');
  const [autoHitMode, setAutoHitMode] = useState(false);

  const roomRef = useRef<HTMLInputElement>(null);
  const catRef = useRef<HTMLSelectElement>(null);
  const descRef = useRef<HTMLInputElement>(null);
  const amtRef = useRef<HTMLInputElement>(null);

  useEffect(() => { roomRef.current?.focus(); }, []);

  const activeRoom = rooms.find(r => r.number === roomNo);
  const activeFolio = activeRoom ? folios.find(f => f.roomId === activeRoom.id && f.status === 'inhouse') : undefined;
  const activeGuest = activeFolio ? guests.find(g => g.id === activeFolio.guestId) : undefined;
  const balance = activeFolio ? getFolioBalance(activeFolio.id) : 0;
  const folioTxs = activeFolio ? getFolioTransactions(activeFolio.id) : [];
  const isPayment = category === 'Payment' || category === 'Adjustment';

  const handlePost = () => {
    if (!activeFolio) { toast.error('No in-house folio found'); return; }
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) { toast.error('Invalid amount'); return; }
    if (!category) { toast.error('Category required'); return; }

    const tx: Transaction = {
      id: generateId('tx'),
      folioId: activeFolio.id,
      date: config.systemDate,
      category,
      description: description || (isPayment ? `${category} - ${payMode}` : category),
      amount: isPayment ? -amt : amt,
      type: isPayment ? 'payment' : 'charge',
      postedBy: config.currentUser,
      timestamp: new Date().toISOString(),
      printed: false,
    };
    addTransaction(tx);
    toast.success(`${t('postSuccess')}: ${category} ৳${amt.toLocaleString()}`);
    setCategory(''); setDescription(''); setAmount('');
    roomRef.current?.focus();
  };

  const handleAutoHit = () => {
    const ahRoom = rooms.find(r => r.number === autoHitRoomNo);
    const ahFolio = ahRoom ? folios.find(f => f.roomId === ahRoom.id && f.status === 'inhouse') : undefined;
    if (!ahFolio) { toast.error('No in-house guest in that room'); return; }
    const amt = parseFloat(autoHitAmt);
    if (!amt || isNaN(amt) || amt <= 0) { toast.error('Invalid amount'); return; }

    addTransaction({
      id: generateId('tx'),
      folioId: ahFolio.id,
      date: config.systemDate,
      category: autoHitDept,
      description: `${autoHitDesc || autoHitDept} (Auto-hit from ${autoHitDept} dept)`,
      amount: amt,
      type: 'charge',
      postedBy: autoHitDept.toLowerCase(),
      timestamp: new Date().toISOString(),
      printed: false,
    });
    toast.success(`Auto-hit posted to Room ${autoHitRoomNo} — ৳${amt.toLocaleString()}`);
    setAutoHitRoomNo(''); setAutoHitAmt(''); setAutoHitDesc('');
  };

  const handleVoid = () => {
    if (!voidId.trim()) { toast.error('Enter transaction ID'); return; }
    if (!voidReason.trim()) { toast.error('Void reason required'); return; }
    if (config.currentRole !== 'admin' && config.currentRole !== 'manager') {
      toast.error('Only Manager/Admin can void entries.'); return;
    }
    const orig = folioTxs.find(t => t.id === voidId || t.id.includes(voidId));
    if (!orig) { toast.error('Transaction not found'); return; }
    if (orig.type === 'void') { toast.error('Already voided'); return; }

    addTransaction({
      id: generateId('void'),
      folioId: orig.folioId,
      date: config.systemDate,
      category: orig.category,
      description: `VOID: ${orig.description} | Reason: ${voidReason}`,
      amount: -orig.amount,
      type: 'void',
      voidRef: orig.id,
      voidReason,
      postedBy: config.currentUser,
      timestamp: new Date().toISOString(),
      printed: false,
    });
    toast.success(t('voidSuccess'));
    setVoidId(''); setVoidReason(''); setVoidMode(false);
  };

  const inp = (style?: object) => ({
    background: colors.bgInput,
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
    padding: '9px 12px',
    color: colors.text,
    fontSize: 13,
    boxSizing: 'border-box' as const,
    ...style,
  });

  return (
    <div style={{ padding: 20, display: 'flex', gap: 16, height: '100%', overflow: 'auto', background: colors.bg }}>
      {/* Left: entry forms */}
      <div style={{ width: 420, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Mode tabs */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[{ key: false, label: 'Manual Post', icon: <Keyboard size={12} /> }, { key: true, label: 'Auto-Hit', icon: <Zap size={12} /> }].map(m => (
            <button key={String(m.key)} onClick={() => setAutoHitMode(m.key)}
              style={{ flex: 1, background: autoHitMode === m.key ? colors.primary : colors.bgCard, color: autoHitMode === m.key ? '#fff' : colors.textSecondary, border: `1px solid ${autoHitMode === m.key ? colors.primary : colors.border}`, borderRadius: 6, padding: '7px', cursor: 'pointer', fontSize: 12, display: 'flex', gap: 5, alignItems: 'center', justifyContent: 'center' }}>
              {m.icon}{m.label}
            </button>
          ))}
        </div>

        {!autoHitMode ? (
          <div style={{ background: colors.bgCard, borderRadius: 10, border: `1px solid ${colors.border}`, padding: 18, display: 'flex', flexDirection: 'column', gap: 11, boxShadow: theme === 'light' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none' }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '5px 8px', background: colors.bgSecondary, borderRadius: 5, fontSize: 10, color: colors.textMuted }}>
              <Keyboard size={11} /> Enter key moves to next field — keyboard optimized
            </div>

            {/* Room */}
            <div>
              <label style={{ fontSize: 11, color: colors.textMuted, display: 'block', marginBottom: 4 }}>{t('room')} No.</label>
              <input ref={roomRef} value={roomNo} onChange={e => setRoomNo(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { if (!activeRoom) toast.error('Room not found'); else if (!activeFolio) toast.error('No in-house guest'); else catRef.current?.focus(); }}}
                placeholder={`${t('room')} number + Enter`} style={{ ...inp({ width: '100%', fontSize: 16, fontFamily: 'monospace', fontWeight: 700, borderColor: activeRoom ? colors.success : colors.border }) }} />
            </div>

            {/* Guest info banner */}
            {activeFolio && activeGuest && (
              <div style={{ padding: '8px 10px', background: colors.successBg, border: `1px solid ${colors.success}44`, borderRadius: 7, fontSize: 11 }}>
                <div style={{ color: colors.success, fontWeight: 700 }}>{activeGuest.name}</div>
                <div style={{ color: colors.textMuted, display: 'flex', gap: 12 }}>
                  <span>{activeFolio.checkIn} → {activeFolio.checkOut}</span>
                  <span>{activeFolio.mealPlan}</span>
                  <span style={{ color: balance > 0 ? colors.danger : colors.success }}>৳{balance.toLocaleString()}</span>
                </div>
              </div>
            )}
            {activeRoom && !activeFolio && (
              <div style={{ padding: '8px 10px', background: colors.dangerBg, border: `1px solid ${colors.danger}44`, borderRadius: 7, display: 'flex', gap: 6, alignItems: 'center', fontSize: 11 }}>
                <AlertTriangle size={13} color={colors.danger} /><span style={{ color: colors.danger }}>No in-house guest. Cannot post.</span>
              </div>
            )}

            {/* Category */}
            <div>
              <label style={{ fontSize: 11, color: colors.textMuted, display: 'block', marginBottom: 4 }}>Category</label>
              <select ref={catRef} value={category} onChange={e => setCategory(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') descRef.current?.focus(); }}
                disabled={!activeFolio}
                style={{ ...inp({ width: '100%', opacity: activeFolio ? 1 : 0.4 }) }}>
                <option value="">— Select —</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Description */}
            <div>
              <label style={{ fontSize: 11, color: colors.textMuted, display: 'block', marginBottom: 4 }}>Description (optional)</label>
              <input ref={descRef} value={description} onChange={e => setDescription(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') amtRef.current?.focus(); }}
                disabled={!activeFolio} placeholder="Details..."
                style={{ ...inp({ width: '100%', opacity: activeFolio ? 1 : 0.4 }) }} />
            </div>

            {/* Amount + payment mode */}
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 2 }}>
                <label style={{ fontSize: 11, color: colors.textMuted, display: 'block', marginBottom: 4 }}>Amount (৳)</label>
                <input ref={amtRef} type="number" value={amount} onChange={e => setAmount(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handlePost(); }}
                  disabled={!activeFolio} placeholder="0.00"
                  style={{ ...inp({ width: '100%', fontSize: 16, fontFamily: 'monospace', fontWeight: 700, color: colors.warning, opacity: activeFolio ? 1 : 0.4 }) }} />
              </div>
              {isPayment && (
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: colors.textMuted, display: 'block', marginBottom: 4 }}>Mode</label>
                  <select value={payMode} onChange={e => setPayMode(e.target.value)} style={{ ...inp({ width: '100%', fontSize: 12 }) }}>
                    <option>Cash</option><option>Card</option><option>bKash</option><option>Nagad</option><option>Rocket</option><option>Bank</option>
                  </select>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <button onClick={handlePost} disabled={!activeFolio || !category || !amount}
              style={{ background: isPayment ? colors.success : colors.primary, color: isPayment ? (theme === 'light' ? '#fff' : '#000') : '#fff', border: 'none', borderRadius: 7, padding: '11px', cursor: 'pointer', fontSize: 14, fontWeight: 700, opacity: (!activeFolio || !category || !amount) ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <CheckCircle size={15} /> {isPayment ? 'Receive Payment' : t('postCharge')} (Enter)
            </button>

            {/* Utility row */}
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setVoidMode(v => !v)}
                style={{ flex: 1, background: voidMode ? colors.dangerBg : colors.bgSecondary, color: voidMode ? colors.danger : colors.textMuted, border: `1px solid ${voidMode ? colors.danger + '44' : colors.border}`, borderRadius: 6, padding: '7px', cursor: 'pointer', fontSize: 11, display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'center' }}>
                <Ban size={11} /> Void Mode
              </button>
              {activeFolio && (
                <button onClick={() => setShowTransfer(true)}
                  style={{ flex: 1, background: colors.bgSecondary, color: colors.textMuted, border: `1px solid ${colors.border}`, borderRadius: 6, padding: '7px', cursor: 'pointer', fontSize: 11, display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'center' }}>
                  <ArrowRightLeft size={11} /> Room Transfer
                </button>
              )}
            </div>
          </div>
        ) : (
          /* AUTO-HIT MODE */
          <div style={{ background: colors.bgCard, borderRadius: 10, border: `1px solid ${colors.warning}44`, padding: 18, display: 'flex', flexDirection: 'column', gap: 11, boxShadow: theme === 'light' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none' }}>
            <div style={{ fontSize: 12, color: colors.warning, fontWeight: 600, display: 'flex', gap: 6, alignItems: 'center' }}>
              <Zap size={14} /> Auto-Hit: Post department charges directly to guest room account
            </div>
            <div>
              <label style={{ fontSize: 11, color: colors.textMuted, display: 'block', marginBottom: 4 }}>Department</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['Restaurant', 'Spa', 'Laundry'] as const).map(d => (
                  <button key={d} onClick={() => setAutoHitDept(d)}
                    style={{ flex: 1, background: autoHitDept === d ? colors.warningBg : colors.bgSecondary, color: autoHitDept === d ? colors.warning : colors.textSecondary, border: `1px solid ${autoHitDept === d ? colors.warning + '44' : colors.border}`, borderRadius: 6, padding: '7px', cursor: 'pointer', fontSize: 12, fontWeight: autoHitDept === d ? 700 : 400 }}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: colors.textMuted, display: 'block', marginBottom: 4 }}>Room Number</label>
              <input value={autoHitRoomNo} onChange={e => setAutoHitRoomNo(e.target.value)} placeholder="Enter room no."
                style={{ ...inp({ width: '100%', fontFamily: 'monospace', fontWeight: 700, fontSize: 15 }) }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 2 }}>
                <label style={{ fontSize: 11, color: colors.textMuted, display: 'block', marginBottom: 4 }}>Amount (৳)</label>
                <input type="number" value={autoHitAmt} onChange={e => setAutoHitAmt(e.target.value)} placeholder="0.00"
                  style={{ ...inp({ width: '100%', fontFamily: 'monospace', fontWeight: 700, fontSize: 15, color: colors.warning }) }} />
              </div>
              <div style={{ flex: 2 }}>
                <label style={{ fontSize: 11, color: colors.textMuted, display: 'block', marginBottom: 4 }}>Description</label>
                <input value={autoHitDesc} onChange={e => setAutoHitDesc(e.target.value)} placeholder="Table order, service..."
                  style={{ ...inp({ width: '100%' }) }} />
              </div>
            </div>
            <button onClick={handleAutoHit}
              style={{ background: colors.warning, color: '#000', border: 'none', borderRadius: 7, padding: '11px', cursor: 'pointer', fontSize: 13, fontWeight: 800, display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={14} /> Post Auto-Hit to Room
            </button>
          </div>
        )}

        {/* Void mode panel */}
        {voidMode && !autoHitMode && (
          <div style={{ background: colors.bgCard, borderRadius: 10, border: `1px solid ${colors.danger}33`, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 12, color: colors.danger, fontWeight: 600, display: 'flex', gap: 5, alignItems: 'center' }}><Ban size={13} /> Void Mode — Manager/Admin Only</div>
            <input value={voidId} onChange={e => setVoidId(e.target.value)} placeholder="Transaction ID (partial ID ok)"
              style={{ ...inp({ background: colors.dangerBg, borderColor: colors.danger + '44' }) }} />
            <input value={voidReason} onChange={e => setVoidReason(e.target.value)} placeholder="Void reason (mandatory)"
              style={{ ...inp({ background: colors.dangerBg, borderColor: colors.danger + '44' }) }} />
            <button onClick={handleVoid} style={{ background: colors.danger, color: '#fff', border: 'none', borderRadius: 6, padding: '9px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
              Confirm Void
            </button>
          </div>
        )}
      </div>

      {/* Right: Ledger */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
        {activeFolio && (
          <div style={{ background: colors.bgCard, borderRadius: 10, border: `1px solid ${colors.border}`, overflow: 'hidden', boxShadow: theme === 'light' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none' }}>
            <div style={{ padding: '10px 14px', background: colors.bgSecondary, fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: `1px solid ${colors.border}` }}>
              Room {roomNo} — Ledger ({activeFolio.referenceNo})
            </div>
            <div style={{ maxHeight: 360, overflow: 'auto' }}>
              {folioTxs.length === 0 && <div style={{ padding: 16, textAlign: 'center', color: colors.textMuted, fontSize: 12 }}>No transactions</div>}
              {folioTxs.map(tx => (
                <div key={tx.id} style={{ display: 'grid', gridTemplateColumns: '90px 130px 1fr 120px', padding: '8px 14px', borderTop: `1px solid ${colors.borderLight}`, fontSize: 11, alignItems: 'center', gap: 8, opacity: tx.type === 'void' ? 0.5 : 1 }}>
                  <span style={{ color: colors.textMuted, fontFamily: 'monospace' }}>{tx.date}</span>
                  <span style={{ color: tx.type === 'void' ? colors.danger : tx.type === 'payment' ? colors.success : colors.primary }}>
                    {tx.type === 'void' ? '⊘ ' : ''}{tx.category}
                  </span>
                  <span style={{ color: colors.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description}</span>
                  <span style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: tx.amount < 0 ? colors.success : tx.type === 'void' ? colors.danger : colors.text }}>
                    {tx.amount < 0 ? '-' : '+'}৳{Math.abs(tx.amount).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ padding: '10px 14px', borderTop: `2px solid ${colors.border}`, display: 'flex', justifyContent: 'flex-end', gap: 16, background: colors.bgSecondary }}>
              <span style={{ fontSize: 12, color: colors.textMuted }}>Net Balance:</span>
              <span style={{ fontSize: 15, fontWeight: 800, fontFamily: 'monospace', color: balance > 0 ? colors.danger : colors.success }}>
                ৳{balance.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* All in-house quick list */}
        <div style={{ background: colors.bgCard, borderRadius: 10, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', background: colors.bgSecondary, fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            In-House Rooms — Quick Reference
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', padding: 10, gap: 6 }}>
            {folios.filter(f => f.status === 'inhouse').map(f => {
              const r = rooms.find(rm => rm.id === f.roomId);
              const g = guests.find(gst => gst.id === f.guestId);
              const bal = getFolioBalance(f.id);
              return (
                <button key={f.id} onClick={() => { if (r) setRoomNo(r.number); }}
                  style={{ background: colors.bgSecondary, border: `1px solid ${bal > 0 ? colors.danger + '55' : colors.border}`, borderRadius: 7, padding: '8px 10px', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: colors.primary, fontFamily: 'monospace' }}>{r?.number}</div>
                  <div style={{ fontSize: 10, color: colors.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g?.name}</div>
                  <div style={{ fontSize: 10, fontFamily: 'monospace', color: bal > 0 ? colors.danger : colors.success }}>৳{bal.toLocaleString()}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {showTransfer && activeFolio && (
        <RoomTransferModal folio={activeFolio} onClose={() => setShowTransfer(false)} />
      )}
    </div>
  );
}
