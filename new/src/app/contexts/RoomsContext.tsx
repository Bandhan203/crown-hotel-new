import { createContext, useContext, useCallback } from 'react';
import type { Room, RoomStatus, Folio, Transaction } from '../data/types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { initialRooms, initialFolios, initialTransactions } from '../data/mockData';

interface RoomsContextType {
  rooms: Room[];
  folios: Folio[];
  transactions: Transaction[];
  updateRoomStatus: (roomId: string, status: RoomStatus) => void;
  addFolio: (folio: Folio) => void;
  updateFolio: (folioId: string, updates: Partial<Folio>) => void;
  addTransaction: (tx: Transaction) => void;
  getFolioBalance: (folioId: string) => number;
  getActiveForioForRoom: (roomId: string) => Folio | undefined;
  getFolioTransactions: (folioId: string) => Transaction[];
}

const RoomsContext = createContext<RoomsContextType | null>(null);

export function RoomsProvider({ children }: { children: React.ReactNode }) {
  const [rooms, setRooms] = useLocalStorage<Room[]>('hotel_rooms', initialRooms);
  const [folios, setFolios] = useLocalStorage<Folio[]>('hotel_folios', initialFolios);
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>('hotel_transactions', initialTransactions);

  const updateRoomStatus = useCallback((roomId: string, status: RoomStatus) => {
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, status } : r));
  }, [setRooms]);

  const addFolio = useCallback((folio: Folio) => {
    setFolios(prev => [...prev, folio]);
  }, [setFolios]);

  const updateFolio = useCallback((folioId: string, updates: Partial<Folio>) => {
    setFolios(prev => prev.map(f => f.id === folioId ? { ...f, ...updates } : f));
  }, [setFolios]);

  const addTransaction = useCallback((tx: Transaction) => {
    setTransactions(prev => [...prev, tx]);
  }, [setTransactions]);

  const getFolioTransactions = useCallback((folioId: string) => {
    return transactions.filter(t => t.folioId === folioId);
  }, [transactions]);

  const getFolioBalance = useCallback((folioId: string) => {
    const txs = transactions.filter(t => t.folioId === folioId);
    return txs.reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const getActiveForioForRoom = useCallback((roomId: string) => {
    return folios.find(f => f.roomId === roomId && (f.status === 'inhouse' || f.status === 'reserved'));
  }, [folios]);

  return (
    <RoomsContext.Provider value={{ rooms, folios, transactions, updateRoomStatus, addFolio, updateFolio, addTransaction, getFolioBalance, getActiveForioForRoom, getFolioTransactions }}>
      {children}
    </RoomsContext.Provider>
  );
}

export function useRooms() {
  const ctx = useContext(RoomsContext);
  if (!ctx) throw new Error('useRooms must be inside RoomsProvider');
  return ctx;
}
