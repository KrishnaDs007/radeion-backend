import { Injectable } from '@nestjs/common';
import { InMemoryCacheService } from './in-memory-cache.service';
import { CacheSetOptions } from './cache.types';

@Injectable()
export class CacheService {
  constructor(private readonly cacheDriver: InMemoryCacheService) {}

  get<T>(key: string): T | undefined {
    return this.cacheDriver.get<T>(key);
  }

  set<T>(key: string, value: T, options?: CacheSetOptions): void {
    this.cacheDriver.set(key, value, options);
  }

  delete(key: string): void {
    this.cacheDriver.delete(key);
  }

  clear(): void {
    this.cacheDriver.clear();
  }

  async remember<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheSetOptions,
  ): Promise<T> {
    const cached = this.get<T>(key);

    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, options);

    return value;
  }
}
