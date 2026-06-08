import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { CacheService } from './cache.service';
import { CACHE_DRIVER } from './cache.types';
import { InMemoryCacheService } from './in-memory-cache.service';
import { RedisCacheService } from './redis-cache.service';
import { CacheModule } from './cache.module';

describe('CacheModule', () => {
  it('uses in-memory cache by default', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CacheModule],
    })
      .overrideProvider(ConfigService)
      .useValue(new ConfigService({}))
      .compile();

    expect(moduleRef.get(CACHE_DRIVER)).toBeInstanceOf(InMemoryCacheService);
    expect(moduleRef.get(CacheService)).toBeInstanceOf(CacheService);

    await moduleRef.close();
  });

  it('uses Redis cache when configured', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CacheModule],
    })
      .overrideProvider(ConfigService)
      .useValue(
        new ConfigService({
          CACHE_DRIVER: 'redis',
          REDIS_URL: 'redis://localhost:6379',
        }),
      )
      .compile();

    expect(moduleRef.get(CACHE_DRIVER)).toBeInstanceOf(RedisCacheService);

    await moduleRef.close();
  });
});
