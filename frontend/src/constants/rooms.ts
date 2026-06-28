import { hotelImages } from './images';

export type CrownRoom = {
  id: string;
  name: string;
  slug: string;
  max_guests: number;
  beds?: number;
  size?: number;
  price_bdt: number;
  price_usd: number;
  description: string;
  image: string;
};

export const CROWN_ROOMS: CrownRoom[] = [
  {
    id: 'crown-classic',
    name: 'Crown Classic',
    slug: 'crown-classic',
    max_guests: 1,
    beds: 1,
    price_bdt: 3499,
    price_usd: 28,
    description:
      'Enjoy a peaceful stay in the Crown Classic, a well-designed room created for solo travelers. With stylish décor, modern facilities, and a comfortable setting, it offers the perfect space to relax and recharge during your visit.',
    image: hotelImages.rooms.classic,
  },
  {
    id: 'crown-double',
    name: 'Crown Double',
    slug: 'crown-double',
    max_guests: 2,
    beds: 1,
    price_bdt: 4999,
    price_usd: 40,
    description:
      'The Crown Double combines comfort, style, and convenience in a welcoming space designed for two guests. With a cozy double bed, contemporary facilities, and a relaxing ambiance, it offers everything needed for a memorable stay.',
    image: hotelImages.rooms.double,
  },
  {
    id: 'crown-twin',
    name: 'Crown Twin',
    slug: 'crown-twin',
    max_guests: 2,
    beds: 2,
    price_bdt: 4999,
    price_usd: 40,
    description:
      'Enjoy a comfortable and refreshing stay in our Crown Twin room. Featuring two cozy twin beds, modern amenities, and a warm setting, this room is ideal for friends, colleagues, or companions seeking both comfort and convenience throughout their visit.',
    image: hotelImages.rooms.twin,
  },
  {
    id: 'crown-signature',
    name: 'Crown Signature',
    slug: 'crown-signature',
    max_guests: 2,
    beds: 1,
    price_bdt: 6499,
    price_usd: 52,
    description:
      'Designed with elegance and comfort in mind, the Crown Signature offers a welcoming space for two guests. Enjoy premium amenities, stylish décor, and a relaxing ambiance that makes every stay both comfortable and memorable.',
    image: hotelImages.rooms.signature,
  },
];
