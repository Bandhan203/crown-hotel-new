import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { MdBadge, MdCheckCircle, MdLock } from 'react-icons/md';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface InvitePreview {
  email: string;
  full_name: string;
  department: string;
  position: string;
  expires_at: string;
  hotel_name: string;
}

export default function StaffJoin() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  useEffect(() => {
    if (!token) return;
    api.get(`/auth/staff-invite/${token}/`)
      .then(res => setPreview(res.data))
      .catch((err: { response?: { data?: { detail?: string } } }) => {
        setError(err.response?.data?.detail || 'Invalid or expired invite link.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const activate = async () => {
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (password !== passwordConfirm) {
      toast.error('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post(`/auth/staff-invite/${token}/accept/`, {
        password,
        password_confirm: passwordConfirm,
      });
      localStorage.setItem('tokens', JSON.stringify(res.data.tokens));
      localStorage.setItem('user', JSON.stringify(res.data.user));
      toast.success('Welcome! Your staff account is ready.');
      navigate('/admin', { replace: true });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e.response?.data?.detail || 'Activation failed');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !preview) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center space-y-4">
          <MdBadge className="mx-auto text-gray-400" size={48} />
          <h1 className="text-xl font-bold text-slate-800">Invite Link Invalid</h1>
          <p className="text-gray-500 text-sm">{error}</p>
          <Link to="/admin/login" className="inline-block text-teal-700 text-sm font-medium hover:underline">
            Go to Admin Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-teal-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="bg-teal-700 text-white px-6 py-8 text-center">
          <MdBadge className="mx-auto mb-3" size={40} />
          <h1 className="text-xl font-bold">{preview.hotel_name}</h1>
          <p className="text-teal-100 text-sm mt-1">Staff Account Setup</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-teal-50 border border-teal-100 rounded-lg p-4 text-sm space-y-1">
            <p><span className="text-gray-500">Name:</span> <strong>{preview.full_name}</strong></p>
            <p><span className="text-gray-500">Email:</span> <strong>{preview.email}</strong></p>
            {preview.department && <p><span className="text-gray-500">Department:</span> {preview.department}</p>}
            {preview.position && <p><span className="text-gray-500">Position:</span> {preview.position}</p>}
          </div>
          <p className="text-xs text-gray-500 text-center">
            Set your password below to activate your admin panel access.
            Link expires {new Date(preview.expires_at).toLocaleDateString()}.
          </p>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
              <MdLock size={14} /> New Password
            </label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-teal-600 focus:outline-none"
              placeholder="Min. 6 characters" autoComplete="new-password" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">Confirm Password</label>
            <input type="password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-teal-600 focus:outline-none"
              placeholder="Repeat password" autoComplete="new-password" />
          </div>
          <button type="button" disabled={submitting} onClick={activate}
            className="w-full py-3 bg-teal-700 text-white font-bold rounded-lg hover:bg-teal-600 disabled:opacity-50 flex items-center justify-center gap-2">
            <MdCheckCircle size={18} /> {submitting ? 'Activating…' : 'Activate & Enter Admin Panel'}
          </button>
        </div>
      </div>
    </div>
  );
}
