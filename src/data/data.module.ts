import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { DatabricksModule } from '../databricks/databricks.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ClaimsController } from './claims.controller';
import { DataQueryPresetsController } from './data-query-presets.controller';
import { DataQueryPresetsService } from './data-query-presets.service';
import { DataQueryService } from './data-query.service';
import { PatientMetricsController } from './patient-metrics.controller';
import { ProvidersController } from './providers.controller';

@Module({
  imports: [AuditModule, DatabricksModule, PrismaModule],
  controllers: [
    ClaimsController,
    DataQueryPresetsController,
    PatientMetricsController,
    ProvidersController,
  ],
  providers: [DataQueryPresetsService, DataQueryService],
})
export class DataModule {}
