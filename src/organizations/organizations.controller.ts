import { Controller, Get } from '@nestjs/common';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@Controller('organizations')
@RequirePermission('organization.read')
export class OrganizationsController {
  @Get()
  listOrganizations() {
    return {
      data: [],
      message: 'Organization management API placeholder',
    };
  }
}
