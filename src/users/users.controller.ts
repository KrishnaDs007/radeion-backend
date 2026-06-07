import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import type { UserContext } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UsersService } from './users.service';

@Controller('users')
@RequirePermission('user.read')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async listUsers() {
    return {
      data: await this.usersService.listUsers(),
    };
  }

  @Get(':id')
  async getUser(@Param('id') id: string) {
    return {
      data: await this.usersService.getUser(id),
    };
  }

  @RequirePermission('user.disable')
  @Patch(':id/disable')
  async disableUser(
    @Param('id') id: string,
    @Body() body: UpdateUserStatusDto,
    @CurrentUser() user: UserContext,
  ) {
    return {
      data: await this.usersService.disableUser(id, body, user),
    };
  }

  @RequirePermission('user.disable')
  @Patch(':id/reactivate')
  async reactivateUser(
    @Param('id') id: string,
    @Body() body: UpdateUserStatusDto,
    @CurrentUser() user: UserContext,
  ) {
    return {
      data: await this.usersService.reactivateUser(id, body, user),
    };
  }
}
