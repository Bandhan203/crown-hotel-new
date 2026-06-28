import { useEffect, useState } from 'react';
import { MdAddBox, MdOpenInNew } from 'react-icons/md';
import toast from 'react-hot-toast';
import api from '../../../services/api';

interface FolioWindow {
  window_number: number;
  label: string;
  charges: { total: number }[];
}

interface Props {
  bookingId: number | null;
  onOpenFolio?: () => void;
}

function windowBalance(w: FolioWindow) {
  return w.charges.reduce((s, c) => s + (Number(c.total) || 0), 0);
}

export default function FolioGrid({ bookingId, onOpenFolio }: Props) {
  const [windows, setWindows] = useState<FolioWindow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!bookingId) {
      setWindows([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api.get(`/admin/bookings/${bookingId}/folio-windows/`)
      .then(res => {
        if (cancelled) return;
        const data = res.data.results ?? res.data;
        setWindows(Array.isArray(data) ? data : []);
      })
      .catch(() => { if (!cancelled) toast.error('Failed to load folio windows'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [bookingId]);

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
      const res = await api.get(`/admin/bookings/${bookingId}/folio-windows/`);
      const data = res.data.results ?? res.data;
      setWindows(Array.isArray(data) ? data : []);
      toast.success('Folio window created');
    } catch {
      toast.error('Failed to create folio');
    }
  };

  return (
    <section className="p-4 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-on-surface">Multi-Folio Management</h3>
        <button
          type="button"
          onClick={handleCreateFolio}
          className="flex items-center gap-2 text-primary font-bold text-sm bg-primary-container/10 px-4 py-2 rounded-lg hover:bg-primary-container/20 transition-all"
        >
          <MdAddBox size={16} /> Create New Folio
        </button>
      </div>
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary-container border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {!bookingId ? (
            <p className="col-span-full text-sm text-on-surface-variant text-center py-4">
              Select an occupied room to view folio windows
            </p>
          ) : windows.length === 0 && !loading ? (
            <p className="col-span-full text-sm text-on-surface-variant text-center py-4">
              No folio windows yet — create one to get started
            </p>
          ) : (
            windows.map(w => (
            <div
              key={w.window_number}
              className="p-3 border border-outline-variant rounded-lg bg-surface flex flex-col gap-2 hover:border-primary transition-colors cursor-pointer"
              onClick={onOpenFolio}
              onKeyDown={e => e.key === 'Enter' && onOpenFolio?.()}
              role={onOpenFolio ? 'button' : undefined}
              tabIndex={onOpenFolio ? 0 : undefined}
            >
              <div className="flex justify-between items-center border-b border-outline-variant pb-2">
                <span className="text-[10px] font-extrabold text-on-surface-variant">
                  {w.label || `FOLIO #${w.window_number}`}
                </span>
                <MdOpenInNew className="text-sm text-outline" />
              </div>
              <div className="py-2">
                <p className="text-[10px] text-on-surface-variant font-medium">Balance</p>
                <p className="text-sm font-bold text-primary">৳{windowBalance(w).toFixed(2)}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); onOpenFolio?.(); }}
                  className="flex-1 py-1 bg-surface-container-high rounded text-[10px] font-bold hover:bg-surface-container transition-colors"
                >
                  Post
                </button>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); onOpenFolio?.(); }}
                  className="flex-1 py-1 bg-surface-container-high rounded text-[10px] font-bold hover:bg-surface-container transition-colors"
                >
                  Move
                </button>
              </div>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}
