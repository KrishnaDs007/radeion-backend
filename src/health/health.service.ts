import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  ConfigurationStatus,
  DatabaseHealthStatus,
  HealthStatus,
} from './health.types';

@Injectable()
export class HealthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
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
    await this.prismaService.$queryRaw`SELECT 1`;

    return {
      connected: true,
    };
  }

  private hasConfig(key: string): boolean {
    const value = this.configService.get<string>(key);
    return Boolean(value?.trim());
  }

  private hasAllConfig(keys: string[]): boolean {
    return keys.every((key) => this.hasConfig(key));
  }
}
