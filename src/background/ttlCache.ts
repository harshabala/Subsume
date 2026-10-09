/** FIFO Map with TTL — shared by TMDb, OMDb, Google Books, Open Library in-memory caches. */

export type TtlCacheEntry<T> = { data: T; timestamp: number };

export class BoundedTtlCache<T> {
  private readonly store = new Map<string, TtlCacheEntry<T>>();

  constructor(
    private readonly maxSize: number,
    private readonly ttlMs: number,
  ) {}

  get size(): number {
    return this.store.size;
  }

  get(key: string, now: number = Date.now()): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (now - entry.timestamp >= this.ttlMs) {
      this.store.delete(key);
      return undefined;
    }
    return entry.data;
  }

  set(key: string, data: T, now: number = Date.now()): void {
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxSize) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
      }
    }
    this.store.set(key, { data, timestamp: now });
  }

  clear(): void {
    this.store.clear();
  }
}
