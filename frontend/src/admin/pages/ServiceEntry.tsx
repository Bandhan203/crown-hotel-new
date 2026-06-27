import { useState, useRef, useEffect, useCallback } from 'react';
import { MdKeyboard, MdWarning, MdCheckCircle, MdBlock, MdFlashOn, MdSwapHoriz, MdReceipt, MdPrint } from 'react-icons/md';
import toast from 'react-hot-toast';

// ─── Types ───
type RoomStatus = 'vacant' | 'occupied' | 'dirty' | 'reserved' | 'maintenance';
type MealPlan = 'EP' | 'CP' | 'MAP' | 'AP';
type TransactionType = 'charge' | 'payment' | 'void';
type FolioStatus = 'reserved' | 'inhouse' | 'checkedout';

interface PMSRoom { id: string; number: string; type: string; floor: number; status: RoomStatus; ratePerNight: number; maxOccupancy: number; }
interface PMSGuest { id: string; phone: string; name: string; nationality: string; vipLevel: number; }
interface PMSFolio { id: string; referenceNo: string; guestId: string; roomId: string; checkIn: string; checkOut: string; mealPlan: MealPlan; status: FolioStatus; adults: number; children: number; advancePaid: number; createdBy: string; }
interface PMSTransaction { id: string; folioId: string; date: string; category: string; description: string; amount: number; type: TransactionType; voidRef?: string; voidReason?: string; postedBy: string; timestamp: string; printed: boolean; }

// ─── Initial seed data ───
const SEED_ROOMS: PMSRoom[] = [
  { id: 'r101', number: '101', type: 'Single', floor: 1, status: 'occupied', ratePerNight: 2500, maxOccupancy: 1 },
  { id: 'r102', number: '102', type: 'Double', floor: 1, status: 'vacant', ratePerNight: 3500, maxOccupancy: 2 },
  { id: 'r103', number: '103', type: 'Double', floor: 1, status: 'dirty', ratePerNight: 3500, maxOccupancy: 2 },
  { id: 'r104', number: '104', type: 'Single', floor: 1, status: 'reserved', ratePerNight: 2500, maxOccupancy: 1 },
  { id: 'r105', number: '105', type: 'Double', floor: 1, status: 'vacant', ratePerNight: 3500, maxOccupancy: 2 },
  { id: 'r106', number: '106', type: 'Single', floor: 1, status: 'occupied', ratePerNight: 2500, maxOccupancy: 1 },
  { id: 'r201', number: '201', type: 'Deluxe', floor: 2, status: 'occupied', ratePerNight: 5000, maxOccupancy: 2 },
  { id: 'r202', number: '202', type: 'Deluxe', floor: 2, status: 'vacant', ratePerNight: 5000, maxOccupancy: 2 },
  { id: 'r205', number: '205', type: 'Double', floor: 2, status: 'occupied', ratePerNight: 3500, maxOccupancy: 2 },
  { id: 'r301', number: '301', type: 'Suite', floor: 3, status: 'occupied', ratePerNight: 8000, maxOccupancy: 4 },
  { id: 'r305', number: '305', type: 'Single', floor: 3, status: 'occupied', ratePerNight: 2500, maxOccupancy: 1 },
  { id: 'r308', number: '308', type: 'Deluxe', floor: 3, status: 'occupied', ratePerNight: 5000, maxOccupancy: 2 },
  { id: 'r402', number: '402', type: 'Deluxe', floor: 4, status: 'occupied', ratePerNight: 5000, maxOccupancy: 2 },
  { id: 'r407', number: '407', type: 'Suite', floor: 4, status: 'occupied', ratePerNight: 8000, maxOccupancy: 4 },
  { id: 'r410', number: '410', type: 'Deluxe', floor: 4, status: 'occupied', ratePerNight: 5000, maxOccupancy: 2 },
];

const SEED_GUESTS: PMSGuest[] = [
  { id: 'g001', phone: '01711000001', name: 'রাহুল আহমেদ', nationality: 'Bangladeshi', vipLevel: 2 },
  { id: 'g002', phone: '01711000002', name: 'সারা খান', nationality: 'Bangladeshi', vipLevel: 1 },
  { id: 'g003', phone: '01711000003', name: 'Mohammed Al-Rashid', nationality: 'Saudi Arabian', vipLevel: 3 },
  { id: 'g004', phone: '01711000004', name: 'করিম উদ্দিন', nationality: 'Bangladeshi', vipLevel: 0 },
  { id: 'g005', phone: '01711000005', name: 'Priya Sharma', nationality: 'Indian', vipLevel: 1 },
  { id: 'g006', phone: '01711000006', name: 'John Williams', nationality: 'American', vipLevel: 2 },
  { id: 'g007', phone: '01711000007', name: 'আব্দুল করিম', nationality: 'Bangladeshi', vipLevel: 0 },
];

const today = new Date().toISOString().split('T')[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
const dayAfter = new Date(Date.now() + 172800000).toISOString().split('T')[0];

const SEED_FOLIOS: PMSFolio[] = [
  { id: 'f001', referenceNo: 'CRN-2024-0001', guestId: 'g001', roomId: 'r101', checkIn: yesterday, checkOut: tomorrow, mealPlan: 'CP', status: 'inhouse', adults: 1, children: 0, advancePaid: 2500, createdBy: 'receptionist' },
  { id: 'f002', referenceNo: 'CRN-2024-0002', guestId: 'g003', roomId: 'r201', checkIn: yesterday, checkOut: dayAfter, mealPlan: 'AP', status: 'inhouse', adults: 2, children: 1, advancePaid: 10000, createdBy: 'manager' },
  { id: 'f003', referenceNo: 'CRN-2024-0003', guestId: 'g002', roomId: 'r205', checkIn: today, checkOut: tomorrow, mealPlan: 'EP', status: 'inhouse', adults: 1, children: 0, advancePaid: 1500, createdBy: 'receptionist' },
  { id: 'f004', referenceNo: 'CRN-2024-0004', guestId: 'g004', roomId: 'r106', checkIn: yesterday, checkOut: today, mealPlan: 'CP', status: 'inhouse', adults: 1, children: 0, advancePaid: 2000, createdBy: 'receptionist' },
  { id: 'f005', referenceNo: 'CRN-2024-0005', guestId: 'g005', roomId: 'r301', checkIn: yesterday, checkOut: dayAfter, mealPlan: 'MAP', status: 'inhouse', adults: 2, children: 0, advancePaid: 5000, createdBy: 'receptionist' },
  { id: 'f006', referenceNo: 'CRN-2024-0006', guestId: 'g006', roomId: 'r402', checkIn: today, checkOut: dayAfter, mealPlan: 'EP', status: 'inhouse', adults: 1, children: 0, advancePaid: 3000, createdBy: 'receptionist' },
  { id: 'f007', referenceNo: 'CRN-2024-0007', guestId: 'g001', roomId: 'r305', checkIn: today, checkOut: dayAfter, mealPlan: 'CP', status: 'inhouse', adults: 1, children: 0, advancePaid: 2000, createdBy: 'receptionist' },
  { id: 'f008', referenceNo: 'CRN-2024-0008', guestId: 'g007', roomId: 'r308', checkIn: today, checkOut: dayAfter, mealPlan: 'CP', status: 'inhouse', adults: 1, children: 0, advancePaid: 2500, createdBy: 'receptionist' },
  { id: 'f009', referenceNo: 'CRN-2024-0009', guestId: 'g006', roomId: 'r407', checkIn: yesterday, checkOut: dayAfter, mealPlan: 'EP', status: 'inhouse', adults: 2, children: 0, advancePaid: 6000, createdBy: 'manager' },
  { id: 'f010', referenceNo: 'CRN-2024-0010', guestId: 'g004', roomId: 'r410', checkIn: yesterday, checkOut: tomorrow, mealPlan: 'EP', status: 'inhouse', adults: 1, children: 0, advancePaid: 1500, createdBy: 'receptionist' },
];

const SEED_TXS: PMSTransaction[] = [
  { id: 't001', folioId: 'f001', date: yesterday, category: 'Room Rent', description: 'Room 101 - Single - 1 Night', amount: 2500, type: 'charge', postedBy: 'system', timestamp: yesterday + 'T23:59:00Z', printed: true },
  { id: 't002', folioId: 'f001', date: yesterday, category: 'Payment', description: 'Advance Payment - Cash', amount: -2500, type: 'payment', postedBy: 'receptionist', timestamp: yesterday + 'T10:00:00Z', printed: true },
  { id: 't003', folioId: 'f001', date: today, category: 'Restaurant', description: 'Breakfast - 2 persons', amount: 600, type: 'charge', postedBy: 'restaurant', timestamp: today + 'T08:30:00Z', printed: true },
  { id: 't004', folioId: 'f002', date: yesterday, category: 'Room Rent', description: 'Room 201 - Deluxe - 1 Night', amount: 5000, type: 'charge', postedBy: 'system', timestamp: yesterday + 'T23:59:00Z', printed: true },
  { id: 't005', folioId: 'f002', date: yesterday, category: 'Payment', description: 'Advance Payment - Card', amount: -10000, type: 'payment', postedBy: 'manager', timestamp: yesterday + 'T12:00:00Z', printed: true },
  { id: 't006', folioId: 'f002', date: today, category: 'Restaurant', description: 'Lunch - 3 persons', amount: 1800, type: 'charge', postedBy: 'restaurant', timestamp: today + 'T13:00:00Z', printed: false },
  { id: 't007', folioId: 'f002', date: today, category: 'Spa', description: 'Spa Service', amount: 2500, type: 'charge', postedBy: 'spa', timestamp: today + 'T11:00:00Z', printed: false },
  { id: 't008', folioId: 'f003', date: today, category: 'Payment', description: 'Advance Payment - Cash', amount: -1500, type: 'payment', postedBy: 'receptionist', timestamp: today + 'T08:00:00Z', printed: true },
  { id: 't009', folioId: 'f004', date: yesterday, category: 'Room Rent', description: 'Room 106 - Single - 1 Night', amount: 2500, type: 'charge', postedBy: 'system', timestamp: yesterday + 'T23:59:00Z', printed: true },
  { id: 't010', folioId: 'f004', date: yesterday, category: 'Payment', description: 'Advance Payment - Cash', amount: -2000, type: 'payment', postedBy: 'receptionist', timestamp: yesterday + 'T14:00:00Z', printed: true },
  { id: 't011', folioId: 'f005', date: yesterday, category: 'Room Rent', description: 'Room 301 - Suite - 1 Night', amount: 8000, type: 'charge', postedBy: 'system', timestamp: yesterday + 'T23:59:00Z', printed: true },
  { id: 't012', folioId: 'f005', date: yesterday, category: 'Payment', description: 'Advance Payment - Card', amount: -5000, type: 'payment', postedBy: 'receptionist', timestamp: yesterday + 'T15:00:00Z', printed: true },
  { id: 't013', folioId: 'f006', date: today, category: 'Payment', description: 'Advance Payment - bKash', amount: -3000, type: 'payment', postedBy: 'receptionist', timestamp: today + 'T09:00:00Z', printed: true },
];

const CATEGORIES = ['Room Rent', 'Restaurant', 'Laundry', 'Telephone', 'Transport', 'Minibar', 'Spa', 'Damage', 'Miscellaneous', 'Adjustment', 'Payment'];

// ─── Hooks ───
function usePMSStorage<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
  const [val, setVal] = useState<T>(() => { try { const item = localStorage.getItem(key); return item ? JSON.parse(item) : initial; } catch { return initial; } });
  const setter = (value: T | ((p: T) => T)) => { try { const v = value instanceof Function ? value(val) : value; setVal(v); localStorage.setItem(key, JSON.stringify(v)); } catch (e) { console.error(e); } };
  return [val, setter];
}

function genId(prefix = 'id') { return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`; }

// ─── Room Transfer Modal ───
function RoomTransferModal({ folio, rooms, onTransfer, onClose }: { folio: PMSFolio; rooms: PMSRoom[]; onTransfer: (fromId: string, toId: string) => void; onClose: () => void; }) {
  const [targetRoomId, setTargetRoomId] = useState('');
  const currentRoom = rooms.find(r => r.id === folio.roomId);
  const vacantRooms = rooms.filter(r => r.status === 'vacant' && r.id !== folio.roomId);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl w-[460px] p-6">
        <div className="flex items-center gap-2 mb-4">
          <MdSwapHoriz size={18} className="text-[#aa8453]" />
          <h3 className="text-white font-semibold flex-1">Room Transfer</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition">✕</button>
        </div>

        <div className="bg-white/5 rounded-lg p-3 mb-4">
          <div className="text-gray-500 text-xs mb-1">Current Room</div>
          <div className="text-2xl font-bold text-[#aa8453] font-mono">{currentRoom?.number}</div>
          <div className="text-gray-400 text-xs">{currentRoom?.type} — ৳{currentRoom?.ratePerNight.toLocaleString()}/night</div>
        </div>

        <div className="mb-4">
          <label className="text-gray-500 text-xs block mb-2">Transfer To (Vacant Rooms)</label>
          <div className="grid grid-cols-4 gap-2 max-h-48 overflow-auto">
            {vacantRooms.map(r => (
              <button key={r.id} onClick={() => setTargetRoomId(r.id)}
                className={`text-left p-2 rounded-lg border-2 transition ${targetRoomId === r.id ? 'bg-green-500/10 border-green-500/50' : 'bg-white/5 border-white/10 hover:border-white/20'}`}>
                <div className="text-sm font-bold font-mono text-green-400">{r.number}</div>
                <div className="text-[9px] text-gray-500">{r.type} · F{r.floor}</div>
                <div className="text-[9px] text-gray-400">৳{r.ratePerNight.toLocaleString()}</div>
              </button>
            ))}
          </div>
          {vacantRooms.length === 0 && <div className="text-center text-gray-500 text-xs py-4">No vacant rooms available</div>}
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4 text-xs text-yellow-400">
          ⚠️ Current room will be marked Dirty. All charges stay on the same folio.
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 bg-white/10 text-gray-400 rounded-lg py-2.5 text-sm hover:bg-white/15 transition">Cancel</button>
          <button onClick={() => { if (targetRoomId) { onTransfer(folio.roomId, targetRoomId); onClose(); } }} disabled={!targetRoomId}
            className={`flex-[2] bg-[#aa8453] text-white rounded-lg py-2.5 text-sm font-bold transition ${!targetRoomId ? 'opacity-40' : 'hover:bg-[#8c6c44]'}`}>
            Confirm Transfer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───
export default function ServiceEntry() {
  const [rooms, setRooms] = usePMSStorage<PMSRoom[]>('pms_rooms', SEED_ROOMS);
  const [guests] = usePMSStorage<PMSGuest[]>('pms_guests', SEED_GUESTS);
  const [folios, setFolios] = usePMSStorage<PMSFolio[]>('pms_folios', SEED_FOLIOS);
  const [transactions, setTransactions] = usePMSStorage<PMSTransaction[]>('pms_transactions', SEED_TXS);

  const [roomNo, setRoomNo] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [payMode, setPayMode] = useState('Cash');
  const [voidId, setVoidId] = useState('');
  const [voidReason, setVoidReason] = useState('');
  const [voidMode, setVoidMode] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [autoHitMode, setAutoHitMode] = useState(false);
  const [autoHitRoomNo, setAutoHitRoomNo] = useState('');
  const [autoHitDept, setAutoHitDept] = useState<'Restaurant' | 'Spa' | 'Laundry'>('Restaurant');
  const [autoHitAmt, setAutoHitAmt] = useState('');
  const [autoHitDesc, setAutoHitDesc] = useState('');

  const roomRef = useRef<HTMLInputElement>(null);
  const catRef = useRef<HTMLSelectElement>(null);
  const descRef = useRef<HTMLInputElement>(null);
  const amtRef = useRef<HTMLInputElement>(null);

  useEffect(() => { roomRef.current?.focus(); }, []);

  const activeRoom = rooms.find(r => r.number === roomNo);
  const activeFolio = activeRoom ? folios.find(f => f.roomId === activeRoom.id && f.status === 'inhouse') : undefined;
  const activeGuest = activeFolio ? guests.find(g => g.id === activeFolio.guestId) : undefined;
  const folioTxs = activeFolio ? transactions.filter(t => t.folioId === activeFolio.id) : [];
  const balance = folioTxs.reduce((s, t) => s + t.amount, 0);
  const isPayment = category === 'Payment' || category === 'Adjustment';
  const systemDate = today;

  const handlePost = () => {
    if (!activeFolio) { toast.error('No in-house folio found'); return; }
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) { toast.error('Invalid amount'); return; }
    if (!category) { toast.error('Category required'); return; }

    const tx: PMSTransaction = {
      id: genId('tx'), folioId: activeFolio.id, date: systemDate, category,
      description: description || (isPayment ? `${category} - ${payMode}` : category),
      amount: isPayment ? -amt : amt, type: isPayment ? 'payment' : 'charge',
      postedBy: 'Front Desk', timestamp: new Date().toISOString(), printed: false,
    };
    setTransactions(p => [...p, tx]);
    toast.success(`Posted: ${category} ৳${amt.toLocaleString()}`);
    setCategory(''); setDescription(''); setAmount('');
    roomRef.current?.focus();
  };

  const handleAutoHit = () => {
    const ahRoom = rooms.find(r => r.number === autoHitRoomNo);
    const ahFolio = ahRoom ? folios.find(f => f.roomId === ahRoom.id && f.status === 'inhouse') : undefined;
    if (!ahFolio) { toast.error('No in-house guest in that room'); return; }
    const amt = parseFloat(autoHitAmt);
    if (!amt || isNaN(amt) || amt <= 0) { toast.error('Invalid amount'); return; }
    setTransactions(p => [...p, {
      id: genId('tx'), folioId: ahFolio.id, date: systemDate, category: autoHitDept,
      description: `${autoHitDesc || autoHitDept} (Auto-hit from ${autoHitDept} dept)`,
      amount: amt, type: 'charge', postedBy: autoHitDept.toLowerCase(),
      timestamp: new Date().toISOString(), printed: false,
    }]);
    toast.success(`Auto-hit posted to Room ${autoHitRoomNo} — ৳${amt.toLocaleString()}`);
    setAutoHitRoomNo(''); setAutoHitAmt(''); setAutoHitDesc('');
  };

  const handleVoid = () => {
    if (!voidId.trim()) { toast.error('Enter transaction ID'); return; }
    if (!voidReason.trim()) { toast.error('Void reason required'); return; }
    const orig = folioTxs.find(t => t.id === voidId || t.id.includes(voidId));
    if (!orig) { toast.error('Transaction not found in current folio'); return; }
    if (orig.type === 'void') { toast.error('Already voided'); return; }
    setTransactions(p => [...p, {
      id: genId('void'), folioId: orig.folioId, date: systemDate, category: orig.category,
      description: `VOID: ${orig.description} | Reason: ${voidReason}`,
      amount: -orig.amount, type: 'void', voidRef: orig.id, voidReason,
      postedBy: 'Front Desk', timestamp: new Date().toISOString(), printed: false,
    }]);
    toast.success('Entry voided successfully');
    setVoidId(''); setVoidReason(''); setVoidMode(false);
  };

  const handleTransfer = (fromId: string, toId: string) => {
    if (!activeFolio) return;
    setFolios(p => p.map(f => f.id === activeFolio.id ? { ...f, roomId: toId } : f));
    setRooms(p => p.map(r => r.id === fromId ? { ...r, status: 'dirty' as RoomStatus } : r.id === toId ? { ...r, status: 'occupied' as RoomStatus } : r));
    const targetRoom = rooms.find(r => r.id === toId);
    toast.success(`Room transferred: ${activeRoom?.number} → ${targetRoom?.number}`);
  };

  const inhouseFolios = folios.filter(f => f.status === 'inhouse');

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <MdReceipt className="text-[#aa8453]" size={24} />
          Service Entry & Billing
        </h1>
        <div className="text-xs font-mono bg-white/5 text-gray-400 px-3 py-1.5 rounded-lg border border-white/10">
          System Date: <span className="text-yellow-400 font-bold">{systemDate}</span>
        </div>
      </div>

      <div className="flex gap-4" style={{ height: 'calc(100vh - 160px)' }}>
        {/* ─── Left: Entry Forms ─── */}
        <div className="w-[420px] shrink-0 flex flex-col gap-3 overflow-auto">
          {/* Mode toggle */}
          <div className="flex gap-2">
            <button onClick={() => setAutoHitMode(false)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition ${!autoHitMode ? 'bg-[#aa8453] text-white border-[#aa8453]' : 'bg-[#1a1a1a] text-gray-400 border-white/10 hover:border-white/20'}`}>
              <MdKeyboard size={14} /> Manual Post
            </button>
            <button onClick={() => setAutoHitMode(true)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition ${autoHitMode ? 'bg-yellow-500 text-black border-yellow-500' : 'bg-[#1a1a1a] text-gray-400 border-white/10 hover:border-white/20'}`}>
              <MdFlashOn size={14} /> Auto-Hit
            </button>
          </div>

          {!autoHitMode ? (
            <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4 space-y-3">
              {/* Keyboard hint */}
              <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 text-[10px] text-gray-500">
                <MdKeyboard size={12} /> Enter key moves to next field — keyboard optimized
              </div>

              {/* Room input */}
              <div>
                <label className="text-[11px] text-gray-500 block mb-1">Room No.</label>
                <input ref={roomRef} value={roomNo} onChange={e => setRoomNo(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { if (!activeRoom) toast.error('Room not found'); else if (!activeFolio) toast.error('No in-house guest'); else catRef.current?.focus(); } }}
                  placeholder="Room number + Enter"
                  className={`w-full bg-[#0f0f0f] border rounded-lg px-3 py-2.5 text-white text-base font-mono font-bold focus:outline-none focus:ring-2 transition ${activeRoom ? 'border-green-500/50 focus:ring-green-500/30' : 'border-white/10 focus:ring-[#aa8453]/30'}`} />
              </div>

              {/* Guest info banner */}
              {activeFolio && activeGuest && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2 text-xs">
                  <div className="text-green-400 font-bold">{activeGuest.name}</div>
                  <div className="flex gap-3 text-gray-400">
                    <span>{activeFolio.checkIn} → {activeFolio.checkOut}</span>
                    <span>{activeFolio.mealPlan}</span>
                    <span className={balance > 0 ? 'text-red-400' : 'text-green-400'}>৳{balance.toLocaleString()}</span>
                  </div>
                </div>
              )}
              {activeRoom && !activeFolio && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 flex items-center gap-2 text-xs text-red-400">
                  <MdWarning size={14} /> No in-house guest. Cannot post.
                </div>
              )}

              {/* Category */}
              <div>
                <label className="text-[11px] text-gray-500 block mb-1">Category</label>
                <select ref={catRef} value={category} onChange={e => setCategory(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') descRef.current?.focus(); }}
                  disabled={!activeFolio}
                  className={`w-full bg-[#0f0f0f] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#aa8453]/30 ${!activeFolio ? 'opacity-40' : ''}`}>
                  <option value="">— Select —</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="text-[11px] text-gray-500 block mb-1">Description (optional)</label>
                <input ref={descRef} value={description} onChange={e => setDescription(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') amtRef.current?.focus(); }}
                  disabled={!activeFolio} placeholder="Details..."
                  className={`w-full bg-[#0f0f0f] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#aa8453]/30 ${!activeFolio ? 'opacity-40' : ''}`} />
              </div>

              {/* Amount + payment mode */}
              <div className="flex gap-2">
                <div className="flex-[2]">
                  <label className="text-[11px] text-gray-500 block mb-1">Amount (৳)</label>
                  <input ref={amtRef} type="number" value={amount} onChange={e => setAmount(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handlePost(); }}
                    disabled={!activeFolio} placeholder="0.00"
                    className={`w-full bg-[#0f0f0f] border border-white/10 rounded-lg px-3 py-2.5 text-yellow-400 text-base font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#aa8453]/30 ${!activeFolio ? 'opacity-40' : ''}`} />
                </div>
                {isPayment && (
                  <div className="flex-1">
                    <label className="text-[11px] text-gray-500 block mb-1">Mode</label>
                    <select value={payMode} onChange={e => setPayMode(e.target.value)}
                      className="w-full bg-[#0f0f0f] border border-white/10 rounded-lg px-3 py-2.5 text-white text-xs focus:outline-none">
                      <option>Cash</option><option>Card</option><option>bKash</option><option>Nagad</option><option>Rocket</option><option>Bank</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Post button */}
              <button onClick={handlePost} disabled={!activeFolio || !category || !amount}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition ${isPayment ? 'bg-green-500 hover:bg-green-600 text-black' : 'bg-[#aa8453] hover:bg-[#8c6c44] text-white'} ${(!activeFolio || !category || !amount) ? 'opacity-40 cursor-not-allowed' : ''}`}>
                <MdCheckCircle size={16} /> {isPayment ? 'Receive Payment' : 'Post Charge'} (Enter)
              </button>

              {/* Utility row */}
              <div className="flex gap-2">
                <button onClick={() => setVoidMode(v => !v)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs border transition ${voidMode ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-white/5 text-gray-500 border-white/10 hover:border-white/20'}`}>
                  <MdBlock size={12} /> Void Mode
                </button>
                {activeFolio && (
                  <button onClick={() => setShowTransfer(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs bg-white/5 text-gray-500 border border-white/10 hover:border-white/20 transition">
                    <MdSwapHoriz size={12} /> Room Transfer
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* AUTO-HIT MODE */
            <div className="bg-[#1a1a1a] border border-yellow-500/30 rounded-xl p-4 space-y-3">
              <div className="text-xs text-yellow-400 font-semibold flex items-center gap-2">
                <MdFlashOn size={14} /> Auto-Hit: Post department charges directly to guest room
              </div>
              <div>
                <label className="text-[11px] text-gray-500 block mb-2">Department</label>
                <div className="flex gap-2">
                  {(['Restaurant', 'Spa', 'Laundry'] as const).map(d => (
                    <button key={d} onClick={() => setAutoHitDept(d)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition ${autoHitDept === d ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30 font-bold' : 'bg-white/5 text-gray-400 border-white/10'}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] text-gray-500 block mb-1">Room Number</label>
                <input value={autoHitRoomNo} onChange={e => setAutoHitRoomNo(e.target.value)} placeholder="Enter room no."
                  className="w-full bg-[#0f0f0f] border border-white/10 rounded-lg px-3 py-2.5 text-white font-mono font-bold text-base focus:outline-none focus:ring-2 focus:ring-yellow-500/30" />
              </div>
              <div className="flex gap-2">
                <div className="flex-[2]">
                  <label className="text-[11px] text-gray-500 block mb-1">Amount (৳)</label>
                  <input type="number" value={autoHitAmt} onChange={e => setAutoHitAmt(e.target.value)} placeholder="0.00"
                    className="w-full bg-[#0f0f0f] border border-white/10 rounded-lg px-3 py-2.5 text-yellow-400 font-mono font-bold text-base focus:outline-none focus:ring-2 focus:ring-yellow-500/30" />
                </div>
                <div className="flex-[2]">
                  <label className="text-[11px] text-gray-500 block mb-1">Description</label>
                  <input value={autoHitDesc} onChange={e => setAutoHitDesc(e.target.value)} placeholder="Table order, service..."
                    className="w-full bg-[#0f0f0f] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/30" />
                </div>
              </div>
              <button onClick={handleAutoHit}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-extrabold bg-yellow-500 text-black hover:bg-yellow-400 transition">
                <MdFlashOn size={14} /> Post Auto-Hit to Room
              </button>
            </div>
          )}

          {/* Void mode panel */}
          {voidMode && !autoHitMode && (
            <div className="bg-[#1a1a1a] border border-red-500/20 rounded-xl p-4 space-y-3">
              <div className="text-xs text-red-400 font-semibold flex items-center gap-2">
                <MdBlock size={14} /> Void Mode — Manager/Admin Only
              </div>
              <input value={voidId} onChange={e => setVoidId(e.target.value)} placeholder="Transaction ID (partial ID ok)"
                className="w-full bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30" />
              <input value={voidReason} onChange={e => setVoidReason(e.target.value)} placeholder="Void reason (mandatory)"
                className="w-full bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30" />
              <button onClick={handleVoid} className="w-full bg-red-500 text-white rounded-lg py-2.5 text-sm font-bold hover:bg-red-600 transition">
                Confirm Void
              </button>
            </div>
          )}
        </div>

        {/* ─── Right: Ledger & Quick Reference ─── */}
        <div className="flex-1 flex flex-col gap-3 overflow-auto">
          {/* Folio Ledger */}
          {activeFolio && (
            <div className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-white/5 text-[11px] text-gray-500 uppercase tracking-wider border-b border-white/10 flex items-center justify-between">
                <span>Room {roomNo} — Ledger ({activeFolio.referenceNo})</span>
                <button className="flex items-center gap-1 text-gray-400 hover:text-white transition"><MdPrint size={12} /> Print</button>
              </div>
              <div className="max-h-[360px] overflow-auto">
                {folioTxs.length === 0 && <div className="p-4 text-center text-gray-500 text-xs">No transactions</div>}
                {folioTxs.map(tx => (
                  <div key={tx.id} className={`grid grid-cols-[90px_130px_1fr_120px] px-4 py-2 border-t border-white/5 text-xs items-center gap-2 ${tx.type === 'void' ? 'opacity-50' : ''}`}>
                    <span className="text-gray-500 font-mono">{tx.date}</span>
                    <span className={tx.type === 'void' ? 'text-red-400' : tx.type === 'payment' ? 'text-green-400' : 'text-blue-400'}>
                      {tx.type === 'void' ? '⊘ ' : ''}{tx.category}
                    </span>
                    <span className="text-gray-400 truncate">{tx.description}</span>
                    <span className={`text-right font-mono font-bold ${tx.amount < 0 ? 'text-green-400' : tx.type === 'void' ? 'text-red-400' : 'text-white'}`}>
                      {tx.amount < 0 ? '-' : '+'}৳{Math.abs(tx.amount).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2.5 border-t-2 border-white/10 flex justify-end gap-4 bg-white/5">
                <span className="text-xs text-gray-500">Net Balance:</span>
                <span className={`text-base font-extrabold font-mono ${balance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  ৳{balance.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* In-house quick list */}
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-white/5 text-[11px] text-gray-500 uppercase tracking-wider">
              In-House Rooms — Quick Reference
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] p-2.5 gap-1.5">
              {inhouseFolios.map(f => {
                const r = rooms.find(rm => rm.id === f.roomId);
                const g = guests.find(gst => gst.id === f.guestId);
                const bal = transactions.filter(t => t.folioId === f.id).reduce((s, t) => s + t.amount, 0);
                return (
                  <button key={f.id} onClick={() => { if (r) setRoomNo(r.number); }}
                    className={`text-left bg-white/5 rounded-lg p-2 border transition hover:border-[#aa8453]/50 ${bal > 0 ? 'border-red-500/40' : 'border-white/10'}`}>
                    <div className="text-sm font-extrabold text-[#aa8453] font-mono">{r?.number}</div>
                    <div className="text-[10px] text-gray-400 truncate">{g?.name}</div>
                    <div className={`text-[10px] font-mono ${bal > 0 ? 'text-red-400' : 'text-green-400'}`}>৳{bal.toLocaleString()}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Transfer modal */}
      {showTransfer && activeFolio && (
        <RoomTransferModal folio={activeFolio} rooms={rooms} onTransfer={handleTransfer} onClose={() => setShowTransfer(false)} />
      )}
    </div>
  );
}
