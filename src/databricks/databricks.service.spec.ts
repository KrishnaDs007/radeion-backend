import { ConfigService } from '@nestjs/config';
import { CacheService } from '../cache/cache.service';
import { InMemoryCacheService } from '../cache/in-memory-cache.service';
import { DatabricksService } from './databricks.service';

describe('DatabricksService', () => {
  const configService = new ConfigService({
    DATABRICKS_HOST: 'example.cloud.databricks.com',
    DATABRICKS_TOKEN: 'token',
    DATABRICKS_HTTP_PATH: '/sql/1.0/warehouses/warehouse-id',
  });

  it('parses a warehouse id from a Databricks HTTP path', () => {
    const service = new DatabricksService(
      configService,
      new CacheService(new InMemoryCacheService()),
    );

    expect(service.parseWarehouseId('/sql/1.0/warehouses/abc123')).toBe(
      'abc123',
    );
  });
});
