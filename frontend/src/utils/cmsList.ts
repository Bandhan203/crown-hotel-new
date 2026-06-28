/** Normalize DRF list responses (array or paginated). */
export function unwrapList<T>(payload: T[] | { results?: T[] } | null | undefined): T[] {
  if (!payload) return [];
  return Array.isArray(payload) ? payload : payload.results ?? [];
}
