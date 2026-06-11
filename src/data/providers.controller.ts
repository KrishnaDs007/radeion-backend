import { Controller, Get, Query } from '@nestjs/common';
import type { UserContext } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { DataQueryService } from './data-query.service';
import { DataQueryDto } from './dto/data-query.dto';

@Controller('providers')
@RequirePermission('providers.read')
export class ProvidersController {
  constructor(private readonly dataQueryService: DataQueryService) {}

  @Get()
  async listProviders(
    @Query() query: DataQueryDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.dataQueryService.listProviders(query, user);
  }
}
