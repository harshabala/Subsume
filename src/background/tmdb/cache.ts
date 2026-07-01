export const CACHE = new Map<string, { data: unknown; timestamp: number }>();
export const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours
