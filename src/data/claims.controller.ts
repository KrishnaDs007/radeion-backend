import { Controller, Get, Query } from '@nestjs/common';
import type { UserContext } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { DataQueryService } from './data-query.service';
import { DataQueryDto } from './dto/data-query.dto';

@Controller('claims')
@RequirePermission('claims.read')
export class ClaimsController {
  constructor(private readonly dataQueryService: DataQueryService) {}

  @Get()
  async listClaims(
    @Query() query: DataQueryDto,
    @CurrentUser() user: UserContext,
  ) {
    return {
      data: await this.dataQueryService.listClaims(query, user),
    };
  }
}
