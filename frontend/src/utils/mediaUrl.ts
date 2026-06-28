import { hotelImages } from '../constants/images';

/** Resolve API media paths or return a local hotel image fallback. */
export function toMediaUrl(
  path: string | null | undefined,
  fallback: string = hotelImages.default,
): string {
  if (!path) return fallback;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return path.startsWith('/') ? path : `/${path}`;
}
