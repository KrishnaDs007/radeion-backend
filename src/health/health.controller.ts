import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  getHealth() {
    return this.healthService.getHealth();
  }

  @Public()
  @Get('config')
  getConfigurationStatus() {
    return this.healthService.getConfigurationStatus();
  }

  @Public()
  @Get('database')
  getDatabaseHealth() {
    return this.healthService.getDatabaseHealth();
  }

  @Public()
  @Get('cache')
  getCacheHealth() {
    return this.healthService.getCacheHealth();
  }

  @Public()
  @Get('email')
  getEmailHealth() {
    return this.healthService.getEmailHealth();
  }

  @Public()
  @Get('databricks')
  getDatabricksHealth() {
    return this.healthService.getDatabricksHealth();
  }
}
