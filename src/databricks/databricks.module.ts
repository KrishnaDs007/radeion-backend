import { Module } from '@nestjs/common';
import { CacheModule } from '../cache/cache.module';
import { DatabricksService } from './databricks.service';

@Module({
  imports: [CacheModule],
  providers: [DatabricksService],
  exports: [DatabricksService],
})
export class DatabricksModule {}
