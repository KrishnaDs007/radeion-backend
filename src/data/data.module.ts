import { Module } from '@nestjs/common';
import { DatabricksModule } from '../databricks/databricks.module';
import { ClaimsController } from './claims.controller';
import { DataQueryService } from './data-query.service';
import { PatientMetricsController } from './patient-metrics.controller';
import { ProvidersController } from './providers.controller';

@Module({
  imports: [DatabricksModule],
  controllers: [
    ClaimsController,
    PatientMetricsController,
    ProvidersController,
  ],
  providers: [DataQueryService],
})
export class DataModule {}
