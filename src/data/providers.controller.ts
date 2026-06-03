import { Controller, Get } from '@nestjs/common';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@Controller('providers')
@RequirePermission('providers.read')
export class ProvidersController {
  @Get()
  listProviders() {
    return {
      data: [],
      message: 'Providers API placeholder',
    };
  }
}
