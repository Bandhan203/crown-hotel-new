import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import PageHero from '../components/PageHero';

export default function Registration() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await register({
        full_name: form.fullName,
        email: form.email,
        phone: form.phone,
        password: form.password,
        confirm_password: form.confirmPassword,
      });
      toast.success('Registration successful!');
      navigate('/');
    } catch (error: any) {
      const errData = error.response?.data;
      const msg = errData?.detail || 
                  (errData ? Object.values(errData).flat().join(' ') : 'Registration failed');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHero
        title="Registration"
        breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Registration' }]}
      />

      <section className="py-20 bg-white">
        <div className="max-w-md mx-auto px-4">
          <div className="text-center mb-10">
            <p className="section-subtitle">JOIN US</p>
            <div className="star-divider my-3">
              <span>★ ★ ★ ★ ★</span>
            </div>
            <h2 className="font-[var(--font-heading)] text-3xl text-[var(--color-dark)]">
              Create Account
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <input
                type="text"
                name="fullName"
                placeholder="Full Name"
                value={form.fullName}
                onChange={handleChange}
                required
                className="w-full border border-gray-200 px-5 py-4 text-sm text-[var(--color-dark)] placeholder:text-[var(--color-body)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              />
            </div>
            <div>
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full border border-gray-200 px-5 py-4 text-sm text-[var(--color-dark)] placeholder:text-[var(--color-body)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              />
            </div>
            <div>
              <input
                type="tel"
                name="phone"
                placeholder="Phone Number"
                value={form.phone}
                onChange={handleChange}
                className="w-full border border-gray-200 px-5 py-4 text-sm text-[var(--color-dark)] placeholder:text-[var(--color-body)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              />
            </div>
            <div>
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                required
                className="w-full border border-gray-200 px-5 py-4 text-sm text-[var(--color-dark)] placeholder:text-[var(--color-body)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              />
            </div>
            <div>
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm Password"
                value={form.confirmPassword}
                onChange={handleChange}
                required
                className="w-full border border-gray-200 px-5 py-4 text-sm text-[var(--color-dark)] placeholder:text-[var(--color-body)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-[var(--color-body)]">
              <input type="checkbox" required className="accent-[var(--color-primary)]" />
              <span>
                I agree to the{' '}
                <a href="#" className="text-[var(--color-primary)] hover:underline">
                  Terms & Conditions
                </a>
              </span>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-center disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'REGISTERING...' : 'REGISTER'}
            </button>
          </form>

          <p className="text-center text-sm text-[var(--color-body)] mt-8">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-[var(--color-primary)] hover:underline"
            >
              Login Here
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
