import { nightsBetween } from './fetchAvailableRooms';

export interface RatePlan {
  id: number;
  name: string;
  code: string;
  discount_type: 'PERCENTAGE' | 'FIXED' | string;
  discount_value: string;
  min_nights: number;
  max_nights: number | null;
  valid_from: string | null;
  valid_to: string | null;
  room_types: number[];
}

export interface RatePlanPricing {
  base_offer_rate: string;
  offer_rate: string;
  discount_pct: string;
  discount_amount: string;
}

export function isRatePlanApplicable(
  plan: RatePlan,
  roomTypeId: number,
  checkIn: string,
  checkOut: string,
): boolean {
  const nights = nightsBetween(checkIn, checkOut);
  if (nights <= 0) return false;
  if (plan.min_nights > nights) return false;
  if (plan.max_nights != null && plan.max_nights > 0 && plan.max_nights < nights) return false;
  if (roomTypeId && plan.room_types?.length > 0 && !plan.room_types.includes(roomTypeId)) {
    return false;
  }
  if (plan.valid_from && checkIn < plan.valid_from) return false;
  if (plan.valid_to && checkOut > plan.valid_to) return false;
  return true;
}

export function filterApplicableRatePlans(
  plans: RatePlan[],
  roomTypeId: number,
  checkIn: string,
  checkOut: string,
): RatePlan[] {
  return plans.filter(p => isRatePlanApplicable(p, roomTypeId, checkIn, checkOut));
}

/** Apply rate plan discount to rack rate (per night, before service/VAT). */
export function computeRatePlanPricing(
  rackPerNight: number,
  nights: number,
  numRooms: number,
  plan: RatePlan | null,
): RatePlanPricing {
  const rack = rackPerNight.toFixed(2);
  if (!plan || rackPerNight <= 0 || nights <= 0) {
    return {
      base_offer_rate: rack,
      offer_rate: rack,
      discount_pct: '0',
      discount_amount: '0',
    };
  }

  const dv = parseFloat(plan.discount_value) || 0;
  if (dv <= 0) {
    return {
      base_offer_rate: rack,
      offer_rate: rack,
      discount_pct: '0',
      discount_amount: '0',
    };
  }

  if (plan.discount_type === 'FIXED') {
    const perNightOff = Math.min(dv, rackPerNight);
    const net = rackPerNight - perNightOff;
    const discAmt = perNightOff * nights * numRooms;
    const equivPct = rackPerNight > 0 ? (perNightOff / rackPerNight) * 100 : 0;
    return {
      base_offer_rate: rack,
      offer_rate: net.toFixed(2),
      discount_pct: equivPct.toFixed(2),
      discount_amount: discAmt.toFixed(2),
    };
  }

  const pct = dv;
  const net = rackPerNight * (1 - pct / 100);
  const discAmt = rackPerNight * nights * numRooms * (pct / 100);
  return {
    base_offer_rate: rack,
    offer_rate: net.toFixed(2),
    discount_pct: String(pct),
    discount_amount: discAmt.toFixed(2),
  };
}

export function ratePlanHint(plan: RatePlan): string {
  const disc =
    plan.discount_type === 'FIXED'
      ? `BDT ${plan.discount_value}/night off`
      : `${plan.discount_value}% off`;
  const nights =
    plan.min_nights > 1
      ? ` · min ${plan.min_nights} nights`
      : '';
  return `${disc}${nights}`;
}
