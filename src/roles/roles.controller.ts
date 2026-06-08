import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type { UserContext } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { AssignRoleDto } from './dto/assign-role.dto';
import { RevokeRoleAssignmentDto } from './dto/revoke-role-assignment.dto';
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

  @RequirePermission('role.read')
  @Get('assignments')
  async listAssignments(@CurrentUser() user: UserContext) {
    return {
      data: await this.rolesService.listAssignments(user),
    };
  }

  @RequirePermission('role.assign')
  @Post('assignments')
  async assignRole(
    @Body() body: AssignRoleDto,
    @CurrentUser() user: UserContext,
  ) {
    return {
      data: await this.rolesService.assignRole(body, user),
    };
  }

  @RequirePermission('role.assign')
  @Post('assignments/:id/revoke')
  async revokeAssignment(
    @Param('id') id: string,
    @Body() body: RevokeRoleAssignmentDto,
    @CurrentUser() user: UserContext,
  ) {
    return {
      data: await this.rolesService.revokeAssignment(id, body, user),
    };
  }
}
