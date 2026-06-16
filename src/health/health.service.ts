import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../cache/cache.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CacheHealthStatus,
  ConfigurationStatus,
  DatabaseHealthStatus,
  HealthStatus,
} from './health.types';

const CACHE_HEALTH_TIMEOUT_MS = 2_000;
const CACHE_HEALTH_TTL_SECONDS = 10;

@Injectable()
export class HealthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  getHealth(): HealthStatus {
    return {
      status: 'ok',
      service: 'radeion-backend',
      timestamp: new Date().toISOString(),
    };
  }

  getConfigurationStatus(): ConfigurationStatus {
    return {
      supabase: {
        url: this.hasConfig('SUPABASE_URL'),
        publishableKey: this.hasConfig('SUPABASE_PUBLISHABLE_KEY'),
        secretKey: this.hasConfig('SUPABASE_SECRET_KEY'),
      },
      database: {
        databaseUrl: this.hasConfig('DATABASE_URL'),
        directUrl: this.hasConfig('DIRECT_URL'),
      },
      databricks: {
        host: this.hasConfig('DATABRICKS_HOST'),
        token: this.hasConfig('DATABRICKS_TOKEN'),
        httpPath: this.hasConfig('DATABRICKS_HTTP_PATH'),
        warehouseId: this.hasConfig('DATABRICKS_WAREHOUSE_ID'),
        tables: {
          claims: this.hasConfig('DATABRICKS_CLAIMS_TABLE'),
          providers: this.hasConfig('DATABRICKS_PROVIDERS_TABLE'),
          patientMetrics: this.hasConfig('DATABRICKS_PATIENT_METRICS_TABLE'),
        },
        columnMappings: {
          claims: this.hasAllConfig([
            'DATABRICKS_CLAIMS_ORGANIZATION_ID_COLUMN',
            'DATABRICKS_CLAIMS_PRACTICE_ID_COLUMN',
            'DATABRICKS_CLAIMS_PROVIDER_ID_COLUMN',
            'DATABRICKS_CLAIMS_PATIENT_ID_COLUMN',
            'DATABRICKS_CLAIMS_DATE_COLUMN',
          ]),
          providers: this.hasAllConfig([
            'DATABRICKS_PROVIDERS_ORGANIZATION_ID_COLUMN',
            'DATABRICKS_PROVIDERS_PRACTICE_ID_COLUMN',
            'DATABRICKS_PROVIDERS_PROVIDER_ID_COLUMN',
            'DATABRICKS_PROVIDERS_PATIENT_ID_COLUMN',
          ]),
          patientMetrics: this.hasAllConfig([
            'DATABRICKS_PATIENT_METRICS_ORGANIZATION_ID_COLUMN',
            'DATABRICKS_PATIENT_METRICS_PRACTICE_ID_COLUMN',
            'DATABRICKS_PATIENT_METRICS_PROVIDER_ID_COLUMN',
            'DATABRICKS_PATIENT_METRICS_PATIENT_ID_COLUMN',
            'DATABRICKS_PATIENT_METRICS_DATE_COLUMN',
          ]),
        },
      },
      cache: {
        driver: this.configService.get<string>('CACHE_DRIVER') ?? 'memory',
      },
      email: {
        driver: this.configService.get<string>('EMAIL_DRIVER') ?? 'disabled',
        from: this.hasConfig('EMAIL_FROM'),
        resendApiKey: this.hasConfig('RESEND_API_KEY'),
        inviteAcceptUrl: this.hasConfig('INVITE_ACCEPT_URL'),
        passwordRecoveryRedirectUrl: this.hasConfig(
          'PASSWORD_RECOVERY_REDIRECT_URL',
        ),
      },
    };
  }

  async getDatabaseHealth(): Promise<DatabaseHealthStatus> {
    try {
      await this.prismaService.$queryRaw`SELECT 1`;

      return {
        connected: true,
      };
    } catch {
      return {
        connected: false,
      };
    }
  }

  async getCacheHealth(): Promise<CacheHealthStatus> {
    const driver = this.configService.get<string>('CACHE_DRIVER') ?? 'memory';
    const probeKey = `health:cache:${Date.now()}`;
    const probeValue = {
      ok: true,
    };

    try {
      await this.withTimeout(
        this.cacheService.set(probeKey, probeValue, {
          ttlSeconds: CACHE_HEALTH_TTL_SECONDS,
        }),
      );
      const cached = await this.withTimeout(
        this.cacheService.get<typeof probeValue>(probeKey),
      );
      await this.withTimeout(this.cacheService.delete(probeKey));

      return {
        connected: cached?.ok === true,
        driver,
      };
    } catch {
      return {
        connected: false,
        driver,
      };
    }
  }

  private hasConfig(key: string): boolean {
    const value = this.configService.get<string>(key);
    return Boolean(value?.trim());
  }

  private hasAllConfig(keys: string[]): boolean {
    return keys.every((key) => this.hasConfig(key));
  }

  private withTimeout<T>(promise: Promise<T>): Promise<T> {
    let timeout: NodeJS.Timeout | undefined;

    const timeoutPromise = new Promise<T>((_, reject) => {
      timeout = setTimeout(
        () => reject(new Error('Cache health check timed out')),
        CACHE_HEALTH_TIMEOUT_MS,
      );
      timeout.unref();
    });

    return Promise.race([promise, timeoutPromise]).finally(() => {
      if (timeout) {
        clearTimeout(timeout);
      }
    });
  }
}
