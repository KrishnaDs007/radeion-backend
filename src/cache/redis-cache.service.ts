import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { CacheDriver, CacheSetOptions } from './cache.types';

@Injectable()
export class RedisCacheService implements CacheDriver, OnApplicationShutdown {
  private readonly logger = new Logger(RedisCacheService.name);
  private readonly client: RedisClientType;
  private connectPromise?: Promise<void>;

  constructor(redisUrl: string) {
    this.client = createClient({
      url: redisUrl,
    });

    this.client.on('error', (error) => {
      this.logger.error('Redis cache error', error);
    });
  }

  async get<T>(key: string): Promise<T | undefined> {
    await this.connect();
    const value = await this.client.get(key);

    if (value === null) {
      return undefined;
    }

    return JSON.parse(value) as T;
  }

  async set<T>(
    key: string,
    value: T,
    options?: CacheSetOptions,
  ): Promise<void> {
    await this.connect();
    const serializedValue = JSON.stringify(value);

    if (options?.ttlSeconds) {
      await this.client.set(key, serializedValue, {
        EX: options.ttlSeconds,
      });
      return;
    }

    await this.client.set(key, serializedValue);
  }

  async delete(key: string): Promise<void> {
    await this.connect();
    await this.client.del(key);
  }

  async clear(): Promise<void> {
    await this.connect();
    await this.client.flushDb();
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }

  private async connect(): Promise<void> {
    if (this.client.isOpen) {
      return;
    }

    this.connectPromise ??= this.client.connect().then(() => undefined);
    await this.connectPromise;
  }
}
