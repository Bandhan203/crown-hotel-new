import { createContext, useContext, useState, useCallback } from 'react';
import type { SystemConfig, DayCloseRecord } from '../data/types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { initialConfig } from '../data/mockData';

interface HotelContextType {
  config: SystemConfig;
  updateConfig: (updates: Partial<SystemConfig>) => void;
  dayCloseRecords: DayCloseRecord[];
  addDayCloseRecord: (record: DayCloseRecord) => void;
  generateId: (prefix?: string) => string;
  generateRefNo: () => string;
}

const HotelContext = createContext<HotelContextType | null>(null);

export function HotelProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useLocalStorage<SystemConfig>('hotel_config', initialConfig);
  const [dayCloseRecords, setDayCloseRecords] = useLocalStorage<DayCloseRecord[]>('hotel_dayclose', []);
  const [counter, setCounter] = useState(100);

  const updateConfig = useCallback((updates: Partial<SystemConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, [setConfig]);

  const addDayCloseRecord = useCallback((record: DayCloseRecord) => {
    setDayCloseRecords(prev => [...prev, record]);
  }, [setDayCloseRecords]);

  const generateId = useCallback((prefix = 'id') => {
    const id = `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    return id;
  }, []);

  const generateRefNo = useCallback(() => {
    setCounter(c => c + 1);
    const year = new Date().getFullYear();
    const num = String(counter + 1).padStart(4, '0');
    return `NICE-${year}-${num}`;
  }, [counter]);

  return (
    <HotelContext.Provider value={{ config, updateConfig, dayCloseRecords, addDayCloseRecord, generateId, generateRefNo }}>
      {children}
    </HotelContext.Provider>
  );
}

export function useHotel() {
  const ctx = useContext(HotelContext);
  if (!ctx) throw new Error('useHotel must be inside HotelProvider');
  return ctx;
}
