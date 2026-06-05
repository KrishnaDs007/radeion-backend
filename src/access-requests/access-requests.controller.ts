import { Body, Controller, Param, Post } from '@nestjs/common';
import type { UserContext } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { AccessRequestsService } from './access-requests.service';
import { ApproveOrganizationRequestDto } from './dto/approve-organization-request.dto';
import { ApproveUserRequestDto } from './dto/approve-user-request.dto';
import { CreateOrganizationAccessRequestDto } from './dto/create-organization-access-request.dto';
import { CreateUserAccessRequestDto } from './dto/create-user-access-request.dto';

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
}
