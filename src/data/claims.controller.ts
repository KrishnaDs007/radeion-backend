import { Controller, Get } from '@nestjs/common';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@Controller('claims')
@RequirePermission('claims.read')
export class ClaimsController {
  @Get()
  listClaims() {
    return {
      data: [],
      message: 'Claims API placeholder',
    };
  }
}
