import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import {
  DATA_QUERY_PRESET_DATA_SETS,
  type DataQueryPresetDataSet,
} from '../data-query-presets.constants';

export class ListDataQueryPresetsDto {
  @IsOptional()
  @IsIn(DATA_QUERY_PRESET_DATA_SETS)
  dataSet?: DataQueryPresetDataSet;

  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
