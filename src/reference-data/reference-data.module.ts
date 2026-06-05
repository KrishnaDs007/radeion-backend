import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ReferenceDataController } from './reference-data.controller';
import { ReferenceDataService } from './reference-data.service';

@Module({
  imports: [AuditModule, PrismaModule],
  controllers: [ReferenceDataController],
  providers: [ReferenceDataService],
})
export class ReferenceDataModule {}
