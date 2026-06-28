import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import PageHero from '../components/PageHero';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get('next') || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await login(email, password);
      navigate(nextPath);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHero
        title="Login"
        breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Login' }]}
      />

      <section className="py-20 bg-white">
        <div className="max-w-md mx-auto px-4">
          <div className="text-center mb-10">
            <p className="section-subtitle">WELCOME BACK</p>
            <div className="star-divider my-3">
              <span>★ ★ ★ ★ ★</span>
            </div>
            <h2 className="font-[var(--font-heading)] text-3xl text-[var(--color-dark)]">
              Sign In
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-500 p-3 rounded text-sm text-center">
                {error}
              </div>
            )}
            <div>
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-gray-200 px-5 py-4 text-sm text-[var(--color-dark)] placeholder:text-[var(--color-body)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-gray-200 px-5 py-4 text-sm text-[var(--color-dark)] placeholder:text-[var(--color-body)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-[var(--color-body)]">
                <input type="checkbox" className="accent-[var(--color-primary)]" />
                Remember me
              </label>
              <a
                href="#"
                className="text-[var(--color-primary)] hover:underline"
              >
                Forgot Password?
              </a>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-center disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <p className="text-center text-sm text-[var(--color-body)] mt-8">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="text-[var(--color-primary)] hover:underline"
            >
              Register Here
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
