import { MdClose, MdPhone, MdCreditCard, MdHotel, MdLogout, MdPrint, MdEventAvailable } from 'react-icons/md';
import { TbArrowsRightLeft } from 'react-icons/tb';
import { useNavigate } from 'react-router-dom';

interface GuestPanelProps {
  roomContext: any;
  loading: boolean;
  onClose: () => void;
}

export default function GuestPanel({ roomContext, loading, onClose }: GuestPanelProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="h-full bg-[#141416] border-l border-gray-800 rounded-l-xl flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#aa8453] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!roomContext) return null;

  const isOccupied = !!roomContext.occupant;

  const statusColor: Record<string, string> = {
    OCCUPIED: '#ef4444',
    VACANT: '#22c55e',
    RESERVED: '#3b82f6',
    MAINTENANCE: '#a78bfa',
  };
  const accent = statusColor[roomContext.status] || '#aa8453';

  return (
    <div className="h-full bg-[#141416] border-l border-gray-800 rounded-l-xl flex flex-col overflow-hidden">
      {/* Header */}
      <div
        className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-3 shrink-0"
        style={{ borderLeftColor: accent, borderLeftWidth: 3 }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-lg font-bold font-mono text-white">{roomContext.room_number}</span>
            <span
              className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{ color: accent, backgroundColor: `${accent}15` }}
            >
              {roomContext.status}
            </span>
          </div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider truncate">{roomContext.room_type}</div>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white p-1 rounded transition-colors hover:bg-white/[0.06]">
          <MdClose size={16} />
        </button>
      </div>

      {isOccupied ? (
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {/* Guest name hero */}
          <div>
            <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Guest</div>
            <div className="text-base font-bold text-white leading-tight">{roomContext.occupant.guest_name}</div>
            <span className="inline-block mt-1.5 text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
              In-House
            </span>
          </div>

          {/* Preferences */}
          {roomContext.occupant.guest_preferences && (
            <div className="px-3 py-2 bg-[#aa8453]/5 rounded-md border-l-2 border-[#aa8453] text-[11px] text-[#d4a574] leading-relaxed">
              ⭐ {roomContext.occupant.guest_preferences}
            </div>
          )}

          {/* Details card */}
          <div className="bg-[#0c0c0e] rounded-lg p-3 flex flex-col gap-2 text-[11px]">
            <div className="flex justify-between items-center text-gray-500">
              <span className="flex items-center gap-1.5"><MdCreditCard size={11} /> Booking</span>
              <span className="text-gray-300 font-mono text-[10px]">{roomContext.occupant.booking_ref}</span>
            </div>
            <div className="h-px bg-white/[0.04]" />
            <div className="flex justify-between items-center text-gray-500">
              <span>Check-in</span>
              <span className="text-green-400 font-mono text-[10px]">{roomContext.occupant.check_in}</span>
            </div>
            <div className="flex justify-between items-center text-gray-500">
              <span>Check-out</span>
              <span className="text-red-400 font-mono text-[10px]">{roomContext.occupant.check_out}</span>
            </div>
            <div className="h-px bg-white/[0.04]" />
            <div className="flex justify-between items-center text-gray-500">
              <span className="flex items-center gap-1.5"><MdPhone size={11} /> Phone</span>
              <span className="text-gray-300">On file</span>
            </div>
          </div>

          {/* Balance */}
          <div className="bg-[#0c0c0e] rounded-lg p-3 text-center">
            <div className="text-[9px] text-gray-600 uppercase tracking-wider mb-1.5">Balance Due</div>
            <div className={`text-xl font-bold font-mono ${roomContext.occupant.balance_due > 0 ? 'text-red-400' : 'text-green-400'}`}>
              ৳ {roomContext.occupant.balance_due.toLocaleString()}
            </div>
            <div className={`text-[9px] mt-1 ${roomContext.occupant.balance_due > 0 ? 'text-red-500/60' : 'text-green-500/60'}`}>
              {roomContext.occupant.balance_due > 0 ? 'Outstanding' : 'Fully Settled'}
            </div>
          </div>

          {/* Actions — pinned to bottom */}
          <div className="flex flex-col gap-1.5 mt-auto pt-2">
            <button className="w-full bg-red-500/80 hover:bg-red-500 text-white rounded-md py-2 flex items-center justify-center gap-1.5 text-xs font-bold transition-colors">
              <MdLogout size={14} /> Check Out
            </button>
            <div className="flex gap-1.5">
              <button className="flex-1 bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 border border-white/[0.06] rounded-md py-1.5 flex items-center justify-center gap-1 text-[10px] transition-colors">
                <MdPrint size={12} /> Invoice
              </button>
              <button className="flex-1 bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 border border-white/[0.06] rounded-md py-1.5 flex items-center justify-center gap-1 text-[10px] transition-colors">
                <TbArrowsRightLeft size={12} /> Transfer
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-3">
          <MdHotel size={28} className="text-gray-700" />
          <div>
            <div className="text-xs text-gray-500">Room is currently</div>
            <div className="text-sm font-bold mt-0.5" style={{ color: accent }}>{roomContext.status}</div>
          </div>
          <button
            onClick={() => navigate('/admin/front-desk?action=walkin')}
            className="w-full mt-2 bg-[#aa8453] hover:bg-[#c49b63] text-white text-xs font-semibold py-2 rounded-md flex items-center justify-center gap-1.5 transition-colors"
          >
            <MdEventAvailable size={14} /> Walk-in Booking
          </button>
        </div>
      )}
    </div>
  );
}
