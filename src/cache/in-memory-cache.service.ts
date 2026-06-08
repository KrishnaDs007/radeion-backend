import { Injectable } from '@nestjs/common';
import { CacheDriver, CacheSetOptions } from './cache.types';

type CacheEntry<T> = {
  value: T;
  expiresAt?: number;
};

@Injectable()
export class InMemoryCacheService implements CacheDriver {
  private readonly store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): Promise<T | undefined> {
    const entry = this.store.get(key);

    if (!entry) {
      return Promise.resolve(undefined);
    }

    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return Promise.resolve(undefined);
    }

    return Promise.resolve(entry.value as T);
  }

  set<T>(key: string, value: T, options?: CacheSetOptions): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: options?.ttlSeconds
        ? Date.now() + options.ttlSeconds * 1000
        : undefined,
    });
    return Promise.resolve();
  }

  delete(key: string): Promise<void> {
    this.store.delete(key);
    return Promise.resolve();
  }

  clear(): Promise<void> {
    this.store.clear();
    return Promise.resolve();
  }
}
