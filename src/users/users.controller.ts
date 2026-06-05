import { Controller, Get } from '@nestjs/common';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
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
}
