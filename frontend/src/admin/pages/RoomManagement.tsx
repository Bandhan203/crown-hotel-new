import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type ColDef, type ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { MdAdd, MdClose, MdSearch } from 'react-icons/md';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { HK_BADGE, HK_STATUSES } from '../utils/housekeepingStatus';

ModuleRegistry.registerModules([AllCommunityModule]);

const PAGE_SIZE = 15;

interface RoomType {
  id: number;
  name: string;
  slug: string;
  description: string;
  price_per_night: string;
  max_guests: number;
  beds: number;
  size: number;
  view_type: string;
  is_featured: boolean;
  room_count?: number;
  amenities?: number[];
}

interface RoomAmenity {
  id: number;
  name: string;
  icon?: string;
}

interface Room {
  id: number;
  room_type: number;
  room_type_name: string;
  max_guests: number;
  rack_rate: string;
  room_number: string;
  floor: number;
  status: string;
  housekeeping_status: string;
  is_smoking: boolean;
  notes: string;
}

type Tab = 'types' | 'rooms';

const ROOM_STATUS: [string, string][] = [
  ['AVAILABLE', 'Available'],
  ['OCCUPIED', 'Occupied'],
  ['MAINTENANCE', 'Maintenance'],
  ['RESERVED', 'Reserved'],
];

const HK_STATUS = HK_STATUSES.map(([code, label]) => [code, label] as [string, string]);

const VIEW_TYPES: [string, string][] = [
  ['', '— None —'],
  ['CITY', 'City'],
  ['SEA', 'Sea'],
  ['GARDEN', 'Garden'],
  ['POOL', 'Pool'],
  ['MOUNTAIN', 'Mountain'],
];

const STATUS_BADGE: Record<string, string> = {
  AVAILABLE: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  OCCUPIED: 'bg-blue-50 text-blue-700 border border-blue-200',
  MAINTENANCE: 'bg-amber-50 text-amber-700 border border-amber-200',
  RESERVED: 'bg-violet-50 text-violet-700 border border-violet-200',
};

const BADGE = 'inline-flex items-center px-1.5 py-px rounded text-[10px] font-semibold leading-none whitespace-nowrap';

/* ── PMS form primitives (aligned with ReservationModal) ── */
const LBL = 'w-[6.5rem] shrink-0 text-sm font-semibold text-slate-700 text-right leading-none pr-1.5';
const LBL_WIDE = 'w-[7.5rem] shrink-0 text-sm font-semibold text-slate-700 text-right leading-none pr-1.5';
const INP = [
  'bg-white border border-slate-300 rounded-sm w-full min-w-0 h-7 px-2',
  'text-sm font-medium text-slate-800',
  'focus:outline-none focus:border-blue-600 focus:ring-[3px] focus:ring-blue-500/35',
  'disabled:bg-slate-100 disabled:text-slate-500',
].join(' ');
const SEL = INP + ' cursor-pointer';
const TAREA = [
  'bg-white border border-slate-300 rounded-sm w-full min-w-0',
  'px-2 py-1.5 text-sm font-medium text-slate-800 leading-snug',
  'focus:outline-none focus:border-blue-600 focus:ring-[3px] focus:ring-blue-500/35',
].join(' ');

function PmsField({ id, label, children, wide }: {
  id?: string; label: string; children: React.ReactNode; wide?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 min-w-0 py-0.5">
      <label htmlFor={id} className={wide ? LBL_WIDE : LBL}>{label}</label>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function PmsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-slate-200 rounded-sm bg-white/60 mb-2">
      <div className="px-2 py-1 bg-slate-100 border-b border-slate-200">
        <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">{title}</span>
      </div>
      <div className="px-2 py-1.5 space-y-0.5">{children}</div>
    </div>
  );
}

function formatApiError(data: unknown): string {
  if (!data || typeof data !== 'object') return 'Failed to save';
  const d = data as Record<string, unknown>;
  if (typeof d.detail === 'string') return d.detail;
  const parts: string[] = [];
  for (const [field, val] of Object.entries(d)) {
    if (Array.isArray(val)) parts.push(`${field.replace(/_/g, ' ')}: ${val.join(', ')}`);
    else if (typeof val === 'string') parts.push(val);
  }
  return parts.join(' · ') || 'Failed to save';
}

export default function RoomManagement() {
  const [tab, setTab] = useState<Tab>('types');
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [rows, setRows] = useState<(RoomType | Room)[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<RoomType | Room | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const gridRef = useRef<any>(null);
  const isMobile = useIsMobile();

  const loadRoomTypes = useCallback(async () => {
    try {
      const res = await api.get('/admin/room-types/?page_size=200');
      setRoomTypes(res.data.results ?? res.data);
    } catch {
      toast.error('Failed to load room types');
    }
  }, []);

  useEffect(() => { loadRoomTypes(); }, [loadRoomTypes]);

  const fetchRows = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page: p, page_size: PAGE_SIZE };
      if (search.trim()) params.search = search.trim();
      if (tab === 'rooms' && typeFilter !== 'ALL') params.room_type = typeFilter;
      const url = tab === 'types' ? '/admin/room-types/' : '/admin/rooms/';
      const res = await api.get(url, { params });
      setRows(res.data.results ?? res.data);
      setTotal(res.data.count ?? null);
    } catch {
      toast.error('Failed to load data');
      setRows([]);
    }
    setLoading(false);
  }, [tab, search, typeFilter]);

  useEffect(() => { setPage(1); }, [tab, search, typeFilter, refreshKey]);
  useEffect(() => { fetchRows(page); }, [fetchRows, page, refreshKey]);

  const bumpRefresh = () => setRefreshKey(k => k + 1);

  const totalPages = total !== null ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : 1;
  const rowLabel = tab === 'types' ? 'type' : 'room';

  const defaultColDef: ColDef = {
    sortable: true,
    resizable: true,
    suppressMovable: true,
    filter: false,
    cellClass: 'cell-muted',
  };

  const pinCol = { resizable: false, suppressSizeToFit: true, filter: false };

  const handleDelete = useCallback(async (id: number) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await api.delete(`/admin/${tab === 'types' ? 'room-types' : 'rooms'}/${id}/`);
      toast.success('Deleted successfully');
      bumpRefresh();
      loadRoomTypes();
    } catch {
      toast.error('Failed to delete');
    }
  }, [tab, loadRoomTypes]);

  const ActionRenderer = useCallback((params: ICellRendererParams) => (
    <div className="flex items-center gap-1 h-full">
      <button type="button" title="Edit"
        onClick={() => { setEditItem(params.data); setShowModal(true); }}
        className="px-1.5 h-5 text-[10px] font-semibold text-teal-700 border border-teal-600/35 bg-teal-50/50 hover:bg-teal-100 rounded transition">
        Edit
      </button>
      <button type="button" title="Delete" onClick={() => handleDelete(params.data.id)}
        className="px-1.5 h-5 text-[10px] font-semibold text-red-700 border border-red-200 bg-red-50 hover:bg-red-100 rounded transition">
        Del
      </button>
    </div>
  ), [handleDelete]);

  const typeColumns = useMemo<ColDef[]>(() => [
    {
      field: 'name', headerName: 'Type', width: 130, minWidth: 130, maxWidth: 160,
      pinned: 'left', lockPinned: true,
      cellClass: 'cell-guest cell-pin cell-ellipsis', tooltipField: 'name', ...pinCol,
    },
    {
      field: 'price_per_night', headerName: 'Rack Rate', width: 108,
      valueFormatter: p => `BDT ${p.value}`,
      cellClass: 'cell-amount',
    },
    {
      field: 'max_guests', headerName: 'Max Pax', width: 82,
      cellClass: 'cell-ref',
      headerTooltip: 'Base capacity per room (used in reservation PAX validation)',
    },
    { field: 'beds', headerName: 'Beds', width: 68 },
    {
      field: 'room_count', headerName: 'Rooms', width: 72,
      valueFormatter: p => String(p.value ?? 0),
    },
    {
      field: 'size', headerName: 'Size', width: 88,
      valueFormatter: p => p.value ? `${p.value} sqft` : '—',
    },
    { field: 'view_type', headerName: 'View', flex: 1, minWidth: 88, valueFormatter: p => p.value || '—' },
    {
      field: 'is_featured', headerName: 'Featured', width: 88, cellClass: '',
      cellRenderer: (p: ICellRendererParams) => p.value
        ? <span className={`${BADGE} bg-amber-50 text-amber-700 border border-amber-200`}>Yes</span>
        : <span className="text-slate-400 text-xs">No</span>,
    },
    {
      headerName: 'Actions', width: 96, minWidth: 96, maxWidth: 96,
      pinned: 'right', lockPinned: true,
      cellRenderer: ActionRenderer, sortable: false,
      cellClass: 'cell-pin cell-actions', ...pinCol,
    },
  ], [ActionRenderer]);

  const roomColumns = useMemo<ColDef[]>(() => [
    {
      field: 'room_number', headerName: 'Room #', width: 88, minWidth: 88, maxWidth: 88,
      pinned: 'left', lockPinned: true,
      cellClass: 'cell-ref cell-pin cell-ellipsis', tooltipField: 'room_number', ...pinCol,
    },
    { field: 'room_type_name', headerName: 'Type', flex: 1, minWidth: 130, cellClass: 'cell-guest cell-ellipsis', tooltipField: 'room_type_name' },
    { field: 'max_guests', headerName: 'Max Pax', width: 82, cellClass: 'cell-ref' },
    {
      field: 'rack_rate', headerName: 'Rack Rate', width: 108,
      valueFormatter: p => p.value ? `BDT ${p.value}` : '—',
      cellClass: 'cell-amount',
    },
    { field: 'floor', headerName: 'Floor', width: 68 },
    {
      field: 'status', headerName: 'Status', width: 108, cellClass: '',
      cellRenderer: (p: ICellRendererParams) => (
        <span className={`${BADGE} ${STATUS_BADGE[p.value] || 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
          {p.value?.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      field: 'housekeeping_status', headerName: 'HK', width: 100, cellClass: '',
      cellRenderer: (p: ICellRendererParams) => (
        <span className={`${BADGE} ${HK_BADGE[p.value] || 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
          {p.value?.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      field: 'is_smoking', headerName: 'Smoking', width: 78, cellClass: '',
      cellRenderer: (p: ICellRendererParams) => p.value
        ? <span className={`${BADGE} bg-slate-100 text-slate-600 border border-slate-200`}>Yes</span>
        : <span className="text-slate-400 text-xs">No</span>,
    },
    {
      headerName: 'Actions', width: 96, minWidth: 96, maxWidth: 96,
      pinned: 'right', lockPinned: true,
      cellRenderer: ActionRenderer, sortable: false,
      cellClass: 'cell-pin cell-actions', ...pinCol,
    },
  ], [ActionRenderer]);

  const columns = tab === 'types' ? typeColumns : roomColumns;

  const fitGridColumns = useCallback(() => {
    if (isMobile) return;
    const api = gridRef.current?.api;
    if (!api) return;
    api.sizeColumnsToFit({ defaultMinWidth: 68 });
  }, [isMobile]);

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-0.5 p-0.5 rounded-md border border-white/5 shrink-0">
            {(['types', 'rooms'] as Tab[]).map(t => (
              <button key={t} onClick={() => { setTab(t); setTypeFilter('ALL'); }}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${tab === t ? 'bg-teal-700 text-white' : 'text-gray-500 hover:text-slate-800'}`}>
                {t === 'types' ? 'Room Types' : 'Rooms'}
              </button>
            ))}
          </div>

          {tab === 'rooms' && (
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-xs text-slate-800 focus:outline-none focus:border-teal-600 shrink-0">
              <option value="ALL">All types</option>
              {roomTypes.map(rt => (
                <option key={rt.id} value={rt.id}>{rt.name}</option>
              ))}
            </select>
          )}

          <div className="relative flex-1 min-w-[10rem]">
            <MdSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={tab === 'types' ? 'Search room types...' : 'Search room number...'}
              className="pl-8 pr-3 py-1.5 w-full bg-gray-50 border border-gray-200 rounded-md text-xs text-slate-800 placeholder-gray-500 focus:outline-none focus:border-teal-600" />
          </div>

          <button onClick={() => { setEditItem(null); setShowModal(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 text-white rounded-md text-xs font-medium hover:bg-teal-600 transition shrink-0">
            <MdAdd size={16} /> Add {tab === 'types' ? 'Type' : 'Room'}
          </button>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden border border-gray-200 bg-[#141414] shadow-lg">
        <div className="ag-theme-quartz ag-theme-bookings w-full admin-grid-height overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full bg-white">
              <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <AgGridReact
              theme="legacy"
              key={`${tab}-${refreshKey}`}
              ref={gridRef}
              rowData={rows}
              columnDefs={columns}
              defaultColDef={defaultColDef}
              rowHeight={40}
              headerHeight={38}
              enableBrowserTooltips={true}
              suppressPaginationPanel={true}
              pagination={false}
              suppressCellFocus={true}
              suppressHorizontalScroll={!isMobile}
              animateRows={false}
              getRowId={p => String(p.data.id)}
              onGridReady={fitGridColumns}
              onFirstDataRendered={fitGridColumns}
              onGridSizeChanged={fitGridColumns}
            />
          )}
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-white border-t border-gray-200">
          <span className="text-xs text-gray-500">
            {total !== null
              ? `${total} ${rowLabel}${total !== 1 ? 's' : ''} · showing page ${page} of ${totalPages}`
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

      {showModal && tab === 'types' && (
        <RoomTypeModal
          item={editItem as RoomType | null}
          onClose={() => { setShowModal(false); setEditItem(null); }}
          onSaved={() => { bumpRefresh(); loadRoomTypes(); setShowModal(false); setEditItem(null); }}
        />
      )}

      {showModal && tab === 'rooms' && (
        <RoomModal
          item={editItem as Room | null}
          roomTypes={roomTypes}
          onClose={() => { setShowModal(false); setEditItem(null); }}
          onSaved={() => { bumpRefresh(); setShowModal(false); setEditItem(null); }}
        />
      )}
    </div>
  );
}

/* ── Room Type Modal (PMS) ── */
function RoomTypeModal({ item, onClose, onSaved }: {
  item: RoomType | null; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: item?.name || '',
    description: item?.description || '',
    price_per_night: item?.price_per_night || '',
    max_guests: String(item?.max_guests ?? 2),
    beds: String(item?.beds ?? 1),
    size: String(item?.size ?? 0),
    view_type: item?.view_type || '',
    is_featured: item?.is_featured ?? false,
  });
  const [loading, setLoading] = useState(false);
  const [existingImages, setExistingImages] = useState<any[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [allAmenities, setAllAmenities] = useState<RoomAmenity[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<number[]>([]);

  const set = (key: string, value: string | boolean) => setForm(f => ({ ...f, [key]: value }));

  useEffect(() => {
    api.get('/admin/amenities/?page_size=200')
      .then(r => setAllAmenities(r.data.results ?? r.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!item?.id) {
      setSelectedAmenities([]);
      return;
    }
    api.get(`/admin/room-types/${item.id}/`)
      .then(r => {
        const ids = (r.data.amenities || []).map((a: number | RoomAmenity) =>
          typeof a === 'object' ? a.id : a,
        );
        setSelectedAmenities(ids);
      })
      .catch(() => setSelectedAmenities(item.amenities || []));
  }, [item?.id]);

  useEffect(() => {
    if (!item?.id) { setExistingImages([]); return; }
    api.get(`/admin/room-images/?room_type=${item.id}`)
      .then(r => setExistingImages(r.data.results ?? r.data))
      .catch(() => {});
  }, [item?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (!form.price_per_night || parseFloat(form.price_per_night) <= 0) {
      toast.error('Rack rate must be greater than zero'); return;
    }
    if (parseInt(form.max_guests, 10) < 1) { toast.error('Max guests must be at least 1'); return; }

    setLoading(true);
    const payload = {
      name: form.name.trim(),
      description: form.description,
      price_per_night: form.price_per_night,
      max_guests: parseInt(form.max_guests, 10) || 2,
      beds: parseInt(form.beds, 10) || 1,
      size: parseInt(form.size, 10) || 0,
      view_type: form.view_type,
      is_featured: form.is_featured,
      amenities: selectedAmenities,
    };

    try {
      let roomTypeId = item?.id;
      if (item?.id) {
        await api.put(`/admin/room-types/${item.id}/`, payload);
      } else {
        const res = await api.post('/admin/room-types/', payload);
        roomTypeId = res.data.id;
      }
      for (const file of newFiles) {
        const fd = new FormData();
        fd.append('room_type', String(roomTypeId));
        fd.append('image', file);
        await api.post('/admin/room-images/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      toast.success(item?.id ? 'Room type updated' : 'Room type created');
      onSaved();
    } catch (err: any) {
      toast.error(formatApiError(err?.response?.data));
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={onClose}>
      <div className="bg-slate-50 border border-slate-300 rounded shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col"
        onMouseDown={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-3 py-2 bg-slate-700 text-slate-800 shrink-0">
          <h2 className="text-sm font-bold tracking-wide">
            {item ? 'Edit Room Type' : 'New Room Type'}
          </h2>
          <button type="button" onClick={onClose} className="p-1 hover:bg-white/10 rounded"><MdClose size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-3">
          <PmsSection title="Type &amp; Rack Rate">
            <PmsField id="rt_name" label="Name *" wide>
              <input id="rt_name" value={form.name} onChange={e => set('name', e.target.value)}
                className={INP} placeholder="e.g. Deluxe King" />
            </PmsField>
            <PmsField id="rt_rack" label="Rack Rate *" wide>
              <input id="rt_rack" type="number" step="0.01" min="0"
                value={form.price_per_night} onChange={e => set('price_per_night', e.target.value)}
                className={INP} placeholder="BDT per night — used as default in reservation" />
            </PmsField>
            <PmsField id="rt_desc" label="Description" wide>
              <textarea id="rt_desc" rows={2} value={form.description}
                onChange={e => set('description', e.target.value)} className={TAREA} />
            </PmsField>
          </PmsSection>

          <PmsSection title="Capacity (Reservation PAX)">
            <div className="grid grid-cols-2 gap-x-4">
              <PmsField id="rt_max" label="Max Guests *">
                <input id="rt_max" type="number" min="1" max="20"
                  value={form.max_guests} onChange={e => set('max_guests', e.target.value)}
                  className={INP} title="Base capacity before extra beds" />
              </PmsField>
              <PmsField id="rt_beds" label="Beds">
                <input id="rt_beds" type="number" min="1" max="10"
                  value={form.beds} onChange={e => set('beds', e.target.value)} className={INP} />
              </PmsField>
            </div>
            <p className="text-[10px] text-slate-500 ml-[7.5rem] -mt-0.5">
              Shown in reservation as &quot;max {form.max_guests || '?'}&quot; — drives PAX capacity warning
            </p>
          </PmsSection>

          <PmsSection title="Details">
            <div className="grid grid-cols-2 gap-x-4">
              <PmsField id="rt_size" label="Size (sqft)">
                <input id="rt_size" type="number" min="0"
                  value={form.size} onChange={e => set('size', e.target.value)} className={INP} />
              </PmsField>
              <PmsField id="rt_view" label="View">
                <select id="rt_view" value={form.view_type} onChange={e => set('view_type', e.target.value)} className={SEL}>
                  {VIEW_TYPES.map(([v, l]) => <option key={v || 'none'} value={v}>{l}</option>)}
                </select>
              </PmsField>
            </div>
            <label className="flex items-center gap-2 ml-[7.5rem] text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" checked={form.is_featured}
                onChange={e => set('is_featured', e.target.checked)}
                className="w-4 h-4 rounded-sm accent-blue-600" />
              Featured on website
            </label>
          </PmsSection>

          <PmsSection title="Amenities">
            {allAmenities.length === 0 ? (
              <p className="text-xs text-slate-500 ml-[7.5rem]">No amenities defined yet (add via Django admin or API).</p>
            ) : (
              <div className="flex flex-wrap gap-2 ml-[7.5rem]">
                {allAmenities.map(a => {
                  const on = selectedAmenities.includes(a.id);
                  return (
                    <button key={a.id} type="button"
                      onClick={() => setSelectedAmenities(prev =>
                        on ? prev.filter(id => id !== a.id) : [...prev, a.id],
                      )}
                      className={`px-2 py-1 rounded text-xs border transition ${
                        on ? 'bg-teal-700 text-white border-teal-700' : 'bg-white text-slate-600 border-slate-300 hover:border-teal-600'
                      }`}>
                      {a.name}
                    </button>
                  );
                })}
              </div>
            )}
          </PmsSection>

          <PmsSection title="Images">
            <input type="file" accept="image/*" multiple
              onChange={e => e.target.files && setNewFiles(f => [...f, ...Array.from(e.target.files!)])}
              className="text-xs text-slate-600 w-full" />
            <div className="mt-2 grid grid-cols-4 gap-2">
              {existingImages.map(img => (
                <div key={img.id} className="relative border border-slate-200 rounded p-0.5 bg-white">
                  <img src={img.image} alt="" className="w-full h-16 object-cover rounded-sm" />
                  <div className="absolute top-0.5 right-0.5 flex gap-0.5">
                    <button type="button" onClick={async () => {
                      await api.patch(`/admin/room-images/${img.id}/`, { is_primary: true });
                      const r = await api.get(`/admin/room-images/?room_type=${item!.id}`);
                      setExistingImages(r.data.results ?? r.data);
                    }} className="px-1 text-[9px] bg-teal-700 text-white rounded">★</button>
                    <button type="button" onClick={async () => {
                      if (!confirm('Delete image?')) return;
                      await api.delete(`/admin/room-images/${img.id}/`);
                      setExistingImages(prev => prev.filter(i => i.id !== img.id));
                    }} className="px-1 text-[9px] bg-red-500 text-white rounded">✕</button>
                  </div>
                </div>
              ))}
              {newFiles.map((f, i) => (
                <div key={i} className="relative border border-slate-200 rounded p-0.5 bg-white">
                  <img src={URL.createObjectURL(f)} alt="" className="w-full h-16 object-cover rounded-sm" />
                  <button type="button" onClick={() => setNewFiles(prev => prev.filter((_, j) => j !== i))}
                    className="absolute top-0.5 right-0.5 px-1 text-[9px] bg-red-500 text-white rounded">✕</button>
                </div>
              ))}
            </div>
          </PmsSection>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button type="button" onClick={onClose}
              className="px-4 py-1.5 text-sm text-slate-600 border border-slate-300 rounded-sm hover:bg-slate-100">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="px-4 py-1.5 text-sm font-medium text-white bg-teal-700 hover:bg-teal-600 rounded-sm disabled:opacity-50">
              {loading ? 'Saving…' : item ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Room Modal (PMS) ── */
function RoomModal({ item, roomTypes, onClose, onSaved }: {
  item: Room | null; roomTypes: RoomType[]; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    room_number: item?.room_number || '',
    room_type: String(item?.room_type || roomTypes[0]?.id || ''),
    floor: String(item?.floor ?? 1),
    status: item?.status || 'AVAILABLE',
    housekeeping_status: item?.housekeeping_status || 'VC',
    is_smoking: item?.is_smoking ?? false,
    notes: item?.notes || '',
  });
  const [loading, setLoading] = useState(false);

  const set = (key: string, value: string | boolean) => setForm(f => ({ ...f, [key]: value }));

  const selectedType = roomTypes.find(rt => rt.id === Number(form.room_type));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.room_number.trim()) { toast.error('Room number is required'); return; }
    if (!form.room_type) { toast.error('Room type is required'); return; }

    setLoading(true);
    const payload = {
      room_number: form.room_number.trim(),
      room_type: Number(form.room_type),
      floor: parseInt(form.floor, 10) || 1,
      status: form.status,
      housekeeping_status: form.housekeeping_status,
      is_smoking: form.is_smoking,
      notes: form.notes,
    };

    try {
      if (item?.id) await api.put(`/admin/rooms/${item.id}/`, payload);
      else await api.post('/admin/rooms/', payload);
      toast.success(item?.id ? 'Room updated' : 'Room created');
      onSaved();
    } catch (err: any) {
      toast.error(formatApiError(err?.response?.data));
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={onClose}>
      <div className="bg-slate-50 border border-slate-300 rounded shadow-xl w-full max-w-xl max-h-[92vh] flex flex-col"
        onMouseDown={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-3 py-2 bg-slate-700 text-slate-800 shrink-0">
          <h2 className="text-sm font-bold tracking-wide">{item ? 'Edit Room' : 'New Room'}</h2>
          <button type="button" onClick={onClose} className="p-1 hover:bg-white/10 rounded"><MdClose size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-3">
          <PmsSection title="Room Info">
            <PmsField id="rm_no" label="Room No *" wide>
              <input id="rm_no" value={form.room_number} onChange={e => set('room_number', e.target.value)}
                className={INP} placeholder="e.g. 101" />
            </PmsField>
            <PmsField id="rm_type" label="Room Type *" wide>
              <select id="rm_type" value={form.room_type} onChange={e => set('room_type', e.target.value)} className={SEL}>
                <option value="">— Select type —</option>
                {roomTypes.map(rt => (
                  <option key={rt.id} value={rt.id}>
                    {rt.name} — BDT {rt.price_per_night}/night (max {rt.max_guests})
                  </option>
                ))}
              </select>
            </PmsField>
            {selectedType && (
              <p className="text-[10px] text-slate-500 ml-[7.5rem]">
                Rack BDT {selectedType.price_per_night}/nt · base capacity {selectedType.max_guests} guests
              </p>
            )}
            <PmsField id="rm_floor" label="Floor" wide>
              <input id="rm_floor" type="number" min="0" max="99"
                value={form.floor} onChange={e => set('floor', e.target.value)} className={INP} />
            </PmsField>
          </PmsSection>

          <PmsSection title="Status &amp; Housekeeping">
            <div className="grid grid-cols-2 gap-x-4">
              <PmsField id="rm_status" label="Status">
                <select id="rm_status" value={form.status} onChange={e => set('status', e.target.value)} className={SEL}>
                  {ROOM_STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </PmsField>
              <PmsField id="rm_hk" label="HK Status">
                <select id="rm_hk" value={form.housekeeping_status}
                  onChange={e => set('housekeeping_status', e.target.value)} className={SEL}>
                  {HK_STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </PmsField>
            </div>
            <p className="text-[10px] text-slate-500 ml-[7.5rem]">
              Maintenance or HK Out of Order rooms are excluded from reservation room picker
            </p>
            <label className="flex items-center gap-2 ml-[7.5rem] text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" checked={form.is_smoking}
                onChange={e => set('is_smoking', e.target.checked)}
                className="w-4 h-4 rounded-sm accent-blue-600" />
              Smoking room
            </label>
          </PmsSection>

          <PmsSection title="Notes">
            <PmsField id="rm_notes" label="Notes" wide>
              <textarea id="rm_notes" rows={2} value={form.notes}
                onChange={e => set('notes', e.target.value)} className={TAREA} placeholder="Internal notes…" />
            </PmsField>
          </PmsSection>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button type="button" onClick={onClose}
              className="px-4 py-1.5 text-sm text-slate-600 border border-slate-300 rounded-sm hover:bg-slate-100">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="px-4 py-1.5 text-sm font-medium text-white bg-teal-700 hover:bg-teal-600 rounded-sm disabled:opacity-50">
              {loading ? 'Saving…' : item ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
