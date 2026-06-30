import { useCallback, useEffect, useState } from 'react';
import { MdAddBox, MdOpenInNew } from 'react-icons/md';
import toast from 'react-hot-toast';
import api from '../../../services/api';

interface FolioWindow {
  window_number: number;
  label: string;
  window_total?: number;
  charges: { total: number }[];
}

interface Props {
  bookingId: number | null;
  refreshKey?: number;
  onOpenFolio?: () => void;
}

function windowBalance(w: FolioWindow) {
  if (typeof w.window_total === 'number') return w.window_total;
  return w.charges.reduce((s, c) => s + (Number(c.total) || 0), 0);
}

export default function FolioGrid({ bookingId, refreshKey = 0, onOpenFolio }: Props) {
  const [windows, setWindows] = useState<FolioWindow[]>([]);
  const [loading, setLoading] = useState(false);

  const loadWindows = useCallback(async () => {
    if (!bookingId) {
      setWindows([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(`/admin/bookings/${bookingId}/folio-windows/`);
      const data = res.data.results ?? res.data;
      setWindows(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load folio windows');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    loadWindows();
  }, [loadWindows, refreshKey]);

  const handleCreateFolio = async () => {
    if (!bookingId) {
      toast('Select an occupied room to manage folios');
      return;
    }
    if (windows.length >= 8) {
      toast.error('Maximum 8 folio windows allowed');
      return;
    }
    try {
      await api.post(`/admin/bookings/${bookingId}/folio-windows/`, {
        label: `Folio #${windows.length + 1}`,
      });
      await loadWindows();
      toast.success('Folio window created');
    } catch {
      toast.error('Failed to create folio');
    }
  };

  return (
    <section className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800">Multi-Folio Management</h3>
        <button
          type="button"
          onClick={handleCreateFolio}
          className="flex items-center gap-2 text-teal-700 font-bold text-sm bg-teal-50 px-4 py-2 rounded-lg hover:bg-teal-100 transition-all border border-teal-200"
        >
          <MdAddBox size={16} /> Create New Folio
        </button>
      </div>
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {!bookingId ? (
            <p className="col-span-full text-sm text-slate-500 text-center py-4">
              Select an occupied room to view folio windows
            </p>
          ) : windows.length === 0 ? (
            <p className="col-span-full text-sm text-slate-500 text-center py-4">
              No folio windows yet — create one to get started
            </p>
          ) : (
            windows.map(w => {
              const bal = windowBalance(w);
              return (
                <div
                  key={w.window_number}
                  className="p-3 border border-gray-200 rounded-lg bg-slate-50 flex flex-col gap-2 hover:border-teal-500 transition-colors cursor-pointer"
                  onClick={onOpenFolio}
                  onKeyDown={e => e.key === 'Enter' && onOpenFolio?.()}
                  role={onOpenFolio ? 'button' : undefined}
                  tabIndex={onOpenFolio ? 0 : undefined}
                >
                  <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                    <span className="text-xs font-bold text-slate-700">
                      {w.label || `FOLIO #${w.window_number}`}
                    </span>
                    <MdOpenInNew className="text-sm text-slate-400" />
                  </div>
                  <div className="py-2">
                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Balance</p>
                    <p className={`text-base font-bold font-mono ${bal > 0.01 ? 'text-red-600' : 'text-teal-700'}`}>
                      ৳{bal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); onOpenFolio?.(); }}
                      className="flex-1 py-1.5 bg-white border border-gray-200 rounded text-[10px] font-bold text-slate-700 hover:bg-teal-50 hover:border-teal-300 transition-colors"
                    >
                      Post
                    </button>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); onOpenFolio?.(); }}
                      className="flex-1 py-1.5 bg-white border border-gray-200 rounded text-[10px] font-bold text-slate-700 hover:bg-teal-50 hover:border-teal-300 transition-colors"
                    >
                      Move
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </section>
  );
}
