import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type { UserContext } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DataQueryPresetsService } from './data-query-presets.service';
import { CreateDataQueryPresetDto } from './dto/create-data-query-preset.dto';
import { ListDataQueryPresetsDto } from './dto/list-data-query-presets.dto';
import { UpdateDataQueryPresetDto } from './dto/update-data-query-preset.dto';

@Controller('data-query-presets')
export class DataQueryPresetsController {
  constructor(
    private readonly dataQueryPresetsService: DataQueryPresetsService,
  ) {}

  @Get()
  async listPresets(
    @Query() query: ListDataQueryPresetsDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.dataQueryPresetsService.list(query, user);
  }

  @Post()
  async createPreset(
    @Body() body: CreateDataQueryPresetDto,
    @CurrentUser() user: UserContext,
  ) {
    return {
      data: await this.dataQueryPresetsService.create(body, user),
    };
  }

  @Patch(':id')
  async updatePreset(
    @Param('id') id: string,
    @Body() body: UpdateDataQueryPresetDto,
    @CurrentUser() user: UserContext,
  ) {
    return {
      data: await this.dataQueryPresetsService.update(id, body, user),
    };
  }

  @Delete(':id')
  async deletePreset(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
  ) {
    return {
      data: await this.dataQueryPresetsService.delete(id, user),
    };
  }
}
