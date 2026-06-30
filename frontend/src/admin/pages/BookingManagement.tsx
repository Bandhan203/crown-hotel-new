import { useCallback, useEffect, useRef, useState } from 'react';
import { type ColDef, type ICellRendererParams } from 'ag-grid-community';
import { MdAdd, MdLogin, MdLogout, MdSearch } from 'react-icons/md';
import toast from 'react-hot-toast';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import api from '../../services/api';
import GuestFolio from '../components/GuestFolio';
import RegistrationModule from '../components/GuestRegistrationModal';
import BookingViewModal from '../components/BookingViewModal';

ModuleRegistry.registerModules([AllCommunityModule]);

interface Booking {
  id: number; booking_ref: string; guest: number; guest_email: string; guest_name: string; guest_phone?: string;
  room_type: number; room: number | null; room_number: string | null; check_in_date: string;
  check_out_date: string; adults: number; children: number;
  total_price: string; status: string; payment_status: string; special_requests: string;
  created_at: string; updated_at: string;
  room_type_detail?: { id: number; name: string; price_per_night: string };
  payments?: Payment[];
}

interface Payment {
  id: number; amount: string; payment_method: string; transaction_id: string;
  status: string; paid_at: string; created_at: string;
}

interface RoomTypeOption { id: number; name: string; price_per_night: string }
interface GuestOption { id: number; email: string; full_name: string }

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border border-amber-200',
  CONFIRMED: 'bg-blue-50 text-blue-700 border border-blue-200',
  CHECKED_IN: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  CHECKED_OUT: 'bg-slate-100 text-slate-600 border border-slate-200',
  CANCELLED: 'bg-red-50 text-red-700 border border-red-200',
};

const paymentStatusColors: Record<string, string> = {
  UNPAID: 'bg-red-50 text-red-700 border border-red-200',
  PAID: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  PARTIAL: 'bg-amber-50 text-amber-700 border border-amber-200',
  REFUNDED: 'bg-slate-100 text-slate-600 border border-slate-200',
};

const BADGE = 'inline-flex items-center px-1.5 py-px rounded text-[10px] font-semibold leading-none whitespace-nowrap';

const statusFlow: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['CHECKED_IN', 'CANCELLED'],
  CHECKED_IN: ['CHECKED_OUT'],
};

const emptyCreate = {
  guest_id: '', room_type_id: '', check_in_date: '', check_out_date: '',
  adults: 1, children: 0, special_requests: '', status: 'CONFIRMED',
};

export default function BookingManagement() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [viewBookingId, setViewBookingId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ ...emptyCreate });
  const [roomTypes, setRoomTypes] = useState<RoomTypeOption[]>([]);
  const [guests, setGuests] = useState<GuestOption[]>([]);
  const [guestSearch, setGuestSearch] = useState('');
  const [folioBooking, setFolioBooking] = useState<Booking | null>(null);
  const [regBookingId, setRegBookingId] = useState<number | null>(null);
  const [regCheckInMode, setRegCheckInMode] = useState(false);

  const openRegistration = (id: number, checkIn = false) => {
    setRegBookingId(id);
    setRegCheckInMode(checkIn);
  };
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState<number | null>(null);
  const PAGE_SIZE = 15;
  const gridRef = useRef<any>(null);

  const fetchBookings = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page: p, page_size: PAGE_SIZE };
      if (filter !== 'ALL') params.status = filter;
      if (search.trim()) params.search = search.trim();
      const res = await api.get('/admin/bookings/', { params });
      const data = res.data.results ?? res.data;
      setBookings(data);
      setTotal(res.data.count ?? null);
    } catch {
      toast.error('Failed to load bookings');
    }
    setLoading(false);
  }, [filter, search]);

  useEffect(() => { setPage(1); }, [filter, search]);
  useEffect(() => { fetchBookings(page); }, [fetchBookings, page]);

  useEffect(() => {
    api.get('/admin/room-types/?page_size=100').then(r => setRoomTypes(r.data.results ?? r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!showCreate) return;
    const timer = setTimeout(() => {
      api.get(`/admin/guests/?search=${guestSearch}&page_size=20`)
        .then(r => setGuests(r.data.results ?? r.data)).catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [guestSearch, showCreate]);

  const updateStatus = async (id: number, newStatus: string) => {
    try {
      await api.patch(`/admin/bookings/${id}/status/`, { status: newStatus });
      toast.success(`Status updated: ${newStatus.replace('_', ' ')}`);
      fetchBookings(page);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to update status');
    }
  };

  const handleCreateSubmit = async () => {
    if (!createForm.guest_id || !createForm.room_type_id || !createForm.check_in_date || !createForm.check_out_date) {
      toast.error('Please fill all required fields'); return;
    }
    try {
      await api.post('/admin/bookings/create/', {
        guest: parseInt(createForm.guest_id),
        room_type: parseInt(createForm.room_type_id),
        check_in_date: createForm.check_in_date,
        check_out_date: createForm.check_out_date,
        adults: createForm.adults,
        children: createForm.children,
        special_requests: createForm.special_requests,
        status: createForm.status,
      });
      toast.success('Booking created');
      setShowCreate(false);
      setCreateForm({ ...emptyCreate });
      fetchBookings(1);
    } catch (e: any) {
      const err = e?.response?.data;
      toast.error(err?.detail || JSON.stringify(err) || 'Create failed');
    }
  };

  const StatusRenderer = (params: ICellRendererParams) => (
    <span className={`${BADGE} ${statusColors[params.value] || 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
      {params.value?.replace(/_/g, ' ')}
    </span>
  );

  const PaymentRenderer = (params: ICellRendererParams) => (
    <span className={`${BADGE} ${paymentStatusColors[params.value] || 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
      {params.value}
    </span>
  );

  const ActionsRenderer = (params: ICellRendererParams) => {
    const b = params.data as Booking;
    const nextStatuses = statusFlow[b.status] || [];
    const btn = 'inline-flex items-center justify-center rounded border transition shrink-0';
    return (
      <div className="flex items-center gap-1 h-full">
        <button type="button" title="View booking" onClick={() => setViewBookingId(b.id)}
          className={`${btn} px-1.5 h-5 text-[10px] font-semibold text-teal-700 border-teal-600/35 bg-teal-50/50 hover:bg-teal-100`}>
          View
        </button>
        {nextStatuses.includes('CHECKED_IN') && (
          <button type="button" title="Check in (Registration)" onClick={() => openRegistration(b.id, true)}
            className={`${btn} w-5 h-5 text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100`}>
            <MdLogin size={12} />
          </button>
        )}
        {nextStatuses.includes('CHECKED_OUT') && (
          <button type="button" title="Check out" onClick={() => updateStatus(b.id, 'CHECKED_OUT')}
            className={`${btn} w-5 h-5 text-orange-700 border-orange-200 bg-orange-50 hover:bg-orange-100`}>
            <MdLogout size={12} />
          </button>
        )}
      </div>
    );
  };

  const defaultColDef: ColDef = {
    sortable: true,
    resizable: true,
    suppressMovable: true,
    filter: false,
    cellClass: 'cell-muted',
  };

  const pinCol = { resizable: false, suppressSizeToFit: true };

  const columns: ColDef[] = [
    { field: 'booking_ref', headerName: 'Ref', width: 100, minWidth: 100, maxWidth: 100, pinned: 'left', lockPinned: true, cellClass: 'cell-ref cell-pin cell-ellipsis', tooltipField: 'booking_ref', ...pinCol },
    { field: 'guest_name', headerName: 'Guest', width: 120, minWidth: 120, maxWidth: 120, pinned: 'left', lockPinned: true, cellClass: 'cell-guest cell-pin cell-ellipsis', tooltipField: 'guest_name', ...pinCol },
    { field: 'guest_phone', headerName: 'Mobile', width: 118, valueFormatter: p => p.value || '—' },
    { valueGetter: p => p.data?.room_type_detail?.name || '', headerName: 'Room Type', width: 130 },
    { field: 'room_number', headerName: 'Room', width: 72, valueFormatter: p => p.value || '—' },
    { field: 'check_in_date', headerName: 'Check-in', width: 108 },
    { field: 'check_out_date', headerName: 'Check-out', width: 108 },
    { field: 'total_price', headerName: 'Amount', width: 108, cellClass: 'cell-amount', valueFormatter: p => `BDT ${p.value}` },
    { field: 'status', headerName: 'Status', width: 118, cellRenderer: StatusRenderer, cellClass: '' },
    { field: 'payment_status', headerName: 'Payment', width: 72, minWidth: 72, maxWidth: 72, pinned: 'right', lockPinned: true, cellRenderer: PaymentRenderer, cellClass: 'cell-pin cell-payment', ...pinCol },
    { headerName: 'Actions', width: 96, minWidth: 96, maxWidth: 96, pinned: 'right', lockPinned: true, cellRenderer: ActionsRenderer, sortable: false, filter: false, cellClass: 'cell-pin cell-actions', ...pinCol },
  ];

  const totalPages = total !== null ? Math.ceil(total / PAGE_SIZE) : 1;

  const statusTabs = ['ALL', 'PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'];

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-0.5 p-0.5 rounded-md border border-white/5 flex-1 min-w-[12rem]">
            {statusTabs.map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-2 py-1 rounded text-[11px] font-medium transition ${filter === s ? 'bg-teal-700 text-white' : 'text-gray-500 hover:text-slate-800'}`}>
                {s.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
          <div className="relative shrink-0">
            <MdSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search ref, guest, mobile..."
              className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-xs text-slate-800 placeholder-gray-500 focus:outline-none focus:border-teal-600 w-48"
            />
          </div>
          <button onClick={() => { setShowCreate(true); setGuestSearch(''); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 text-white rounded-md text-xs font-medium hover:bg-teal-600 transition shrink-0">
            <MdAdd size={16} /> New Booking
          </button>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden border border-gray-200 bg-[#141414] shadow-lg">
        <div className="ag-theme-quartz ag-theme-bookings w-full" style={{ height: 500 }}>
          {loading ? (
            <div className="flex items-center justify-center h-full bg-white">
              <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <AgGridReact
              theme="legacy"
              ref={gridRef}
              rowData={bookings}
              columnDefs={columns}
              defaultColDef={defaultColDef}
              rowHeight={40}
              headerHeight={38}
              enableBrowserTooltips={true}
              suppressPaginationPanel={true}
              pagination={false}
              suppressCellFocus={true}
              suppressHorizontalScroll={false}
              animateRows={false}
              getRowId={p => String(p.data.id)}
            />
          )}
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-white border-t border-gray-200">
          <span className="text-xs text-gray-500">
            {total !== null
              ? `${total} booking${total !== 1 ? 's' : ''} · showing page ${page} of ${totalPages}`
              : 'Loading...'}
          </span>
          <div className="flex items-center gap-2">
            <button type="button" disabled={page === 1 || loading} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 text-xs font-medium rounded border border-gray-200 text-gray-600 disabled:opacity-40 hover:border-teal-600/50 hover:text-slate-800 transition">
              Previous
            </button>
            <span className="text-xs text-gray-500 min-w-[4.5rem] text-center">{page} / {totalPages}</span>
            <button type="button" disabled={page >= totalPages || loading} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 text-xs font-medium rounded border border-gray-200 text-gray-600 disabled:opacity-40 hover:border-teal-600/50 hover:text-slate-800 transition">
              Next
            </button>
          </div>
        </div>
      </div>

      {viewBookingId && (
        <BookingViewModal
          bookingId={viewBookingId}
          onClose={() => setViewBookingId(null)}
          onRefresh={() => fetchBookings(page)}
          onDeleted={() => { setViewBookingId(null); fetchBookings(page); }}
          onOpenFolio={(b) => setFolioBooking(b as Booking)}
          onOpenRegistration={(id) => openRegistration(id, false)}
        />
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setShowCreate(false)}>
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-md p-6 my-4"
            onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-5">New Booking</h2>

            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-gray-500 mb-1">Guest *</label>
                <input value={guestSearch} onChange={e => setGuestSearch(e.target.value)}
                  placeholder="Search by email or name..."
                  className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-teal-600 mb-1" />
                {guests.length > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded max-h-36 overflow-y-auto">
                    {guests.map(g => (
                      <button key={g.id} onClick={() => {
                        setCreateForm(f => ({ ...f, guest_id: String(g.id) }));
                        setGuestSearch(`${g.full_name} (${g.email})`);
                        setGuests([]);
                      }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
                        {g.full_name} — <span className="text-gray-500">{g.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-gray-500 mb-1">Room Type *</label>
                <select value={createForm.room_type_id}
                  onChange={e => setCreateForm(f => ({ ...f, room_type_id: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-teal-600">
                  <option value="">Select room type...</option>
                  {roomTypes.map(rt => (
                    <option key={rt.id} value={rt.id}>{rt.name} — BDT {rt.price_per_night}/night</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Check-in *" type="date" value={createForm.check_in_date}
                  onChange={v => setCreateForm(f => ({ ...f, check_in_date: v }))} />
                <Field label="Check-out *" type="date" value={createForm.check_out_date}
                  onChange={v => setCreateForm(f => ({ ...f, check_out_date: v }))} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Adults" type="number" value={String(createForm.adults)}
                  onChange={v => setCreateForm(f => ({ ...f, adults: parseInt(v) || 1 }))} />
                <Field label="Children" type="number" value={String(createForm.children)}
                  onChange={v => setCreateForm(f => ({ ...f, children: parseInt(v) || 0 }))} />
              </div>

              <div>
                <label className="block text-gray-500 mb-1">Initial Status</label>
                <select value={createForm.status}
                  onChange={e => setCreateForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-teal-600">
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="PENDING">Pending</option>
                  <option value="CHECKED_IN">Checked In</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-500 mb-1">Special Requests</label>
                <textarea value={createForm.special_requests} rows={2}
                  onChange={e => setCreateForm(f => ({ ...f, special_requests: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-teal-600" />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button onClick={handleCreateSubmit}
                className="flex-1 py-2 bg-teal-700 text-white text-sm font-medium rounded hover:bg-teal-600 transition">
                Create Booking
              </button>
              <button onClick={() => setShowCreate(false)}
                className="flex-1 py-2 border border-gray-200 text-gray-500 text-sm rounded hover:text-slate-800 transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {folioBooking && (
        <GuestFolio
          bookingId={folioBooking.id}
          bookingRef={folioBooking.booking_ref}
          onClose={() => setFolioBooking(null)}
        />
      )}

      {regBookingId && (
        <RegistrationModule
          mode="advance"
          bookingId={regBookingId}
          checkInMode={regCheckInMode}
          onClose={() => { setRegBookingId(null); setRegCheckInMode(false); }}
          onRefresh={() => fetchBookings(page)}
          onSuccess={() => { setRegBookingId(null); setRegCheckInMode(false); fetchBookings(page); }}
        />
      )}
    </div>
  );
}

function Field({ label, type, value, onChange }: {
  label: string; type: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-gray-500 text-xs mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-1.5 text-slate-800 text-sm focus:outline-none focus:border-teal-600" />
    </div>
  );
}
