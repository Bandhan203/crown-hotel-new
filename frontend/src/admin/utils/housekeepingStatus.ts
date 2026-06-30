/** OPERA-style housekeeping statuses (matches backend rooms.models.Room.HousekeepingStatus). */
export const HK_STATUSES = [
  ['OC', 'Occupied Clean'],
  ['OD', 'Occupied Dirty'],
  ['VC', 'Vacant Clean'],
  ['VD', 'Vacant Dirty'],
  ['CO', 'Checkout'],
  ['ARR', 'Arrival'],
] as const;

export type HkStatus = (typeof HK_STATUSES)[number][0];

export const HK_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  OC: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Occ. Clean' },
  OD: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'Occ. Dirty' },
  VC: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Vacant Clean' },
  VD: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Vacant Dirty' },
  CO: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Dirty' },
  ARR: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Arrival' },
};

export const HK_BADGE: Record<string, string> = {
  OC: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  OD: 'bg-orange-50 text-orange-700 border border-orange-200',
  VC: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  VD: 'bg-red-50 text-red-700 border border-red-200',
  CO: 'bg-amber-50 text-amber-700 border border-amber-200',
  ARR: 'bg-blue-50 text-blue-700 border border-blue-200',
};

export const DIRTY_HK = new Set(['OD', 'VD', 'CO']);
export const CLEAN_HK = new Set(['OC', 'VC', 'ARR']);

export function isRoomOoo(roomStatus: string, hkStatus: string): boolean {
  return roomStatus === 'MAINTENANCE';
}

export function getHkLabel(hkStatus: string): string {
  return HK_COLORS[hkStatus]?.label || hkStatus.replace(/_/g, ' ');
}

export function isDirtyHk(hkStatus: string): boolean {
  return DIRTY_HK.has(hkStatus);
}

export function resolveRoomVisual(roomStatus: string, hkStatus: string): 'ooo' | 'dirty' | 'occupied' | 'available' {
  if (isRoomOoo(roomStatus, hkStatus)) return 'ooo';
  if (DIRTY_HK.has(hkStatus)) return 'dirty';
  if (roomStatus === 'OCCUPIED') return 'occupied';
  return 'available';
}
