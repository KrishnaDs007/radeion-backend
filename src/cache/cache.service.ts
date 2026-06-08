import { Inject, Injectable } from '@nestjs/common';
import { CACHE_DRIVER } from './cache.types';
import type { CacheDriver, CacheSetOptions } from './cache.types';

@Injectable()
export class CacheService {
  constructor(
    @Inject(CACHE_DRIVER) private readonly cacheDriver: CacheDriver,
  ) {}

  async get<T>(key: string): Promise<T | undefined> {
    return this.cacheDriver.get<T>(key);
  }

  async set<T>(
    key: string,
    value: T,
    options?: CacheSetOptions,
  ): Promise<void> {
    await this.cacheDriver.set(key, value, options);
  }

  async delete(key: string): Promise<void> {
    await this.cacheDriver.delete(key);
  }

  async clear(): Promise<void> {
    await this.cacheDriver.clear();
  }

  async remember<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheSetOptions,
  ): Promise<T> {
    const cached = await this.get<T>(key);

    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, options);

    return value;
  }
}
