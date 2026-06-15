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
    EMAIL_DRIVER: 'disabled',
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

  it('accepts Resend email delivery when required values are present', () => {
    expect(
      validateEnvironment({
        ...validEnvironment,
        EMAIL_DRIVER: 'resend',
        RESEND_API_KEY: 'resend-key',
        EMAIL_FROM: 'Radeion <no-reply@example.com>',
        INVITE_ACCEPT_URL: 'https://app.example.com/invites/accept',
        PASSWORD_RECOVERY_REDIRECT_URL:
          'https://app.example.com/password/recover',
      }),
    ).toEqual(
      expect.objectContaining({
        EMAIL_DRIVER: 'resend',
        RESEND_API_KEY: 'resend-key',
      }),
    );
  });

  it('rejects an invalid password recovery redirect URL', () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        PASSWORD_RECOVERY_REDIRECT_URL: 'not-a-url',
      }),
    ).toThrow('PASSWORD_RECOVERY_REDIRECT_URL must be a valid URL');
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

  it('rejects Resend without required delivery settings', () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        EMAIL_DRIVER: 'resend',
      }),
    ).toThrow('RESEND_API_KEY is required when EMAIL_DRIVER=resend');
  });

  it('rejects invalid numeric values', () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        DATABRICKS_POLL_INTERVAL_MS: '-1',
      }),
    ).toThrow('DATABRICKS_POLL_INTERVAL_MS must be a non-negative integer');
  });

  it('rejects unsafe Databricks table and column identifiers', () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        DATABRICKS_CLAIMS_TABLE: 'claims; DROP TABLE claims',
      }),
    ).toThrow(
      'DATABRICKS_CLAIMS_TABLE must be a safe SQL identifier or identifier path',
    );

    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        DATABRICKS_CLAIMS_PATIENT_ID_COLUMN: 'patient id',
      }),
    ).toThrow(
      'DATABRICKS_CLAIMS_PATIENT_ID_COLUMN must be a safe SQL identifier or identifier path',
    );
  });
});
