import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
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
  async listOrganizations(@CurrentUser() user: UserContext) {
    return {
      data: await this.organizationsService.listOrganizations(user),
    };
  }

  @Get('export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="organizations.csv"')
  async exportOrganizations(@CurrentUser() user: UserContext) {
    return await this.organizationsService.exportOrganizations(user);
  }

  @Get(':id')
  async getOrganization(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
  ) {
    return {
      data: await this.organizationsService.getOrganization(id, user),
    };
  }

  @Get(':id/practices')
  async listOrganizationPractices(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
  ) {
    return {
      data: await this.organizationsService.listOrganizationPractices(id, user),
    };
  }

  @Get(':id/providers')
  async listOrganizationProviders(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
  ) {
    return {
      data: await this.organizationsService.listOrganizationProviders(id, user),
    };
  }

  @RequirePermission('user.read')
  @Get(':id/users')
  async listOrganizationUsers(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
  ) {
    return {
      data: await this.organizationsService.listOrganizationUsers(id, user),
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
