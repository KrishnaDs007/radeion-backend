import { Controller, Get } from '@nestjs/common';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { OrganizationsService } from './organizations.service';

@Controller('organizations')
@RequirePermission('organization.read')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  async listOrganizations() {
    return {
      data: await this.organizationsService.listOrganizations(),
    };
  }
}
