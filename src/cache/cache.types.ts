export type CacheSetOptions = {
  ttlSeconds?: number;
};

export type CacheDriver = {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, options?: CacheSetOptions): void;
  delete(key: string): void;
  clear(): void;
};
