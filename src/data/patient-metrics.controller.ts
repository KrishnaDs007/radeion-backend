import { Controller, Get, Query } from '@nestjs/common';
import type { UserContext } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { DataQueryService } from './data-query.service';
import { DataQueryDto } from './dto/data-query.dto';

@Controller('patient-metrics')
@RequirePermission('patientMetrics.read')
export class PatientMetricsController {
  constructor(private readonly dataQueryService: DataQueryService) {}

  @Get()
  async listPatientMetrics(
    @Query() query: DataQueryDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.dataQueryService.listPatientMetrics(query, user);
  }
}
