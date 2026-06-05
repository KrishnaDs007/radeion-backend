import { Injectable } from '@nestjs/common';
import { CacheDriver, CacheSetOptions } from './cache.types';

type CacheEntry<T> = {
  value: T;
  expiresAt?: number;
};

@Injectable()
export class InMemoryCacheService implements CacheDriver {
  private readonly store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);

    if (!entry) {
      return undefined;
    }

    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T, options?: CacheSetOptions): void {
    this.store.set(key, {
      value,
      expiresAt: options?.ttlSeconds
        ? Date.now() + options.ttlSeconds * 1000
        : undefined,
    });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}
