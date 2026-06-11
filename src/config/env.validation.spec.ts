import { validateEnvironment } from './env.validation';

describe('validateEnvironment', () => {
  const validEnvironment = {
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_PUBLISHABLE_KEY: 'publishable',
    SUPABASE_SECRET_KEY: 'secret',
    DATABASE_URL: 'postgresql://user:password@localhost:5432/app',
    DIRECT_URL: 'postgresql://user:password@localhost:5432/app',
    DATABRICKS_HOST: 'https://example.cloud.databricks.com',
    DATABRICKS_TOKEN: 'token',
    DATABRICKS_HTTP_PATH: '/sql/1.0/warehouses/warehouse-id',
    CACHE_DRIVER: 'memory',
    PORT: '3000',
    DATABRICKS_POLL_MAX_ATTEMPTS: '10',
    DATABRICKS_POLL_INTERVAL_MS: '500',
    DATABRICKS_MAX_RESULT_CHUNKS: '10',
  };

  it('accepts a complete memory-cache environment', () => {
    expect(validateEnvironment(validEnvironment)).toBe(validEnvironment);
  });

  it('accepts Redis when REDIS_URL is present', () => {
    expect(
      validateEnvironment({
        ...validEnvironment,
        CACHE_DRIVER: 'redis',
        REDIS_URL: 'redis://localhost:6379',
      }),
    ).toEqual(
      expect.objectContaining({
        CACHE_DRIVER: 'redis',
        REDIS_URL: 'redis://localhost:6379',
      }),
    );
  });

  it('rejects missing required keys', () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        SUPABASE_SECRET_KEY: '',
      }),
    ).toThrow('SUPABASE_SECRET_KEY is required');
  });

  it('rejects Redis without a URL', () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        CACHE_DRIVER: 'redis',
      }),
    ).toThrow('REDIS_URL is required when CACHE_DRIVER=redis');
  });

  it('rejects invalid numeric values', () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        DATABRICKS_POLL_INTERVAL_MS: '-1',
      }),
    ).toThrow('DATABRICKS_POLL_INTERVAL_MS must be a non-negative integer');
  });
});
