import { useCallback, useEffect, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, type ColDef, type ICellRendererParams } from 'ag-grid-community';
import { MdSearch, MdEdit, MdSave, MdAdd } from 'react-icons/md';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useIsMobile } from '../../hooks/useMediaQuery';

ModuleRegistry.registerModules([AllCommunityModule]);

const PAGE_SIZE = 15;

interface Guest {
  id: number;
  email: string;
  full_name: string;
  phone: string;
  is_active: boolean;
  date_joined: string;
  total_bookings: number;
  blacklisted?: boolean;
}

interface GuestProfileData {
  id: number;
  user: number;
  user_email: string;
  user_name: string;
  nationality: string;
  date_of_birth: string | null;
  gender: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  id_type: string;
  id_number: string;
  id_expiry: string | null;
  preferences: string;
  loyalty_tier: string;
  loyalty_points: number;
  vip: boolean;
  blacklisted: boolean;
  notes: string;
}

interface StayHistory {
  id: number;
  booking_ref: string;
  room_type_name: string;
  room_number: string | null;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  status: string;
  total_price: string;
  actual_check_in: string | null;
  actual_check_out: string | null;
}

interface GuestBooking {
  id: number;
  booking_ref: string;
  room_type_name: string;
  check_in_date: string;
  check_out_date: string;
  status: string;
  total_price: number;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-500/20 text-yellow-400',
  CONFIRMED: 'bg-blue-500/20 text-blue-400',
  CHECKED_IN: 'bg-green-500/20 text-green-400',
  CHECKED_OUT: 'bg-gray-500/20 text-gray-500',
  CANCELLED: 'bg-red-500/20 text-red-400',
};

const BADGE = 'inline-flex items-center px-1.5 py-px rounded text-[10px] font-semibold leading-none whitespace-nowrap';

const activeStatusColors: Record<string, string> = {
  true: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  false: 'bg-red-50 text-red-700 border border-red-200',
};

export default function GuestManagement() {
  const gridRef = useRef<any>(null);
  const isMobile = useIsMobile();
  const [rowData, setRowData] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'blacklisted'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ email: '', full_name: '', phone: '' });
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState<Guest | null>(null);
  const [guestBookings, setGuestBookings] = useState<GuestBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [detailTab, setDetailTab] = useState<'info' | 'profile' | 'history'>('info');
  const [profile, setProfile] = useState<GuestProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileForm, setProfileForm] = useState<Partial<GuestProfileData>>({});
  const [profileSaving, setProfileSaving] = useState(false);
  const [stayHistory, setStayHistory] = useState<StayHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchGuests = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page: p, page_size: PAGE_SIZE };
      if (search) params.search = search;
      if (filter === 'active') params.is_active = 'true';
      if (filter === 'inactive') params.is_active = 'false';
      if (filter === 'blacklisted') params.blacklisted = 'true';
      const res = await api.get('/admin/guests/', { params });
      setRowData(res.data.results ?? res.data);
      setTotal(res.data.count ?? null);
    } catch {
      toast.error('Failed to load guests');
    }
    setLoading(false);
  }, [search, filter]);

  // Search debounce
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchGuests(1); }, search ? 400 : 0);
    return () => clearTimeout(t);
  }, [search, filter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchGuests(page); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  async function openDetail(guest: Guest) {
    setDetail(guest);
    setDetailTab('info');
    setProfile(null);
    setStayHistory([]);
    setProfileEditing(false);
    setGuestBookings([]);
    setBookingsLoading(true);
    try {
      const res = await api.get('/admin/bookings/', { params: { guest: guest.id, page_size: 10 } });
      setGuestBookings(res.data.results ?? res.data);
    } catch { /* silent */ }
    setBookingsLoading(false);
  }

  async function fetchProfile(guestId: number) {
    setProfileLoading(true);
    try {
      const res = await api.get(`/admin/guests/${guestId}/profile/`);
      setProfile(res.data);
      setProfileForm(res.data);
    } catch { toast.error('Failed to load profile'); }
    setProfileLoading(false);
  }

  async function fetchHistory(guestId: number) {
    setHistoryLoading(true);
    try {
      const res = await api.get(`/admin/guests/${guestId}/stay-history/`);
      setStayHistory(res.data.results ?? res.data);
    } catch { toast.error('Failed to load stay history'); }
    setHistoryLoading(false);
  }

  async function saveProfile() {
    if (!detail) return;
    setProfileSaving(true);
    try {
      const res = await api.patch(`/admin/guests/${detail.id}/profile/`, profileForm);
      setProfile(res.data);
      setProfileEditing(false);
      toast.success('Profile updated');
    } catch { toast.error('Failed to save profile'); }
    setProfileSaving(false);
  }

  function handleTabChange(tab: 'info' | 'profile' | 'history') {
    setDetailTab(tab);
    if (tab === 'profile' && !profile && detail) fetchProfile(detail.id);
    if (tab === 'history' && stayHistory.length === 0 && detail) fetchHistory(detail.id);
  }

  async function toggleActive() {
    if (!detail) return;
    setToggling(true);
    try {
      const res = await api.patch(`/admin/guests/${detail.id}/toggle-active/`);
      const updated = { ...detail, is_active: res.data.is_active };
      setDetail(updated);
      setRowData(prev => prev.map(g => g.id === detail.id ? { ...g, is_active: res.data.is_active } : g));
      toast.success(res.data.is_active ? 'Guest activated' : 'Guest deactivated');
    } catch {
      toast.error('Failed to update guest status');
    }
    setToggling(false);
  }

  async function handleCreateGuest() {
    if (!createForm.email || !createForm.full_name) {
      toast.error('Email and name are required');
      return;
    }
    setCreating(true);
    try {
      await api.post('/admin/guests/create/', createForm);
      toast.success('Guest created');
      setShowCreate(false);
      setCreateForm({ email: '', full_name: '', phone: '' });
      fetchGuests(1);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; email?: string[] } } };
      toast.error(err?.response?.data?.detail || err?.response?.data?.email?.[0] || 'Create failed');
    }
    setCreating(false);
  }

  const BlacklistRenderer = (params: ICellRendererParams) => (
    params.value ? (
      <span className={`${BADGE} bg-red-50 text-red-700 border border-red-200`}>Blacklisted</span>
    ) : null
  );

  const StatusRenderer = (params: ICellRendererParams) => (
    <span className={`${BADGE} ${activeStatusColors[String(params.value)] || 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
      {params.value ? 'Active' : 'Inactive'}
    </span>
  );

  const ActionsRenderer = (params: ICellRendererParams) => {
    const btn = 'inline-flex items-center justify-center rounded border transition shrink-0';
    return (
      <div className="flex items-center gap-1 h-full">
        <button type="button" title="View guest" onClick={() => openDetail(params.data)}
          className={`${btn} px-1.5 h-5 text-[10px] font-semibold text-teal-700 border-teal-600/35 bg-teal-50/50 hover:bg-teal-100`}>
          View
        </button>
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
    { field: 'full_name', headerName: 'Name', width: 140, minWidth: 140, maxWidth: 140, pinned: 'left', lockPinned: true, cellClass: 'cell-guest cell-pin cell-ellipsis', tooltipField: 'full_name', ...pinCol },
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 180, cellClass: 'cell-ellipsis', tooltipField: 'email' },
    { field: 'phone', headerName: 'Mobile', width: 118, valueFormatter: p => p.value || '—' },
    { field: 'total_bookings', headerName: 'Bookings', width: 88, cellClass: 'cell-amount' },
    { field: 'blacklisted', headerName: 'Flag', width: 90, cellRenderer: BlacklistRenderer, cellClass: '' },
    { field: 'is_active', headerName: 'Status', width: 90, cellRenderer: StatusRenderer, cellClass: '' },
    { field: 'date_joined', headerName: 'Joined', width: 108, valueFormatter: p => new Date(p.value).toLocaleDateString() },
    { headerName: 'Actions', width: 96, minWidth: 96, maxWidth: 96, pinned: 'right', lockPinned: true, cellRenderer: ActionsRenderer, sortable: false, filter: false, cellClass: 'cell-pin cell-actions', ...pinCol },
  ];

  const fitGridColumns = useCallback(() => {
    if (isMobile) return;
    const api = gridRef.current?.api;
    if (!api) return;
    api.sizeColumnsToFit({ defaultMinWidth: 68 });
  }, [isMobile]);

  const totalPages = total !== null ? Math.ceil(total / PAGE_SIZE) : 1;

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-0.5 p-0.5 rounded-md border border-white/5 flex-1 min-w-[12rem]">
            {(['all', 'active', 'inactive', 'blacklisted'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-2 py-1 rounded text-[11px] font-medium capitalize transition ${filter === tab ? 'bg-teal-700 text-white' : 'text-gray-500 hover:text-slate-800'}`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="relative shrink-0">
            <MdSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, email, mobile..."
              className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-xs text-slate-800 placeholder-gray-500 focus:outline-none focus:border-teal-600 w-48"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 text-white rounded-md text-xs font-medium hover:bg-teal-600 transition shrink-0"
          >
            <MdAdd size={16} /> New Guest
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-4">New Guest</h2>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-gray-500 mb-1">Full Name *</label>
                <input value={createForm.full_name} onChange={e => setCreateForm(f => ({ ...f, full_name: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-slate-800 focus:outline-none focus:border-teal-600" />
              </div>
              <div>
                <label className="block text-gray-500 mb-1">Email *</label>
                <input type="email" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-slate-800 focus:outline-none focus:border-teal-600" />
              </div>
              <div>
                <label className="block text-gray-500 mb-1">Phone</label>
                <input value={createForm.phone} onChange={e => setCreateForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-slate-800 focus:outline-none focus:border-teal-600" />
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <button type="button" disabled={creating} onClick={handleCreateGuest}
                className="flex-1 py-2 bg-teal-700 text-white text-sm font-medium rounded hover:bg-teal-600 disabled:opacity-50">
                Create
              </button>
              <button type="button" onClick={() => setShowCreate(false)}
                className="flex-1 py-2 border border-gray-200 text-gray-500 text-sm rounded hover:text-slate-800">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl overflow-hidden border border-gray-200 bg-[#141414] shadow-lg">
        <div className="ag-theme-quartz ag-theme-bookings w-full admin-grid-height overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full bg-white">
              <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <AgGridReact
              theme="legacy"
              ref={gridRef}
              rowData={rowData}
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
              ? `${total} guest${total !== 1 ? 's' : ''} · showing page ${page} of ${totalPages}`
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

      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-2xl overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800">{detail.full_name}</h2>
                <p className="text-sm text-gray-500 mt-0.5">{detail.email}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${detail.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {detail.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              {(['info', 'profile', 'history'] as const).map(tab => (
                <button key={tab} onClick={() => handleTabChange(tab)}
                  className={`px-6 py-3 text-sm font-medium capitalize transition-colors ${detailTab === tab ? 'text-teal-700 border-b-2 border-teal-600' : 'text-gray-500 hover:text-slate-800'}`}>
                  {tab === 'history' ? 'Stay History' : tab}
                </button>
              ))}
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* INFO TAB */}
              {detailTab === 'info' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <GField label="Phone" value={detail.phone || '—'} />
                    <GField label="Joined" value={new Date(detail.date_joined).toLocaleDateString()} />
                    <GField label="Total Bookings" value={String(detail.total_bookings)} />
                    <GField label="Account ID" value={`#${detail.id}`} />
                  </div>

                  <button onClick={toggleActive} disabled={toggling}
                    className={`w-full py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${detail.is_active ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30'}`}>
                    {toggling ? 'Updating…' : detail.is_active ? 'Deactivate Account' : 'Activate Account'}
                  </button>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 mb-3">Recent Bookings</h3>
                    {bookingsLoading ? (
                      <div className="flex justify-center py-6"><div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>
                    ) : guestBookings.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">No bookings yet</p>
                    ) : (
                      <div className="space-y-2">
                        {guestBookings.map(b => (
                          <div key={b.id} className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-start justify-between">
                              <span className="font-mono text-xs text-teal-700">{b.booking_ref}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[b.status] || ''}`}>{b.status.replace('_', ' ')}</span>
                            </div>
                            <p className="text-gray-600 text-sm mt-1">{b.room_type_name}</p>
                            <p className="text-gray-500 text-xs mt-0.5">{b.check_in_date} → {b.check_out_date}</p>
                            <p className="text-slate-800 text-sm font-medium mt-1">BDT {Number(b.total_price).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* PROFILE TAB */}
              {detailTab === 'profile' && (
                profileLoading ? (
                  <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>
                ) : profile ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-semibold text-slate-800">Guest Profile</h3>
                      {profileEditing ? (
                        <div className="flex gap-2">
                          <button onClick={saveProfile} disabled={profileSaving}
                            className="flex items-center gap-1 px-3 py-1 text-xs bg-teal-700 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50">
                            <MdSave size={14} />{profileSaving ? 'Saving…' : 'Save'}
                          </button>
                          <button onClick={() => { setProfileEditing(false); setProfileForm(profile); }}
                            className="px-3 py-1 text-xs text-gray-500 border border-gray-200 rounded-lg hover:text-slate-800">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setProfileEditing(true)}
                          className="flex items-center gap-1 px-3 py-1 text-xs text-teal-700 hover:bg-teal-50 rounded-lg">
                          <MdEdit size={14} />Edit
                        </button>
                      )}
                    </div>

                    {/* Profile Badges */}
                    <div className="flex gap-2 flex-wrap">
                      {profile.vip && <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-400 font-medium">VIP</span>}
                      {profile.blacklisted && <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400 font-medium">Blacklisted</span>}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${profile.loyalty_tier === 'PLATINUM' ? 'bg-purple-500/20 text-purple-400' : profile.loyalty_tier === 'GOLD' ? 'bg-yellow-500/20 text-yellow-400' : profile.loyalty_tier === 'SILVER' ? 'bg-gray-400/20 text-gray-600' : 'bg-gray-50 text-gray-500'}`}>
                        {profile.loyalty_tier} · {profile.loyalty_points} pts
                      </span>
                    </div>

                    {profileEditing ? (
                      <div className="grid grid-cols-2 gap-3">
                        <PField label="Nationality" value={profileForm.nationality || ''} onChange={v => setProfileForm(p => ({ ...p, nationality: v }))} />
                        <PField label="Date of Birth" value={profileForm.date_of_birth || ''} onChange={v => setProfileForm(p => ({ ...p, date_of_birth: v }))} type="date" />
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Gender</label>
                          <select value={profileForm.gender || ''} onChange={e => setProfileForm(p => ({ ...p, gender: e.target.value }))}
                            className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-slate-800 text-sm focus:outline-none focus:border-teal-600">
                            <option value="">—</option>
                            <option value="MALE">Male</option>
                            <option value="FEMALE">Female</option>
                            <option value="OTHER">Other</option>
                          </select>
                        </div>
                        <PField label="Address" value={profileForm.address_line1 || ''} onChange={v => setProfileForm(p => ({ ...p, address_line1: v }))} />
                        <PField label="City" value={profileForm.city || ''} onChange={v => setProfileForm(p => ({ ...p, city: v }))} />
                        <PField label="Country" value={profileForm.country || ''} onChange={v => setProfileForm(p => ({ ...p, country: v }))} />
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">ID Type</label>
                          <select value={profileForm.id_type || ''} onChange={e => setProfileForm(p => ({ ...p, id_type: e.target.value }))}
                            className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-slate-800 text-sm focus:outline-none focus:border-teal-600">
                            <option value="">—</option>
                            <option value="PASSPORT">Passport</option>
                            <option value="NID">National ID</option>
                            <option value="DRIVING_LICENSE">Driving License</option>
                          </select>
                        </div>
                        <PField label="ID Number" value={profileForm.id_number || ''} onChange={v => setProfileForm(p => ({ ...p, id_number: v }))} />
                        <PField label="ID Expiry" value={profileForm.id_expiry || ''} onChange={v => setProfileForm(p => ({ ...p, id_expiry: v }))} type="date" />
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Loyalty Tier</label>
                          <select value={profileForm.loyalty_tier || 'NONE'} onChange={e => setProfileForm(p => ({ ...p, loyalty_tier: e.target.value }))}
                            className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-slate-800 text-sm focus:outline-none focus:border-teal-600">
                            <option value="NONE">None</option>
                            <option value="SILVER">Silver</option>
                            <option value="GOLD">Gold</option>
                            <option value="PLATINUM">Platinum</option>
                          </select>
                        </div>
                        <PField label="Loyalty Points" value={String(profileForm.loyalty_points || 0)} onChange={v => setProfileForm(p => ({ ...p, loyalty_points: Number(v) }))} type="number" />
                        <div className="col-span-2 flex gap-4">
                          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                            <input type="checkbox" checked={profileForm.vip || false} onChange={e => setProfileForm(p => ({ ...p, vip: e.target.checked }))}
                              className="w-4 h-4 rounded bg-white/10 border-gray-300 text-teal-700" />VIP
                          </label>
                          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                            <input type="checkbox" checked={profileForm.blacklisted || false} onChange={e => setProfileForm(p => ({ ...p, blacklisted: e.target.checked }))}
                              className="w-4 h-4 rounded bg-white/10 border-gray-300 text-red-400" />Blacklisted
                          </label>
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs text-gray-500 mb-1 block">Notes</label>
                          <textarea value={profileForm.notes || ''} onChange={e => setProfileForm(p => ({ ...p, notes: e.target.value }))}
                            rows={2} className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-slate-800 text-sm focus:outline-none focus:border-teal-600" />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <GField label="Nationality" value={profile.nationality || '—'} />
                        <GField label="Date of Birth" value={profile.date_of_birth || '—'} />
                        <GField label="Gender" value={profile.gender || '—'} />
                        <GField label="Address" value={[profile.address_line1, profile.city, profile.country].filter(Boolean).join(', ') || '—'} />
                        <GField label="ID Type" value={profile.id_type ? profile.id_type.replace('_', ' ') : '—'} />
                        <GField label="ID Number" value={profile.id_number || '—'} />
                        <GField label="Preferences" value={profile.preferences || '—'} />
                        {profile.notes && <GField label="Notes" value={profile.notes} />}
                      </div>
                    )}
                  </div>
                ) : null
              )}

              {/* STAY HISTORY TAB */}
              {detailTab === 'history' && (
                historyLoading ? (
                  <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>
                ) : stayHistory.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8 bg-gray-50 rounded-lg">No stay history</p>
                ) : (
                  <div className="space-y-3">
                    {stayHistory.map(s => (
                      <div key={s.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="font-mono text-xs text-teal-700">{s.booking_ref}</span>
                            <p className="text-slate-800 text-sm mt-1">{s.room_type_name}{s.room_number ? ` · Room ${s.room_number}` : ''}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[s.status] || ''}`}>{s.status.replace('_', ' ')}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                          <div>{s.check_in_date} → {s.check_out_date}</div>
                          <div>{s.nights} night{s.nights !== 1 ? 's' : ''}</div>
                          <div className="text-right text-slate-800">BDT {Number(s.total_price).toLocaleString()}</div>
                        </div>
                        {s.actual_check_in && (
                          <p className="text-xs text-gray-600 mt-1">Checked in: {new Date(s.actual_check_in).toLocaleString()}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 pt-0">
              <button onClick={() => setDetail(null)} className="w-full py-2 text-gray-500 hover:text-slate-800 text-sm border border-gray-200 rounded-lg">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-gray-500 text-xs mb-0.5">{label}</p>
      <p className="text-slate-800 text-sm">{value}</p>
    </div>
  );
}

function PField({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-xs text-gray-500 mb-1 block">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-slate-800 text-sm focus:outline-none focus:border-teal-600" />
    </div>
  );
}
