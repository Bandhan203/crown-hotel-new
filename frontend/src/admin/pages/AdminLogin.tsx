import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';
import toast from 'react-hot-toast';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { getSetting } = useSiteSettings();

  const hotelName = getSetting('site_name', 'Hotel Crown');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/admin');
    } catch {
      toast.error('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">
            <span className="text-teal-700">{hotelName}</span>
          </h1>
          <p className="text-gray-500 mt-2 text-sm">Admin Portal — Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 placeholder-gray-500 outline-none transition focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
              placeholder="admin@hotel.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 placeholder-gray-500 outline-none transition focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 disabled:opacity-50 bg-teal-700 text-white font-semibold rounded-lg hover:bg-teal-800 transition"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
