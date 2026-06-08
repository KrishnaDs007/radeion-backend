import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CareCoordinatorsController } from './care-coordinators.controller';
import { CareCoordinatorsService } from './care-coordinators.service';

@Module({
  imports: [AuditModule, PrismaModule],
  controllers: [CareCoordinatorsController],
  providers: [CareCoordinatorsService],
})
export class CareCoordinatorsModule {}
