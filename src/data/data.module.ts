import { Module } from '@nestjs/common';
import { ClaimsController } from './claims.controller';
import { PatientMetricsController } from './patient-metrics.controller';
import { ProvidersController } from './providers.controller';

@Module({
  controllers: [
    ClaimsController,
    PatientMetricsController,
    ProvidersController,
  ],
})
export class DataModule {}
