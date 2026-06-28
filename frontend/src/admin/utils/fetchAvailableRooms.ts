import api from '../../services/api';

export interface AvailableRoom {
  id: number;
  room_number: string;
  floor: number;
  status: string;
  room_type: string;
  room_type_id: number;
}

/** Nights between two YYYY-MM-DD strings (timezone-safe). */
export function nightsBetween(checkIn: string, checkOut: string): number {
  const [y1, m1, d1] = checkIn.split('-').map(Number);
  const [y2, m2, d2] = checkOut.split('-').map(Number);
  const start = Date.UTC(y1, m1 - 1, d1);
  const end = Date.UTC(y2, m2 - 1, d2);
  return Math.max(0, (end - start) / 86400000);
}

export function canPickRoom(roomType: string, checkIn: string, checkOut: string): boolean {
  return Boolean(roomType && checkIn && checkOut && nightsBetween(checkIn, checkOut) > 0);
}

/** Rooms free for the given type and date range (excludes overlapping bookings). */
export async function fetchAvailableRooms(
  roomTypeId: number | string,
  checkIn: string,
  checkOut: string,
  excludeBookingId?: number,
): Promise<AvailableRoom[]> {
  if (!canPickRoom(String(roomTypeId), checkIn, checkOut)) return [];

  const params: Record<string, string | number> = {
    room_type: roomTypeId,
    check_in_date: checkIn,
    check_out_date: checkOut,
  };
  if (excludeBookingId) {
    params.exclude_booking = excludeBookingId;
  }

  const res = await api.get('/admin/reservations/available-rooms/', { params });
  return res.data.rooms ?? [];
}
