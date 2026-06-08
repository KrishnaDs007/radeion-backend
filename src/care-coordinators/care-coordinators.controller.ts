import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type { UserContext } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CareCoordinatorsService } from './care-coordinators.service';
import { CreateCareCoordinatorAssignmentDto } from './dto/create-care-coordinator-assignment.dto';
import { RevokeCareCoordinatorAssignmentDto } from './dto/revoke-care-coordinator-assignment.dto';

@Controller('care-coordinators')
export class CareCoordinatorsController {
  constructor(
    private readonly careCoordinatorsService: CareCoordinatorsService,
  ) {}

  @RequirePermission('organization.read')
  @Get('assignments')
  async listAssignments(@CurrentUser() user: UserContext) {
    return {
      data: await this.careCoordinatorsService.listAssignments(user),
    };
  }

  @RequirePermission('organization.update')
  @Post('assignments')
  async createAssignment(
    @Body() body: CreateCareCoordinatorAssignmentDto,
    @CurrentUser() user: UserContext,
  ) {
    return {
      data: await this.careCoordinatorsService.createAssignment(body, user),
    };
  }

  @RequirePermission('organization.update')
  @Post('assignments/:id/revoke')
  async revokeAssignment(
    @Param('id') id: string,
    @Body() body: RevokeCareCoordinatorAssignmentDto,
    @CurrentUser() user: UserContext,
  ) {
    return {
      data: await this.careCoordinatorsService.revokeAssignment(id, body, user),
    };
  }
}
