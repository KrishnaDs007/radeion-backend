import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import type { UserContext } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { AccessRequestsService } from './access-requests.service';
import { ApproveOrganizationRequestDto } from './dto/approve-organization-request.dto';
import { ApproveUserRequestDto } from './dto/approve-user-request.dto';
import { CreateOrganizationAccessRequestDto } from './dto/create-organization-access-request.dto';
import { CreateUserAccessRequestDto } from './dto/create-user-access-request.dto';
import { ListAccessRequestsDto } from './dto/list-access-requests.dto';
import { RejectAccessRequestDto } from './dto/reject-access-request.dto';

@Controller('access-requests')
export class AccessRequestsController {
  constructor(private readonly accessRequestsService: AccessRequestsService) {}

  @Public()
  @Post('users')
  async createUserRequest(@Body() body: CreateUserAccessRequestDto) {
    return {
      data: await this.accessRequestsService.createUserRequest(body),
    };
  }

  @Public()
  @Post('organizations')
  async createOrganizationRequest(
    @Body() body: CreateOrganizationAccessRequestDto,
  ) {
    return {
      data: await this.accessRequestsService.createOrganizationRequest(body),
    };
  }

  @RequirePermission('user.approve')
  @Get('users')
  async listUserRequests(@Query() query: ListAccessRequestsDto) {
    return await this.accessRequestsService.listUserRequests(query);
  }

  @RequirePermission('user.approve')
  @Get('users/:id')
  async getUserRequest(@Param('id') id: string) {
    return {
      data: await this.accessRequestsService.getUserRequest(id),
    };
  }

  @RequirePermission('organization.approve')
  @Get('organizations')
  async listOrganizationRequests(@Query() query: ListAccessRequestsDto) {
    return await this.accessRequestsService.listOrganizationRequests(query);
  }

  @RequirePermission('organization.approve')
  @Get('organizations/:id')
  async getOrganizationRequest(@Param('id') id: string) {
    return {
      data: await this.accessRequestsService.getOrganizationRequest(id),
    };
  }

  @Public()
  @Post('users/:id/retry')
  async retryUserRequest(
    @Param('id') id: string,
    @Body() body: CreateUserAccessRequestDto,
  ) {
    return {
      data: await this.accessRequestsService.retryUserRequest(id, body),
    };
  }

  @Public()
  @Post('organizations/:id/retry')
  async retryOrganizationRequest(
    @Param('id') id: string,
    @Body() body: CreateOrganizationAccessRequestDto,
  ) {
    return {
      data: await this.accessRequestsService.retryOrganizationRequest(id, body),
    };
  }

  @RequirePermission('organization.approve')
  @Post('organizations/:id/approve')
  async approveOrganizationRequest(
    @Param('id') id: string,
    @Body() body: ApproveOrganizationRequestDto,
    @CurrentUser() user: UserContext,
  ) {
    return {
      data: await this.accessRequestsService.approveOrganizationRequest(
        id,
        body,
        user,
      ),
    };
  }

  @RequirePermission('organization.approve')
  @Post('organizations/:id/reject')
  async rejectOrganizationRequest(
    @Param('id') id: string,
    @Body() body: RejectAccessRequestDto,
    @CurrentUser() user: UserContext,
  ) {
    return {
      data: await this.accessRequestsService.rejectOrganizationRequest(
        id,
        body,
        user,
      ),
    };
  }

  @RequirePermission('user.approve')
  @Post('users/:id/approve')
  async approveUserRequest(
    @Param('id') id: string,
    @Body() body: ApproveUserRequestDto,
    @CurrentUser() user: UserContext,
  ) {
    return {
      data: await this.accessRequestsService.approveUserRequest(id, body, user),
    };
  }

  @RequirePermission('user.approve')
  @Post('users/:id/reject')
  async rejectUserRequest(
    @Param('id') id: string,
    @Body() body: RejectAccessRequestDto,
    @CurrentUser() user: UserContext,
  ) {
    return {
      data: await this.accessRequestsService.rejectUserRequest(id, body, user),
    };
  }
}
