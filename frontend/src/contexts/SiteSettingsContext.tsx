import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import api from '../services/api';

type GlobalSiteSettings = {
  site_name: string;
  light_logo: string | null;
  dark_logo: string | null;
  favicon: string | null;
  contact_phone: string;
  contact_email: string;
  address: string;
  map_embed_url: string;
  social_links: Record<string, string>;
};

type SiteSettingsMap = Record<string, string>;

type SiteSettingsContextType = {
  settings: SiteSettingsMap;
  loading: boolean;
  refresh: () => Promise<void>;
  getSetting: (key: string, fallback?: string) => string;
};

const SiteSettingsContext = createContext<SiteSettingsContextType | undefined>(undefined);

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettingsMap>({});
  const [loading, setLoading] = useState(true);

  const refresh = async (): Promise<void> => {
    try {
      setLoading(true);
      const res = await api.get<GlobalSiteSettings>('/site-settings/');
      const obj = res.data;
      
      const map: SiteSettingsMap = {
        site_name: obj.site_name || '',
        light_logo: obj.light_logo || '',
        dark_logo: obj.dark_logo || '',
        favicon: obj.favicon || '',
        contact_phone: obj.contact_phone || '',
        contact_email: obj.contact_email || '',
        contact_address: obj.address || '',
        map_embed_url: obj.map_embed_url || '',
        ...obj.social_links,
      };
      
      setSettings(map);
    } catch {
      // Fallback silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    const siteName = settings.site_name || 'Hotel Crown';
    document.title = `${siteName} | Rajshahi`;
  }, [settings]);

  const value = useMemo<SiteSettingsContextType>(() => ({
    settings,
    loading,
    refresh,
    getSetting: (key: string, fallback = '') => settings[key] || fallback,
  }), [settings, loading]);

  return (
    <SiteSettingsContext.Provider value={value}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings(): SiteSettingsContextType {
  const ctx = useContext(SiteSettingsContext);
  if (!ctx) {
    throw new Error('useSiteSettings must be used within SiteSettingsProvider');
  }
  return ctx;
}
