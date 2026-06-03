import { Controller, Get } from '@nestjs/common';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@Controller('users')
@RequirePermission('user.read')
export class UsersController {
  @Get()
  listUsers() {
    return {
      data: [],
      message: 'User management API placeholder',
    };
  }
}
