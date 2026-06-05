import { Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { InMemoryCacheService } from './in-memory-cache.service';

@Module({
  providers: [InMemoryCacheService, CacheService],
  exports: [CacheService],
})
export class CacheModule {}
