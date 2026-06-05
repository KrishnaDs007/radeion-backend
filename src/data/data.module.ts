import { Module } from '@nestjs/common';
import { DatabricksModule } from '../databricks/databricks.module';
import { ClaimsController } from './claims.controller';
import { PatientMetricsController } from './patient-metrics.controller';
import { ProvidersController } from './providers.controller';

@Module({
  imports: [DatabricksModule],
  controllers: [
    ClaimsController,
    PatientMetricsController,
    ProvidersController,
  ],
})
export class DataModule {}
