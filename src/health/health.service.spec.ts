import { ConfigService } from '@nestjs/config';
import { HealthService } from './health.service';

describe('HealthService', () => {
  it('returns config presence without exposing values', () => {
    const prismaService = {
      $queryRaw: jest.fn(),
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
        CACHE_DRIVER: 'memory',
      }),
      prismaService as never,
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
      },
      cache: {
        driver: 'memory',
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
    );

    await expect(service.getDatabaseHealth()).resolves.toEqual({
      connected: true,
    });
    expect(prismaService.$queryRaw).toHaveBeenCalled();
  });
});
