export const MAX_EXTRA_BEDS = 3;

export interface RoomCapacityInput {
  maxGuestsPerRoom: number;
  numRooms: number;
  adults: number;
  children: number;
  infants: number;
  extraBeds: number;
}

export interface RoomCapacityResult {
  ok: boolean;
  totalPax: number;
  baseCapacity: number;
  effectiveCapacity: number;
  /** Minimum extra beds required so base + extra beds fit all guests */
  extraBedsRequired: number;
  /** Additional extra beds still needed given current extra bed count */
  extraBedsShort: number;
  exceedsMaxExtraBeds: boolean;
}

export function checkRoomCapacity(input: RoomCapacityInput): RoomCapacityResult | null {
  const { maxGuestsPerRoom, numRooms, adults, children, infants, extraBeds } = input;
  if (!maxGuestsPerRoom || maxGuestsPerRoom <= 0) return null;

  const rooms = Math.max(1, numRooms);
  const totalPax =
    Math.max(0, adults) + Math.max(0, children) + Math.max(0, infants);
  const baseCapacity = maxGuestsPerRoom * rooms;
  const effectiveCapacity = baseCapacity + Math.max(0, extraBeds);
  const extraBedsRequired = Math.max(0, totalPax - baseCapacity);
  const extraBedsShort = Math.max(0, totalPax - effectiveCapacity);

  return {
    ok: totalPax <= effectiveCapacity,
    totalPax,
    baseCapacity,
    effectiveCapacity,
    extraBedsRequired,
    extraBedsShort,
    exceedsMaxExtraBeds: extraBedsRequired > MAX_EXTRA_BEDS,
  };
}

export function formatCapacityWarning(
  roomName: string,
  maxPerRoom: number,
  numRooms: number,
  result: RoomCapacityResult,
): string {
  if (result.ok) return '';

  const roomLabel = numRooms === 1 ? '1 room' : `${numRooms} rooms`;
  let msg =
    `${result.totalPax} guest${result.totalPax !== 1 ? 's' : ''} exceed capacity for ` +
    `${roomName} (${maxPerRoom} per room × ${roomLabel} = ${result.baseCapacity} base).`;

  if (result.extraBedsRequired > 0) {
    msg += ` Add at least ${result.extraBedsRequired} extra bed${result.extraBedsRequired !== 1 ? 's' : ''}`;
    if (result.extraBedsShort > 0) {
      msg += ` — ${result.extraBedsShort} more needed with current setting`;
    }
    msg += '.';
  }

  if (result.exceedsMaxExtraBeds) {
    msg += ` Maximum ${MAX_EXTRA_BEDS} extra beds allowed; book more room(s) or reduce PAX.`;
  }

  return msg;
}
