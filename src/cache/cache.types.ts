export type CacheSetOptions = {
  ttlSeconds?: number;
};

export type CacheDriver = {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, options?: CacheSetOptions): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
};

export const CACHE_DRIVER = Symbol('CACHE_DRIVER');
