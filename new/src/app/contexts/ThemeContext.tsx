import { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  colors: ThemeColors;
}

export interface ThemeColors {
  bg: string;
  bgSecondary: string;
  bgCard: string;
  bgInput: string;
  sidebar: string;
  header: string;
  border: string;
  borderLight: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryBg: string;
  success: string;
  successBg: string;
  danger: string;
  dangerBg: string;
  warning: string;
  warningBg: string;
  purple: string;
  purpleBg: string;
  orange: string;
  orangeBg: string;
  tableHover: string;
  tableAlt: string;
  shadow: string;
}

const darkColors: ThemeColors = {
  bg: '#0f1623',
  bgSecondary: '#111827',
  bgCard: '#1a2235',
  bgInput: '#0f1623',
  sidebar: '#1a2744',
  header: '#1a2744',
  border: '#2d3f6a',
  borderLight: '#1e293b',
  text: '#e2e8f0',
  textSecondary: '#94a3b8',
  textMuted: '#475569',
  primary: '#2563eb',
  primaryBg: '#1e3a5f',
  success: '#22c55e',
  successBg: '#0f2d1a',
  danger: '#ef4444',
  dangerBg: '#3b1111',
  warning: '#fbbf24',
  warningBg: '#2d2100',
  purple: '#a78bfa',
  purpleBg: '#1e1040',
  orange: '#f97316',
  orangeBg: '#2d1a0a',
  tableHover: '#0f1c30',
  tableAlt: '#0f1623',
  shadow: '0 4px 24px rgba(0,0,0,0.4)',
};

const lightColors: ThemeColors = {
  bg: '#f1f5f9',
  bgSecondary: '#e2e8f0',
  bgCard: '#ffffff',
  bgInput: '#f8fafc',
  sidebar: '#1e3a5f',
  header: '#1e3a5f',
  border: '#cbd5e1',
  borderLight: '#e2e8f0',
  text: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  primary: '#2563eb',
  primaryBg: '#dbeafe',
  success: '#16a34a',
  successBg: '#dcfce7',
  danger: '#dc2626',
  dangerBg: '#fee2e2',
  warning: '#d97706',
  warningBg: '#fef3c7',
  purple: '#7c3aed',
  purpleBg: '#ede9fe',
  orange: '#ea580c',
  orangeBg: '#ffedd5',
  tableHover: '#f0f9ff',
  tableAlt: '#f8fafc',
  shadow: '0 4px 24px rgba(0,0,0,0.08)',
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('hotel_theme') as Theme) || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('hotel_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  const colors = theme === 'dark' ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider');
  return ctx;
}
