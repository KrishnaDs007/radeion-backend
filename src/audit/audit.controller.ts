import { Controller, Get, Query } from '@nestjs/common';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { AuditService } from './audit.service';
import { ListAuditLogsDto } from './dto/list-audit-logs.dto';

@Controller('audit-logs')
@RequirePermission('audit.read')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async listAuditLogs(@Query() query: ListAuditLogsDto) {
    return this.auditService.list(query);
  }
}
