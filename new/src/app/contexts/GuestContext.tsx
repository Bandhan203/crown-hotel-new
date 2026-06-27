import { createContext, useContext, useCallback } from 'react';
import type { Guest } from '../data/types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { initialGuests } from '../data/mockData';

interface GuestContextType {
  guests: Guest[];
  addGuest: (guest: Guest) => void;
  updateGuest: (guestId: string, updates: Partial<Guest>) => void;
  findGuestByPhone: (phone: string) => Guest | undefined;
}

const GuestContext = createContext<GuestContextType | null>(null);

export function GuestProvider({ children }: { children: React.ReactNode }) {
  const [guests, setGuests] = useLocalStorage<Guest[]>('hotel_guests', initialGuests);

  const addGuest = useCallback((guest: Guest) => {
    setGuests(prev => [...prev, guest]);
  }, [setGuests]);

  const updateGuest = useCallback((guestId: string, updates: Partial<Guest>) => {
    setGuests(prev => prev.map(g => g.id === guestId ? { ...g, ...updates } : g));
  }, [setGuests]);

  const findGuestByPhone = useCallback((phone: string) => {
    return guests.find(g => g.phone === phone);
  }, [guests]);

  return (
    <GuestContext.Provider value={{ guests, addGuest, updateGuest, findGuestByPhone }}>
      {children}
    </GuestContext.Provider>
  );
}

export function useGuests() {
  const ctx = useContext(GuestContext);
  if (!ctx) throw new Error('useGuests must be inside GuestProvider');
  return ctx;
}
