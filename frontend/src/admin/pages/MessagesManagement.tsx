import { useCallback, useEffect, useState } from 'react';
import { type ColDef, type ICellRendererParams } from 'ag-grid-community';
import { MdMessage, MdMarkEmailRead, MdDelete, MdReply, MdSearch, MdMarkEmailUnread } from 'react-icons/md';
import toast from 'react-hot-toast';
import api from '../../services/api';
import AdminDataGrid from '../components/AdminDataGrid';

interface ContactMsg {
  id: number; name: string; email: string; phone?: string;
  subject: string; message: string; is_read: boolean; is_replied?: boolean;
  admin_reply?: string; replied_at?: string | null; replied_by_name?: string | null;
  source?: string; source_display?: string;
  created_at: string;
}

type ReadFilter = 'ALL' | 'UNREAD' | 'READ' | 'REPLIED' | 'PENDING';

export default function MessagesManagement() {
  const [detail, setDetail] = useState<ContactMsg | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [readFilter, setReadFilter] = useState<ReadFilter>('ALL');
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({ total: 0, unread: 0, replied: 0, pending_reply: 0 });

  const bumpRefresh = () => setRefreshKey(k => k + 1);

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get('/admin/contacts/stats/');
      setStats(res.data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats, refreshKey]);

  const openDetail = async (row: ContactMsg) => {
    try {
      const res = await api.get(`/admin/contacts/${row.id}/`);
      setDetail(res.data);
      setReplyText(res.data.admin_reply || '');
      if (!res.data.is_read) {
        await api.patch(`/admin/contacts/${row.id}/read/`);
        bumpRefresh();
        setDetail({ ...res.data, is_read: true });
      }
    } catch {
      setDetail(row);
      setReplyText(row.admin_reply || '');
    }
  };

  const markUnread = async (id: number) => {
    try {
      await api.patch(`/admin/contacts/${id}/unread/`);
      toast.success('Marked as unread');
      bumpRefresh();
      if (detail?.id === id) setDetail({ ...detail, is_read: false });
    } catch {
      toast.error('Failed');
    }
  };

  const markAllRead = async () => {
    try {
      const res = await api.post('/admin/contacts/mark-all-read/');
      toast.success(`Marked ${res.data.marked} as read`);
      bumpRefresh();
    } catch {
      toast.error('Failed');
    }
  };

  const sendReply = async () => {
    if (!detail || !replyText.trim()) {
      toast.error('Write a reply first');
      return;
    }
    setReplying(true);
    try {
      const res = await api.post(`/admin/contacts/${detail.id}/reply/`, { reply: replyText.trim() });
      toast.success(res.data.email_sent ? 'Reply sent by email' : 'Reply saved (email not configured)');
      setDetail(res.data);
      bumpRefresh();
    } catch (err: unknown) {
      const detailErr = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detailErr || 'Failed to send reply');
    } finally {
      setReplying(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this message?')) return;
    try {
      await api.delete(`/admin/contacts/${id}/`);
      toast.success('Deleted');
      if (detail?.id === id) setDetail(null);
      bumpRefresh();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const queryParams: Record<string, string> = {};
  if (readFilter === 'UNREAD') queryParams.is_read = 'false';
  if (readFilter === 'READ') queryParams.is_read = 'true';
  if (readFilter === 'REPLIED') queryParams.status = 'replied';
  if (readFilter === 'PENDING') queryParams.status = 'pending';
  if (search.trim()) queryParams.search = search.trim();

  const columns: ColDef[] = [
    { field: 'name', headerName: 'Name', width: 120 },
    { field: 'email', headerName: 'Email', width: 170 },
    { field: 'phone', headerName: 'Phone', width: 110, valueFormatter: p => p.value || '—' },
    { field: 'subject', headerName: 'Subject', flex: 1, minWidth: 140 },
    {
      field: 'is_replied', headerName: 'Reply', width: 88,
      cellRenderer: (p: ICellRendererParams) => (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
          p.data?.is_replied ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
        }`}>
          {p.data?.is_replied ? 'Replied' : 'Pending'}
        </span>
      ),
    },
    {
      field: 'is_read', headerName: 'Read', width: 80,
      cellRenderer: (p: ICellRendererParams) => (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
          p.value ? 'bg-gray-100 text-gray-500' : 'bg-blue-50 text-blue-700'
        }`}>
          {p.value ? 'Read' : 'New'}
        </span>
      ),
    },
    {
      field: 'created_at', headerName: 'Date', width: 100,
      valueFormatter: p => new Date(p.value).toLocaleDateString(),
    },
    {
      headerName: 'Actions', width: 100, sortable: false, filter: false,
      cellRenderer: (p: ICellRendererParams) => (
        <div className="flex items-center gap-1 h-full">
          <button type="button" onClick={() => openDetail(p.data)} className="px-2 py-1 text-xs text-teal-700 hover:bg-teal-50 rounded">Open</button>
          <button type="button" onClick={() => handleDelete(p.data.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Delete">
            <MdDelete size={16} />
          </button>
        </div>
      ),
    },
  ];

  const filteredRefreshKey = `${refreshKey}-${readFilter}-${search}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: '"Gilda Display", serif' }}>
            <MdMessage className="inline mr-2 text-teal-700" />Messages
          </h1>
          <p className="text-sm text-gray-500 mt-1">Website inquiries — auto-notify hotel &amp; reply by email</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatBadge label="Total" value={stats.total} />
          <StatBadge label="Unread" value={stats.unread} accent="text-blue-700 bg-blue-50 border-blue-200" />
          <StatBadge label="Pending reply" value={stats.pending_reply} accent="text-amber-700 bg-amber-50 border-amber-200" />
          <StatBadge label="Replied" value={stats.replied} accent="text-emerald-700 bg-emerald-50 border-emerald-200" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 p-0.5 rounded-md border border-gray-200 bg-white">
          {(['ALL', 'UNREAD', 'PENDING', 'REPLIED', 'READ'] as ReadFilter[]).map(f => (
            <button key={f} type="button" onClick={() => setReadFilter(f)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                readFilter === f ? 'bg-teal-700 text-white' : 'text-gray-500 hover:text-slate-800'
              }`}>
              {f}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[12rem] max-w-xs">
          <MdSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, subject..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-md focus:border-teal-600 outline-none"
          />
        </div>
        {stats.unread > 0 && (
          <button type="button" onClick={markAllRead}
            className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-md hover:bg-gray-50">
            Mark all read
          </button>
        )}
      </div>

      <AdminDataGrid
        url="/admin/contacts/"
        columnDefs={columns}
        pageSize={15}
        refreshKey={filteredRefreshKey}
        queryParams={queryParams}
        rowLabel="message"
      />

      {detail && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-2 mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">{detail.subject || '(No subject)'}</h2>
                <p className="text-xs text-gray-500 mt-1">{detail.source_display || 'Website'} · {new Date(detail.created_at).toLocaleString()}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                {detail.is_read ? (
                  <button type="button" title="Mark unread" onClick={() => markUnread(detail.id)}
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                    <MdMarkEmailUnread size={18} />
                  </button>
                ) : null}
                <a href={`mailto:${detail.email}?subject=Re: ${encodeURIComponent(detail.subject || 'Your inquiry')}`}
                  className="p-2 text-teal-700 hover:bg-teal-50 rounded-lg text-xs font-medium">
                  Mail app
                </a>
              </div>
            </div>

            <div className="space-y-1 text-sm mb-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
              <p><span className="text-gray-500">From:</span> <strong>{detail.name}</strong> &lt;{detail.email}&gt;</p>
              {detail.phone && <p><span className="text-gray-500">Phone:</span> {detail.phone}</p>}
            </div>

            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Guest message</p>
              <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">{detail.message}</div>
            </div>

            {detail.is_replied && detail.admin_reply && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-emerald-700 uppercase mb-1">
                  Your reply {detail.replied_by_name ? `· ${detail.replied_by_name}` : ''}
                  {detail.replied_at ? ` · ${new Date(detail.replied_at).toLocaleString()}` : ''}
                </p>
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">{detail.admin_reply}</div>
              </div>
            )}

            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1 flex items-center gap-1">
                <MdReply size={14} /> {detail.is_replied ? 'Update reply & resend email' : 'Reply by email'}
              </p>
              <textarea
                rows={4}
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="Type your response to the guest..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-teal-600 outline-none resize-none"
              />
              <p className="text-[10px] text-gray-400 mt-1">Guest receives this at {detail.email}. Dev mode: check backend console for email output.</p>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={() => setDetail(null)}
                className="flex-1 py-2 text-gray-600 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Close</button>
              <button type="button" onClick={sendReply} disabled={replying || !replyText.trim()}
                className="flex-1 py-2 bg-teal-700 text-white text-sm font-medium rounded-lg hover:bg-teal-600 disabled:opacity-50">
                {replying ? 'Sending…' : detail.is_replied ? 'Resend reply' : 'Send reply'}
              </button>
              <button type="button" onClick={() => handleDelete(detail.id)}
                className="px-4 py-2 text-red-600 text-sm border border-red-200 rounded-lg hover:bg-red-50">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatBadge({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <span className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ${
      accent || 'text-slate-700 bg-slate-100 border-slate-200'
    }`}>
      {label}: {value}
    </span>
  );
}
