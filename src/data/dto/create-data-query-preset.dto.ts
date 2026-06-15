import { Type } from 'class-transformer';
import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  ValidateNested,
} from 'class-validator';
import {
  DATA_QUERY_PRESET_DATA_SETS,
  type DataQueryPresetDataSet,
} from '../data-query-presets.constants';
import { DataQueryDto } from './data-query.dto';

export class CreateDataQueryPresetDto {
  @IsString()
  @Length(1, 100)
  name!: string;

  @IsIn(DATA_QUERY_PRESET_DATA_SETS)
  dataSet!: DataQueryPresetDataSet;

  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ValidateNested()
  @IsObject()
  @Type(() => DataQueryDto)
  query!: DataQueryDto;
}
