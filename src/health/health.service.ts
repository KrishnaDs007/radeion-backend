import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigurationStatus, HealthStatus } from './health.types';

@Injectable()
export class HealthService {
  constructor(private readonly configService: ConfigService) {}

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
      },
      cache: {
        driver: this.configService.get<string>('CACHE_DRIVER') ?? 'memory',
      },
    };
  }

  private hasConfig(key: string): boolean {
    const value = this.configService.get<string>(key);
    return Boolean(value?.trim());
  }
}
