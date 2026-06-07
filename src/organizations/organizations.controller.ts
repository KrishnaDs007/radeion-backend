import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import type { UserContext } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationStatusDto } from './dto/update-organization-status.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
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

  @Get(':id')
  async getOrganization(@Param('id') id: string) {
    return {
      data: await this.organizationsService.getOrganization(id),
    };
  }

  @RequirePermission('organization.create')
  @Post()
  async createOrganization(
    @Body() body: CreateOrganizationDto,
    @CurrentUser() user: UserContext,
  ) {
    return {
      data: await this.organizationsService.createOrganization(body, user),
    };
  }

  @RequirePermission('organization.update')
  @Patch(':id')
  async updateOrganization(
    @Param('id') id: string,
    @Body() body: UpdateOrganizationDto,
    @CurrentUser() user: UserContext,
  ) {
    return {
      data: await this.organizationsService.updateOrganization(id, body, user),
    };
  }

  @RequirePermission('organization.update')
  @Patch(':id/status')
  async updateOrganizationStatus(
    @Param('id') id: string,
    @Body() body: UpdateOrganizationStatusDto,
    @CurrentUser() user: UserContext,
  ) {
    return {
      data: await this.organizationsService.updateOrganizationStatus(
        id,
        body,
        user,
      ),
    };
  }
}
