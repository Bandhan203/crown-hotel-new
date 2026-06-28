import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MdClose } from 'react-icons/md';
import api from '../../services/api';

interface Booking {
  id: number;
  booking_ref: string;
  guest_name: string;
  room_type_detail?: { name: string };
  room_number: string | null;
  check_in_date: string;
  check_out_date: string;
  total_price: string;
}

interface FolioSummary {
  room_charges: number;
  folio_total: number;
  payments_total: number;
  balance: number;
}

interface Props {
  booking: Booking;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CheckOutModal({ booking, onClose, onSuccess }: Props) {
  const [summary, setSummary] = useState<FolioSummary | null>(null);
  const [form, setForm] = useState({
    payment_amount: '0',
    payment_method: 'CASH',
    notes_internal: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get(`/admin/bookings/${booking.id}/folio/`)
      .then(res => {
        setSummary(res.data.summary);
        if (res.data.summary.balance > 0) {
          setForm(f => ({ ...f, payment_amount: String(res.data.summary.balance) }));
        }
      })
      .catch(() => toast.error('Failed to load folio'));
  }, [booking.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const paymentAmount = parseFloat(form.payment_amount) || 0;
    if (summary && (summary.balance - paymentAmount) > 0.01) {
      toast.error('Payment not clear. Full payment must be completed before check-out.', {
        duration: 4000,
        position: 'top-center',
      });
      return;
    }

    setLoading(true);
    try {
      await api.post(`/admin/reservations/${booking.id}/check-out/`, {
        payment_amount: paymentAmount,
        payment_method: form.payment_method,
        notes_internal: form.notes_internal || undefined,
      });
      toast.success(`Checked out ${booking.guest_name}`);
      onSuccess();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Check-out failed');
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
            <h2 className="text-lg font-bold text-slate-800">Check Out</h2>
            <p className="text-xs text-gray-500 mt-0.5">{booking.booking_ref} — {booking.guest_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-slate-800">
            <MdClose size={22} />
          </button>
        </div>

        {/* Booking summary */}
        <div className="px-5 pt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Room</span>
            <p className="text-slate-800">{booking.room_number ?? '—'} ({booking.room_type_detail?.name})</p>
          </div>
          <div>
            <span className="text-gray-500">Dates</span>
            <p className="text-slate-800">{booking.check_in_date} → {booking.check_out_date}</p>
          </div>
        </div>

        {/* Folio Summary */}
        {summary && (
          <div className="mx-5 mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Room Charges</span>
              <span className="text-slate-800">BDT {summary.room_charges.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Additional Charges</span>
              <span className="text-slate-800">BDT {summary.folio_total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Payments Made</span>
              <span className="text-green-400">-BDT {summary.payments_total.toFixed(2)}</span>
            </div>
            <div className="border-t border-gray-200 pt-2 flex justify-between font-semibold">
              <span className="text-slate-800">Balance Due</span>
              <span className={summary.balance > 0 ? 'text-red-400' : summary.balance < 0 ? 'text-green-400' : 'text-slate-800'}>
                BDT {summary.balance.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {summary && summary.balance > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-500 mb-1">Payment Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.payment_amount}
                  onChange={e => setForm(f => ({ ...f, payment_amount: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-teal-600"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">Payment Method</label>
                <select
                  value={form.payment_method}
                  onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-teal-600"
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="ONLINE">Online</option>
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-500 mb-1">Notes</label>
            <textarea
              value={form.notes_internal}
              onChange={e => setForm(f => ({ ...f, notes_internal: e.target.value }))}
              rows={2}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-teal-600 resize-none"
              placeholder="Checkout notes..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-gray-600 text-sm hover:bg-gray-50 transition">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-orange-600 rounded-lg text-slate-800 text-sm font-medium hover:bg-orange-700 transition disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Check Out'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
