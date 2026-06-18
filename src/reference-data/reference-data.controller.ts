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
import { CreatePracticeDto } from './dto/create-practice.dto';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdatePracticeDto } from './dto/update-practice.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { ReferenceDataService } from './reference-data.service';

@Controller('reference')
export class ReferenceDataController {
  constructor(private readonly referenceDataService: ReferenceDataService) {}

  @RequirePermission('organization.read')
  @Get('practices')
  async listPractices(@CurrentUser() user: UserContext) {
    return {
      data: await this.referenceDataService.listPractices(user),
    };
  }

  @RequirePermission('organization.read')
  @Get('practices/export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="practices.csv"')
  async exportPractices(@CurrentUser() user: UserContext) {
    return await this.referenceDataService.exportPractices(user);
  }

  @RequirePermission('organization.read')
  @Get('practices/:id/providers')
  async listPracticeProviders(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
  ) {
    return {
      data: await this.referenceDataService.listPracticeProviders(id, user),
    };
  }

  @RequirePermission('organization.read')
  @Get('practices/:id')
  async getPractice(@Param('id') id: string, @CurrentUser() user: UserContext) {
    return {
      data: await this.referenceDataService.getPractice(id, user),
    };
  }

  @RequirePermission('organization.update')
  @Post('practices')
  async createPractice(
    @Body() body: CreatePracticeDto,
    @CurrentUser() user: UserContext,
  ) {
    return {
      data: await this.referenceDataService.createPractice(body, user),
    };
  }

  @RequirePermission('organization.update')
  @Patch('practices/:id')
  async updatePractice(
    @Param('id') id: string,
    @Body() body: UpdatePracticeDto,
    @CurrentUser() user: UserContext,
  ) {
    return {
      data: await this.referenceDataService.updatePractice(id, body, user),
    };
  }

  @RequirePermission('providers.read')
  @Get('providers')
  async listProviders(@CurrentUser() user: UserContext) {
    return {
      data: await this.referenceDataService.listProviders(user),
    };
  }

  @RequirePermission('providers.read')
  @Get('providers/export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="providers.csv"')
  async exportProviders(@CurrentUser() user: UserContext) {
    return await this.referenceDataService.exportProviders(user);
  }

  @RequirePermission('providers.read')
  @Get('providers/:id')
  async getProvider(@Param('id') id: string, @CurrentUser() user: UserContext) {
    return {
      data: await this.referenceDataService.getProvider(id, user),
    };
  }

  @RequirePermission('organization.update')
  @Post('providers')
  async createProvider(
    @Body() body: CreateProviderDto,
    @CurrentUser() user: UserContext,
  ) {
    return {
      data: await this.referenceDataService.createProvider(body, user),
    };
  }

  @RequirePermission('organization.update')
  @Patch('providers/:id')
  async updateProvider(
    @Param('id') id: string,
    @Body() body: UpdateProviderDto,
    @CurrentUser() user: UserContext,
  ) {
    return {
      data: await this.referenceDataService.updateProvider(id, body, user),
    };
  }
}
