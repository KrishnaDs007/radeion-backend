import { Controller, Get } from '@nestjs/common';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { RolesService } from './roles.service';

@Controller('roles')
@RequirePermission('role.read')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  async listRoles() {
    return {
      data: await this.rolesService.listRoles(),
    };
  }
}
