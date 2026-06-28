import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { MdClose } from 'react-icons/md';
import api from '../../services/api';
import { fetchAvailableRooms, type AvailableRoom } from '../utils/fetchAvailableRooms';
import { useEnterNav } from '../../hooks/useEnterNav';

interface Booking {
  id: number;
  booking_ref: string;
  guest_name: string;
  room_type: number;
  room_type_detail?: { name: string };
  room_number: string | null;
  check_in_date: string;
  check_out_date: string;
  adults: number;
  children: number;
  total_price: string;
}

interface Props {
  booking: Booking;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CheckInModal({ booking, onClose, onSuccess }: Props) {
  const [rooms, setRooms] = useState<AvailableRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [form, setForm] = useState({
    room_id: '',
    id_type: '',
    id_number: '',
    deposit_amount: '0',
    notes_internal: '',
  });
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  useEnterNav(formRef);

  useEffect(() => {
    const roomTypeId = booking.room_type ?? (booking as { room_type_detail?: { id?: number } }).room_type_detail?.id;
    if (!roomTypeId) return;
    let cancelled = false;
    setRoomsLoading(true);
    fetchAvailableRooms(roomTypeId, booking.check_in_date, booking.check_out_date, booking.id)
      .then(data => { if (!cancelled) setRooms(data); })
      .catch(() => { if (!cancelled) setRooms([]); })
      .finally(() => { if (!cancelled) setRoomsLoading(false); });
    return () => { cancelled = true; };
  }, [booking]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/admin/reservations/${booking.id}/check-in/`, {
        room_id: form.room_id ? Number(form.room_id) : null,
        id_type: form.id_type || undefined,
        id_number: form.id_number || undefined,
        deposit_amount: parseFloat(form.deposit_amount) || 0,
        notes_internal: form.notes_internal || undefined,
      });
      toast.success(`Checked in ${booking.guest_name}`);
      onSuccess();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Check-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white border border-gray-200 rounded-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Check In</h2>
            <p className="text-xs text-gray-500 mt-0.5">{booking.booking_ref} — {booking.guest_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-slate-800">
            <MdClose size={22} />
          </button>
        </div>

        {/* Booking summary */}
        <div className="px-5 pt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Room Type</span>
            <p className="text-slate-800">{booking.room_type_detail?.name}</p>
          </div>
          <div>
            <span className="text-gray-500">Dates</span>
            <p className="text-slate-800">{booking.check_in_date} → {booking.check_out_date}</p>
          </div>
          <div>
            <span className="text-gray-500">Guests</span>
            <p className="text-slate-800">{booking.adults} adult{booking.adults > 1 ? 's' : ''}{booking.children > 0 ? `, ${booking.children} child${booking.children > 1 ? 'ren' : ''}` : ''}</p>
          </div>
          <div>
            <span className="text-gray-500">Total</span>
            <p className="text-teal-700 font-semibold">BDT {booking.total_price}</p>
          </div>
        </div>

        {/* Form */}
        <form ref={formRef} onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Room selection */}
          {!booking.room_number && (
            <div>
              <label className="block text-sm text-gray-500 mb-1">Assign Room</label>
              <select
                value={form.room_id}
                onChange={e => setForm(f => ({ ...f, room_id: e.target.value }))}
                disabled={roomsLoading}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-teal-600 disabled:opacity-50"
              >
                <option value="">
                  {roomsLoading ? 'Loading rooms...' : rooms.length ? 'Auto-assign (recommended)' : 'No rooms available'}
                </option>
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>Room {r.room_number} (Floor {r.floor})</option>
                ))}
              </select>
              {!roomsLoading && rooms.length > 0 && (
                <p className="text-[10px] text-gray-500 mt-1">{rooms.length} room(s) available</p>
              )}
            </div>
          )}

          {/* ID details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-500 mb-1">ID Type</label>
              <select
                value={form.id_type}
                onChange={e => setForm(f => ({ ...f, id_type: e.target.value }))}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-teal-600"
              >
                <option value="">Select...</option>
                <option value="PASSPORT">Passport</option>
                <option value="NID">National ID</option>
                <option value="DRIVING_LICENSE">Driving License</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">ID Number</label>
              <input
                type="text"
                value={form.id_number}
                onChange={e => setForm(f => ({ ...f, id_number: e.target.value }))}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-teal-600"
                placeholder="Document number"
              />
            </div>
          </div>

          {/* Deposit */}
          <div>
            <label className="block text-sm text-gray-500 mb-1">Security Deposit ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.deposit_amount}
              onChange={e => setForm(f => ({ ...f, deposit_amount: e.target.value }))}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-teal-600"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm text-gray-500 mb-1">Internal Notes</label>
            <textarea
              value={form.notes_internal}
              onChange={e => setForm(f => ({ ...f, notes_internal: e.target.value }))}
              rows={2}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-teal-600 resize-none"
              placeholder="Staff notes..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-gray-600 text-sm hover:bg-gray-50 transition">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-green-600 rounded-lg text-slate-800 text-sm font-medium hover:bg-green-700 transition disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Check In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
