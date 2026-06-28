import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../services/api';

interface User {
  id: number;
  email: string;
  full_name: string;
  phone: string;
  role: 'ADMIN' | 'STAFF' | 'GUEST';
  avatar: string | null;
  date_joined: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  isStaff: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleLogoutEvent = () => setUser(null);
    window.addEventListener('auth:logout', handleLogoutEvent);

    const stored = localStorage.getItem('user');
    const tokens = localStorage.getItem('tokens');
    if (stored && tokens) {
      setUser(JSON.parse(stored));
      // Validate token by fetching profile
      api.get('/auth/me/').then(res => {
        setUser(res.data);
        localStorage.setItem('user', JSON.stringify(res.data));
      }).catch(() => {
        localStorage.removeItem('user');
        localStorage.removeItem('tokens');
        setUser(null);
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    return () => window.removeEventListener('auth:logout', handleLogoutEvent);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login/', { email, password });
    const { user: userData, tokens } = res.data;
    localStorage.setItem('tokens', JSON.stringify(tokens));
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const register = async (data: any) => {
    const res = await api.post('/auth/register/', data);
    const { user: userData, tokens } = res.data;
    localStorage.setItem('tokens', JSON.stringify(tokens));
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    const tokens = localStorage.getItem('tokens');
    if (tokens) {
      const { refresh } = JSON.parse(tokens);
      api.post('/auth/logout/', { refresh }).catch(() => {});
    }
    localStorage.removeItem('tokens');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      isAdmin: user?.role === 'ADMIN',
      isStaff: user?.role === 'STAFF',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
