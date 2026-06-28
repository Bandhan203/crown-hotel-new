import { useEffect, useState } from 'react';
import { type ColDef, type ICellRendererParams } from 'ag-grid-community';
import { MdMessage, MdMarkEmailRead } from 'react-icons/md';
import toast from 'react-hot-toast';
import api from '../../services/api';
import AdminDataGrid from '../components/AdminDataGrid';

interface ContactMsg {
  id: number; name: string; email: string; subject: string;
  message: string; is_read: boolean; created_at: string;
}

export default function MessagesManagement() {
  const [messages, setMessages] = useState<ContactMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ContactMsg | null>(null);

  const fetchMessages = () => {
    setLoading(true);
    api.get('/admin/contacts/')
      .then(res => setMessages(res.data.results || res.data))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchMessages(); }, []);

  const markRead = async (id: number) => {
    try {
      await api.patch(`/admin/contacts/${id}/read/`);
      toast.success('Marked as read');
      fetchMessages();
      if (detail?.id === id) setDetail({ ...detail!, is_read: true });
    } catch { toast.error('Failed'); }
  };

  const columns: ColDef[] = [
    { field: 'name', headerName: 'Name', width: 150 },
    { field: 'email', headerName: 'Email', width: 200 },
    { field: 'subject', headerName: 'Subject', flex: 1, minWidth: 200 },
    { field: 'is_read', headerName: 'Status', width: 110,
      cellRenderer: (p: ICellRendererParams) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.value ? 'bg-gray-500/20 text-gray-500' : 'bg-blue-500/20 text-blue-400'}`}>
          {p.value ? 'Read' : 'Unread'}
        </span>
      ),
    },
    { field: 'created_at', headerName: 'Date', width: 120,
      valueFormatter: p => new Date(p.value).toLocaleDateString() },
    { headerName: 'Actions', width: 120, sortable: false, filter: false,
      cellRenderer: (p: ICellRendererParams) => (
        <div className="flex items-center gap-1 h-full">
          <button onClick={() => setDetail(p.data)} className="px-2 py-1 text-xs text-teal-700 hover:bg-teal-50 rounded">View</button>
          {!p.data.is_read && (
            <button onClick={() => markRead(p.data.id)} className="p-1.5 text-green-400 hover:bg-green-500/10 rounded" title="Mark read">
              <MdMarkEmailRead size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: '"Gilda Display", serif' }}>
          <MdMessage className="inline mr-2 text-teal-700" />Messages
        </h1>
        <p className="text-sm text-gray-500 mt-1">Contact form submissions</p>
      </div>

      <AdminDataGrid url="/admin/contacts/" columnDefs={columns} pageSize={15} />

      {detail && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800">{detail.subject}</h2>
              {!detail.is_read && (
                <button onClick={() => markRead(detail.id)}
                  className="px-3 py-1 text-xs bg-teal-700 text-white rounded-lg">Mark Read</button>
              )}
            </div>
            <div className="space-y-2 text-sm mb-4">
              <p className="text-gray-500">From: <span className="text-slate-800">{detail.name} ({detail.email})</span></p>
              <p className="text-gray-500">Date: <span className="text-slate-800">{new Date(detail.created_at).toLocaleString()}</span></p>
            </div>
            <div className="bg-gray-50 border border-white/5 rounded-lg p-4 text-sm text-gray-600 whitespace-pre-wrap">
              {detail.message}
            </div>
            <button onClick={() => setDetail(null)} className="mt-4 w-full py-2 text-gray-500 hover:text-slate-800 text-sm">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
