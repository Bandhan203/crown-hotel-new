/** Local Hotel Crown photography — served from /public/images */

export function img(filename: string): string {
  const seed = filename.replace('.jpg', '');
  return `https://picsum.photos/seed/${seed}/800/600`;
}

export const ALL_HOTEL_IMAGES = [
  'DSC07006.jpg', 'DSC07008.jpg', 'DSC07010.jpg', 'DSC07011.jpg', 'DSC07014.jpg',
  'DSC07017.jpg', 'DSC07022.jpg', 'DSC07023.jpg', 'DSC07025.jpg', 'DSC07026.jpg',
  'DSC07028.jpg', 'DSC07032.jpg', 'DSC07038.jpg', 'DSC07043.jpg', 'DSC07044.jpg',
  'DSC07049.jpg', 'DSC07051.jpg', 'DSC07055.jpg', 'DSC07057.jpg', 'DSC07062.jpg',
  'DSC07066.jpg', 'DSC07068.jpg', 'DSC07071.jpg', 'DSC07078.jpg', 'DSC07081.jpg',
  'DSC07087.jpg', 'DSC07088.jpg', 'DSC07090.jpg', 'DSC07095.jpg', 'DSC07097.jpg',
  'DSC07099.jpg', 'DSC07100.jpg', 'DSC07103.jpg', 'DSC07106.jpg', 'DSC07109.jpg',
  'DSC07110.jpg', 'DSC07112.jpg', 'DSC07113.jpg', 'DSC07114.jpg', 'DSC07116.jpg',
  'DSC07117.jpg', 'DSC07118.jpg', 'DSC07119.jpg', 'DSC07122.jpg', 'DSC07125.jpg',
  'DSC07129.jpg', 'DSC07131.jpg', 'DSC07133.jpg', 'DSC07134.jpg', 'DSC07138.jpg',
  'DSC07140.jpg', 'DSC07143.jpg', 'DSC07144.jpg', 'DSC07149.jpg', 'DSC07150.jpg',
  'DSC07153.jpg', 'DSC07155.jpg', 'DSC07159.jpg', 'DSC07161.jpg', 'DSC07164.jpg',
  'DSC07166.jpg', 'DSC07173.jpg', 'DSC07179.jpg', 'DSC07181.jpg', 'DSC07184.jpg',
  'DSC07186.jpg', 'DSC07188.jpg', 'DSC07190.jpg', 'DSC07195.jpg', 'DSC07199.jpg',
  'DSC07201.jpg', 'DSC07202.jpg', 'DSC07205.jpg', 'DSC07208.jpg', 'DSC07210.jpg',
  'DSC07211.jpg', 'DSC07213.jpg', 'DSC07214.jpg', 'DSC07217.jpg', 'DSC07219.jpg',
  'DSC07221.jpg', 'DSC07223.jpg', 'DSC07227.jpg', 'DSC07229.jpg', 'DSC07232.jpg',
  'DSC07234.jpg', 'DSC07237.jpg', 'DSC07238.jpg', 'DSC07241.jpg', 'DSC07243.jpg',
  'DSC07245.jpg', 'DSC07250.jpg', 'DSC07252.jpg', 'DSC07254.jpg', 'DSC07256.jpg',
  'DSC07261.jpg', 'DSC07262.jpg', 'DSC07265.jpg', 'DSC07266.jpg', 'DSC07268.jpg',
  'DSC07269.jpg', 'DSC07270.jpg', 'DSC07271.jpg', 'DSC07274.jpg', 'DSC07278.jpg',
  'DSC07279.jpg', 'DSC07281.jpg', 'DSC07282.jpg', 'DSC07284.jpg', 'DSC07285.jpg',
  'DSC07288.jpg', 'DSC07294.jpg', 'DSC07298.jpg', 'DSC07301.jpg', 'DSC07346.jpg',
  'DSC07355.jpg', 'DSC07357.jpg', 'DSC07358.jpg', 'DSC07361.jpg', 'DSC07362.jpg',
  'DSC07394.jpg', 'DSC07396.jpg', 'DSC07399.jpg', 'DSC07407.jpg', 'DSC07409.jpg',
  'DSC07411.jpg', 'DSC07414.jpg', 'DSC07419.jpg', 'DSC07420.jpg', 'DSC07427.jpg',
  'DSC07430.jpg',
] as const;

export const hotelImages = {
  default: img('DSC07049.jpg'),
  hero: [
    img('DSC07049.jpg'),
    img('DSC07068.jpg'),
    img('DSC07088.jpg'),
  ],
  about: img('DSC07100.jpg'),
  aboutGrid: [
    img('DSC07103.jpg'),
    img('DSC07110.jpg'),
    img('DSC07150.jpg'),
    img('DSC07250.jpg'),
  ],
  aboutCta: img('DSC07430.jpg'),
  rooms: {
    classic: img('DSC07110.jpg'),
    double: img('DSC07150.jpg'),
    twin: img('DSC07201.jpg'),
    signature: img('DSC07250.jpg'),
  },
  roomPageHero: img('DSC07150.jpg'),
  roomDetailsFallback: img('DSC07250.jpg'),
  features: {
    lobby: img('DSC07010.jpg'),
    banquet: img('DSC07190.jpg'),
    restaurant: img('DSC07210.jpg'),
    garage: img('DSC07270.jpg'),
    spa: img('DSC07284.jpg'),
  },
  booking: img('DSC07420.jpg'),
  video: img('DSC07419.jpg'),
  pageHero: img('DSC07049.jpg'),
  facilities: [
    img('DSC07298.jpg'),
    img('DSC07301.jpg'),
    img('DSC07346.jpg'),
    img('DSC07355.jpg'),
  ],
  restaurant: {
    hero: img('DSC07210.jpg'),
    main: img('DSC07211.jpg'),
    gallery: [
      img('DSC07213.jpg'),
      img('DSC07214.jpg'),
      img('DSC07217.jpg'),
      img('DSC07219.jpg'),
      img('DSC07221.jpg'),
      img('DSC07223.jpg'),
    ],
  },
  spa: {
    hero: img('DSC07284.jpg'),
    main: img('DSC07285.jpg'),
    services: [
      img('DSC07288.jpg'),
      img('DSC07294.jpg'),
      img('DSC07298.jpg'),
      img('DSC07301.jpg'),
    ],
    pool: img('DSC07346.jpg'),
  },
  team: [
    img('DSC07357.jpg'),
    img('DSC07358.jpg'),
    img('DSC07361.jpg'),
    img('DSC07362.jpg'),
    img('DSC07394.jpg'),
    img('DSC07396.jpg'),
  ],
  testimonials: [
    img('DSC07184.jpg'),
    img('DSC07186.jpg'),
    img('DSC07188.jpg'),
  ],
  newsFallback: img('DSC07068.jpg'),
  galleryFallback: img('DSC07049.jpg'),
};
