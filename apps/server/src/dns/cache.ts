import type { Settings } from "@mydns/shared";

export interface CacheEntry {
  records: Buffer;
  expiresAt: number;
}

export class DnsCache {
  private cache = new Map<string, CacheEntry>();
  hits = 0;
  misses = 0;

  constructor(private settings: Settings) {}

  updateSettings(settings: Settings): void {
    this.settings = settings;
    this.enforceLimit();
  }

  key(qtype: number, domain: string): string {
    return `${qtype}:${domain.toLowerCase()}`;
  }

  get(qtype: number, domain: string): Buffer | null {
    const k = this.key(qtype, domain);
    const entry = this.cache.get(k);
    if (!entry) {
      this.misses++;
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(k);
      this.misses++;
      return null;
    }
    this.hits++;
    return entry.records;
  }

  set(qtype: number, domain: string, records: Buffer, ttlSeconds: number): void {
    const clamped = Math.min(
      Math.max(ttlSeconds, this.settings.cacheMinTtl),
      this.settings.cacheMaxTtl,
    );
    const k = this.key(qtype, domain);
    this.cache.set(k, { records, expiresAt: Date.now() + clamped * 1000 });
    this.enforceLimit();
  }

  flush(): void {
    this.cache.clear();
  }

  purgeDomain(domain: string): void {
    const d = domain.toLowerCase();
    for (const key of this.cache.keys()) {
      if (key.endsWith(`:${d}`)) this.cache.delete(key);
    }
  }

  get size(): number {
    return this.cache.size;
  }

  get hitRate(): number {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : this.hits / total;
  }

  private enforceLimit(): void {
    while (this.cache.size > this.settings.cacheMaxEntries) {
      const first = this.cache.keys().next().value;
      if (first) this.cache.delete(first);
      else break;
    }
  }
}
