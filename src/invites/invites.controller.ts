import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type { UserContext } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { CreateInviteDto } from './dto/create-invite.dto';
import { InvitesService } from './invites.service';

@Controller('invites')
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @RequirePermission('user.read')
  @Get()
  async listInvites() {
    return {
      data: await this.invitesService.listInvites(),
    };
  }

  @RequirePermission('role.assign')
  @Post()
  async createInvite(
    @Body() body: CreateInviteDto,
    @CurrentUser() user: UserContext,
  ) {
    return {
      data: await this.invitesService.createInvite(body, user),
    };
  }

  @Public()
  @Post('accept')
  async acceptInvite(@Body() body: AcceptInviteDto) {
    return {
      data: await this.invitesService.acceptInvite(body),
    };
  }

  @RequirePermission('role.assign')
  @Post(':id/revoke')
  async revokeInvite(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
  ) {
    return {
      data: await this.invitesService.revokeInvite(id, user),
    };
  }
}
