import { Controller, Get } from '@nestjs/common';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@Controller('patient-metrics')
@RequirePermission('patientMetrics.read')
export class PatientMetricsController {
  @Get()
  listPatientMetrics() {
    return {
      data: [],
      message: 'Patient metrics API placeholder',
    };
  }
}
