import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';
import { CACHE_DRIVER, CacheDriver } from './cache.types';
import { InMemoryCacheService } from './in-memory-cache.service';
import { RedisCacheService } from './redis-cache.service';

@Module({
  imports: [ConfigModule],
  providers: [
    InMemoryCacheService,
    {
      provide: CACHE_DRIVER,
      inject: [ConfigService, InMemoryCacheService],
      useFactory: (
        configService: ConfigService,
        inMemoryCacheService: InMemoryCacheService,
      ): CacheDriver => {
        const cacheDriver = configService.get<string>('CACHE_DRIVER');
        const redisUrl = configService.get<string>('REDIS_URL');

        if (cacheDriver === 'redis' && redisUrl) {
          return new RedisCacheService(redisUrl);
        }

        return inMemoryCacheService;
      },
    },
    CacheService,
  ],
  exports: [CacheService],
})
export class CacheModule {}
