import { useCallback, useEffect, useRef, useState } from 'react';
import { type ColDef, type ICellRendererParams } from 'ag-grid-community';
import { MdAdd, MdLogin, MdLogout, MdSearch } from 'react-icons/md';
import toast from 'react-hot-toast';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import api from '../../services/api';
import { channelBadgeClass, channelLabel } from '../../utils/bookingChannel';
import GuestFolio from '../components/GuestFolio';
import RegistrationModule from '../components/GuestRegistrationModal';
import BookingViewModal from '../components/BookingViewModal';
import CheckOutModal from '../components/CheckOutModal';
import ReservationModal from '../components/ReservationModal';

ModuleRegistry.registerModules([AllCommunityModule]);

interface Booking {
  id: number; booking_ref: string; guest: number; guest_email: string; guest_name: string; guest_phone?: string;
  room_type: number; room: number | null; room_number: string | null; check_in_date: string;
  check_out_date: string; adults: number; children: number;
  total_price: string; status: string; payment_status: string; special_requests: string;
  booking_source?: string; reference_source?: string; channel_display?: string;
  created_at: string; updated_at: string;
  room_type_detail?: { id: number; name: string; price_per_night: string };
  payments?: Payment[];
}

interface Payment {
  id: number; amount: string; payment_method: string; transaction_id: string;
  status: string; paid_at: string; created_at: string;
}

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

export default function BookingManagement() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [channelStats, setChannelStats] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [viewBookingId, setViewBookingId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [folioBooking, setFolioBooking] = useState<Booking | null>(null);
  const [regBookingId, setRegBookingId] = useState<number | null>(null);
  const [regCheckInMode, setRegCheckInMode] = useState(false);
  const [checkoutBooking, setCheckoutBooking] = useState<Booking | null>(null);

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
      if (channelFilter !== 'ALL') params.channel = channelFilter;
      if (search.trim()) params.search = search.trim();
      const [res, statsRes] = await Promise.all([
        api.get('/admin/bookings/', { params }),
        api.get('/admin/bookings/channel-stats/', { params: filter !== 'ALL' ? { status: filter } : {} }),
      ]);
      const data = res.data.results ?? res.data;
      setBookings(data);
      setTotal(res.data.count ?? null);
      setChannelStats(statsRes.data ?? {});
    } catch {
      toast.error('Failed to load bookings');
    }
    setLoading(false);
  }, [filter, channelFilter, search]);

  useEffect(() => { setPage(1); }, [filter, channelFilter, search]);
  useEffect(() => { fetchBookings(page); }, [fetchBookings, page]);

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
          <button type="button" title="Check out (Revenue Guard)" onClick={() => setCheckoutBooking(b)}
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

  const fitGridColumns = useCallback(() => {
    const gridApi = gridRef.current?.api;
    if (!gridApi) return;
    gridApi.sizeColumnsToFit({ defaultMinWidth: 72 });
  }, []);

  const pinCol = { resizable: false, suppressSizeToFit: true };

  const ChannelRenderer = (params: ICellRendererParams) => {
    const b = params.data as Booking;
    const label = channelLabel(b);
    const cls = channelBadgeClass(b);
    return (
      <span className={`${BADGE} border ${cls}`} title={b.reference_source || b.booking_source || ''}>
        {label}
      </span>
    );
  };

  const columns: ColDef[] = [
    { field: 'booking_ref', headerName: 'Ref', width: 100, minWidth: 100, maxWidth: 100, pinned: 'left', lockPinned: true, cellClass: 'cell-ref cell-pin cell-ellipsis', tooltipField: 'booking_ref', ...pinCol },
    { field: 'guest_name', headerName: 'Guest', width: 120, minWidth: 120, maxWidth: 120, pinned: 'left', lockPinned: true, cellClass: 'cell-guest cell-pin cell-ellipsis', tooltipField: 'guest_name', ...pinCol },
    { headerName: 'Channel', width: 118, minWidth: 100, cellRenderer: ChannelRenderer, cellClass: '', sortable: false },
    { field: 'guest_phone', headerName: 'Mobile', width: 118, valueFormatter: p => p.value || '—' },
    { valueGetter: p => p.data?.room_type_detail?.name || '', headerName: 'Room Type', width: 130 },
    { field: 'room_number', headerName: 'Room', width: 72, valueFormatter: p => p.value || '—' },
    { field: 'check_in_date', headerName: 'Check-in', width: 108 },
    { field: 'check_out_date', headerName: 'Check-out', width: 108 },
    { field: 'total_price', headerName: 'Amount', width: 108, cellClass: 'cell-amount', valueFormatter: p => `BDT ${p.value}` },
    { field: 'status', headerName: 'Status', width: 118, minWidth: 100, cellRenderer: StatusRenderer, cellClass: '' },
    { field: 'payment_status', headerName: 'Payment', width: 88, minWidth: 88, maxWidth: 88, pinned: 'right', lockPinned: true, cellRenderer: PaymentRenderer, cellClass: 'cell-pin cell-payment', ...pinCol },
    { headerName: 'Actions', width: 96, minWidth: 96, maxWidth: 96, pinned: 'right', lockPinned: true, cellRenderer: ActionsRenderer, sortable: false, filter: false, cellClass: 'cell-pin cell-actions', ...pinCol },
  ];

  const totalPages = total !== null ? Math.ceil(total / PAGE_SIZE) : 1;

  const statusTabs = ['ALL', 'PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'];
  const channelTabs = [
    { key: 'ONLINE', label: 'Website', stat: 'online' },
    { key: 'FACEBOOK', label: 'Facebook', stat: 'facebook' },
    { key: 'BOOKING_COM', label: 'Booking.com', stat: 'booking_com' },
    { key: 'OTA', label: 'Other OTA', stat: 'ota' },
    { key: 'DIRECT', label: 'Direct', stat: 'direct' },
    { key: 'ALL', label: 'All Channels', stat: 'all' },
  ];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
        {channelTabs.slice(0, 5).map(({ key, label, stat }) => (
          <button key={key} type="button" onClick={() => setChannelFilter(key)}
            className={`rounded-lg border px-3 py-2 text-left transition ${channelFilter === key ? 'border-teal-600 bg-teal-50' : 'border-gray-200 bg-white hover:border-teal-600/40'}`}>
            <div className="text-[10px] uppercase tracking-wide text-gray-500">{label}</div>
            <div className="text-lg font-semibold text-slate-800">{channelStats[stat] ?? '—'}</div>
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 space-y-2">
        <div className="flex flex-wrap gap-0.5 p-0.5 rounded-md border border-gray-100">
          {channelTabs.map(({ key, label }) => (
            <button key={key} onClick={() => setChannelFilter(key)}
              className={`px-2 py-1 rounded text-[11px] font-medium transition ${channelFilter === key ? 'bg-sky-700 text-white' : 'text-gray-500 hover:text-slate-800'}`}>
              {label}
            </button>
          ))}
        </div>
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
          <button onClick={() => setShowCreate(true)}
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
              suppressHorizontalScroll={true}
              animateRows={false}
              onGridReady={fitGridColumns}
              onFirstDataRendered={fitGridColumns}
              onGridSizeChanged={fitGridColumns}
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
        <ReservationModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => { setShowCreate(false); fetchBookings(1); }}
        />
      )}

      {checkoutBooking && (
        <CheckOutModal
          booking={checkoutBooking}
          onClose={() => setCheckoutBooking(null)}
          onSuccess={() => { setCheckoutBooking(null); fetchBookings(page); }}
        />
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
