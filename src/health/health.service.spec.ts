import { ConfigService } from '@nestjs/config';
import { HealthService } from './health.service';

describe('HealthService', () => {
  it('returns config presence without exposing values', () => {
    const prismaService = {
      $queryRaw: jest.fn(),
    };
    const cacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    };
    const service = new HealthService(
      new ConfigService({
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_PUBLISHABLE_KEY: 'publishable',
        SUPABASE_SECRET_KEY: 'secret',
        DATABASE_URL: 'postgresql://example',
        DIRECT_URL: '',
        DATABRICKS_HOST: 'example.cloud.databricks.com',
        DATABRICKS_TOKEN: 'token',
        DATABRICKS_HTTP_PATH: '/sql/1.0/warehouses/id',
        DATABRICKS_CLAIMS_TABLE: 'claims',
        DATABRICKS_CLAIMS_ORGANIZATION_ID_COLUMN: 'organization_id',
        DATABRICKS_CLAIMS_PRACTICE_ID_COLUMN: 'practice_id',
        DATABRICKS_CLAIMS_PROVIDER_ID_COLUMN: 'provider_id',
        DATABRICKS_CLAIMS_PATIENT_ID_COLUMN: 'patient_id',
        DATABRICKS_CLAIMS_DATE_COLUMN: 'service_date',
        DATABRICKS_PROVIDERS_TABLE: 'providers',
        DATABRICKS_PROVIDERS_ORGANIZATION_ID_COLUMN: 'organization_id',
        DATABRICKS_PROVIDERS_PRACTICE_ID_COLUMN: 'practice_id',
        DATABRICKS_PROVIDERS_PROVIDER_ID_COLUMN: 'provider_id',
        DATABRICKS_PROVIDERS_PATIENT_ID_COLUMN: 'patient_id',
        DATABRICKS_PATIENT_METRICS_TABLE: 'patient_metrics',
        CACHE_DRIVER: 'memory',
        EMAIL_DRIVER: 'resend',
        EMAIL_FROM: 'Radeion <no-reply@example.com>',
        RESEND_API_KEY: 'resend-key',
        INVITE_ACCEPT_URL: 'https://app.example.com/invites/accept',
        PASSWORD_RECOVERY_REDIRECT_URL:
          'https://app.example.com/password/recover',
      }),
      prismaService as never,
      cacheService as never,
    );

    expect(service.getConfigurationStatus()).toEqual({
      supabase: {
        url: true,
        publishableKey: true,
        secretKey: true,
      },
      database: {
        databaseUrl: true,
        directUrl: false,
      },
      databricks: {
        host: true,
        token: true,
        httpPath: true,
        warehouseId: false,
        tables: {
          claims: true,
          providers: true,
          patientMetrics: true,
        },
        columnMappings: {
          claims: true,
          providers: true,
          patientMetrics: false,
        },
      },
      cache: {
        driver: 'memory',
      },
      email: {
        driver: 'resend',
        from: true,
        resendApiKey: true,
        inviteAcceptUrl: true,
        passwordRecoveryRedirectUrl: true,
      },
    });
  });

  it('reports database health when Prisma query succeeds', async () => {
    const prismaService = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };
    const service = new HealthService(
      new ConfigService({}),
      prismaService as never,
      {} as never,
    );

    await expect(service.getDatabaseHealth()).resolves.toEqual({
      connected: true,
    });
    expect(prismaService.$queryRaw).toHaveBeenCalled();
  });

  it('reports database health as disconnected when Prisma query fails', async () => {
    const prismaService = {
      $queryRaw: jest.fn().mockRejectedValue(new Error('database unavailable')),
    };
    const service = new HealthService(
      new ConfigService({}),
      prismaService as never,
      {} as never,
    );

    await expect(service.getDatabaseHealth()).resolves.toEqual({
      connected: false,
    });
  });

  it('reports cache health when the cache round trip succeeds', async () => {
    const cacheService = {
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue({
        ok: true,
      }),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    const service = new HealthService(
      new ConfigService({
        CACHE_DRIVER: 'memory',
      }),
      {} as never,
      cacheService as never,
    );

    await expect(service.getCacheHealth()).resolves.toEqual({
      connected: true,
      driver: 'memory',
    });
    expect(cacheService.set).toHaveBeenCalledWith(
      expect.stringMatching(/^health:cache:/),
      {
        ok: true,
      },
      {
        ttlSeconds: 10,
      },
    );
    expect(cacheService.delete).toHaveBeenCalledWith(
      expect.stringMatching(/^health:cache:/),
    );
  });

  it('reports cache health as disconnected when the probe fails', async () => {
    const cacheService = {
      set: jest.fn().mockRejectedValue(new Error('cache unavailable')),
      get: jest.fn(),
      delete: jest.fn(),
    };
    const service = new HealthService(
      new ConfigService({
        CACHE_DRIVER: 'redis',
      }),
      {} as never,
      cacheService as never,
    );

    await expect(service.getCacheHealth()).resolves.toEqual({
      connected: false,
      driver: 'redis',
    });
  });

  it('reports email health for disabled local delivery', () => {
    const service = new HealthService(
      new ConfigService({
        EMAIL_DRIVER: 'disabled',
        SUPABASE_URL: 'https://example.supabase.co',
      }),
      {} as never,
      {} as never,
    );

    expect(service.getEmailHealth()).toEqual({
      driver: 'disabled',
      inviteDelivery: {
        configured: false,
        ready: false,
        requires: [],
      },
      passwordRecovery: {
        configured: true,
        redirectUrl: false,
      },
    });
  });

  it('reports missing Resend email requirements', () => {
    const service = new HealthService(
      new ConfigService({
        EMAIL_DRIVER: 'resend',
        EMAIL_FROM: 'Radeion <no-reply@example.com>',
        SUPABASE_URL: 'https://example.supabase.co',
        PASSWORD_RECOVERY_REDIRECT_URL:
          'https://app.example.com/password/recover',
      }),
      {} as never,
      {} as never,
    );

    expect(service.getEmailHealth()).toEqual({
      driver: 'resend',
      inviteDelivery: {
        configured: true,
        ready: false,
        requires: ['RESEND_API_KEY'],
      },
      passwordRecovery: {
        configured: true,
        redirectUrl: true,
      },
    });
  });

  it('reports ready Resend email delivery', () => {
    const service = new HealthService(
      new ConfigService({
        EMAIL_DRIVER: 'resend',
        EMAIL_FROM: 'Radeion <no-reply@example.com>',
        RESEND_API_KEY: 'resend-key',
      }),
      {} as never,
      {} as never,
    );

    expect(service.getEmailHealth()).toEqual({
      driver: 'resend',
      inviteDelivery: {
        configured: true,
        ready: true,
        requires: [],
      },
      passwordRecovery: {
        configured: true,
        redirectUrl: false,
      },
    });
  });

  it('reports Databricks readiness with missing dataset mappings', () => {
    const service = new HealthService(
      new ConfigService({
        DATABRICKS_HOST: 'https://example.cloud.databricks.com',
        DATABRICKS_TOKEN: 'databricks-token',
        DATABRICKS_HTTP_PATH: '/sql/1.0/warehouses/warehouse-id',
        DATABRICKS_CLAIMS_TABLE: 'claims',
        DATABRICKS_CLAIMS_ORGANIZATION_ID_COLUMN: 'organization_id',
        DATABRICKS_CLAIMS_PRACTICE_ID_COLUMN: 'practice_id',
        DATABRICKS_CLAIMS_PROVIDER_ID_COLUMN: 'provider_id',
        DATABRICKS_CLAIMS_PATIENT_ID_COLUMN: 'patient_id',
        DATABRICKS_CLAIMS_DATE_COLUMN: 'service_date',
      }),
      {} as never,
      {} as never,
    );

    expect(service.getDatabricksHealth()).toEqual({
      ready: false,
      connection: {
        host: true,
        token: true,
        httpPath: true,
        warehouseId: false,
        missing: [],
      },
      datasets: {
        claims: {
          ready: true,
          table: true,
          columns: {
            organizationId: true,
            practiceId: true,
            providerId: true,
            patientId: true,
            date: true,
          },
          missing: [],
        },
        providers: {
          ready: false,
          table: false,
          columns: {
            organizationId: false,
            practiceId: false,
            providerId: false,
            patientId: false,
          },
          missing: [
            'DATABRICKS_PROVIDERS_TABLE',
            'DATABRICKS_PROVIDERS_ORGANIZATION_ID_COLUMN',
            'DATABRICKS_PROVIDERS_PRACTICE_ID_COLUMN',
            'DATABRICKS_PROVIDERS_PROVIDER_ID_COLUMN',
            'DATABRICKS_PROVIDERS_PATIENT_ID_COLUMN',
          ],
        },
        patientMetrics: {
          ready: false,
          table: false,
          columns: {
            organizationId: false,
            practiceId: false,
            providerId: false,
            patientId: false,
            date: false,
          },
          missing: [
            'DATABRICKS_PATIENT_METRICS_TABLE',
            'DATABRICKS_PATIENT_METRICS_ORGANIZATION_ID_COLUMN',
            'DATABRICKS_PATIENT_METRICS_PRACTICE_ID_COLUMN',
            'DATABRICKS_PATIENT_METRICS_PROVIDER_ID_COLUMN',
            'DATABRICKS_PATIENT_METRICS_PATIENT_ID_COLUMN',
            'DATABRICKS_PATIENT_METRICS_DATE_COLUMN',
          ],
        },
      },
      missing: [
        'DATABRICKS_PROVIDERS_TABLE',
        'DATABRICKS_PROVIDERS_ORGANIZATION_ID_COLUMN',
        'DATABRICKS_PROVIDERS_PRACTICE_ID_COLUMN',
        'DATABRICKS_PROVIDERS_PROVIDER_ID_COLUMN',
        'DATABRICKS_PROVIDERS_PATIENT_ID_COLUMN',
        'DATABRICKS_PATIENT_METRICS_TABLE',
        'DATABRICKS_PATIENT_METRICS_ORGANIZATION_ID_COLUMN',
        'DATABRICKS_PATIENT_METRICS_PRACTICE_ID_COLUMN',
        'DATABRICKS_PATIENT_METRICS_PROVIDER_ID_COLUMN',
        'DATABRICKS_PATIENT_METRICS_PATIENT_ID_COLUMN',
        'DATABRICKS_PATIENT_METRICS_DATE_COLUMN',
      ],
    });
  });

  it('reports Databricks readiness when required config is present', () => {
    const service = new HealthService(
      new ConfigService({
        DATABRICKS_HOST: 'https://example.cloud.databricks.com',
        DATABRICKS_TOKEN: 'databricks-token',
        DATABRICKS_HTTP_PATH: '/sql/1.0/warehouses/warehouse-id',
        DATABRICKS_CLAIMS_TABLE: 'claims',
        DATABRICKS_CLAIMS_ORGANIZATION_ID_COLUMN: 'organization_id',
        DATABRICKS_CLAIMS_PRACTICE_ID_COLUMN: 'practice_id',
        DATABRICKS_CLAIMS_PROVIDER_ID_COLUMN: 'provider_id',
        DATABRICKS_CLAIMS_PATIENT_ID_COLUMN: 'patient_id',
        DATABRICKS_CLAIMS_DATE_COLUMN: 'service_date',
        DATABRICKS_PROVIDERS_TABLE: 'providers',
        DATABRICKS_PROVIDERS_ORGANIZATION_ID_COLUMN: 'organization_id',
        DATABRICKS_PROVIDERS_PRACTICE_ID_COLUMN: 'practice_id',
        DATABRICKS_PROVIDERS_PROVIDER_ID_COLUMN: 'provider_id',
        DATABRICKS_PROVIDERS_PATIENT_ID_COLUMN: 'patient_id',
        DATABRICKS_PATIENT_METRICS_TABLE: 'patient_metrics',
        DATABRICKS_PATIENT_METRICS_ORGANIZATION_ID_COLUMN: 'organization_id',
        DATABRICKS_PATIENT_METRICS_PRACTICE_ID_COLUMN: 'practice_id',
        DATABRICKS_PATIENT_METRICS_PROVIDER_ID_COLUMN: 'provider_id',
        DATABRICKS_PATIENT_METRICS_PATIENT_ID_COLUMN: 'patient_id',
        DATABRICKS_PATIENT_METRICS_DATE_COLUMN: 'measured_at',
      }),
      {} as never,
      {} as never,
    );

    expect(service.getDatabricksHealth()).toEqual(
      expect.objectContaining({
        ready: true,
        missing: [],
      }),
    );
    expect(service.getDatabricksHealth().datasets.patientMetrics.ready).toBe(
      true,
    );
  });
});
