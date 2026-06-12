import { Transform, Type } from 'class-transformer';
import type { TransformFnParams } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export const DATA_QUERY_SORT_FIELDS = [
  'organizationId',
  'practiceId',
  'providerId',
  'patientId',
  'date',
] as const;

export const DATA_QUERY_SORT_DIRECTIONS = ['asc', 'desc'] as const;

export type DataQuerySortField = (typeof DATA_QUERY_SORT_FIELDS)[number];
export type DataQuerySortDirection =
  (typeof DATA_QUERY_SORT_DIRECTIONS)[number];

export class DataQueryDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsUUID()
  practiceId?: string;

  @IsOptional()
  @IsUUID()
  providerId?: string;

  @IsOptional()
  @IsString()
  patientId?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsIn(DATA_QUERY_SORT_FIELDS)
  sortBy?: DataQuerySortField;

  @IsOptional()
  @Transform(({ value }: TransformFnParams) => {
    const rawValue: unknown = value;

    return typeof rawValue === 'string' ? rawValue.toLowerCase() : rawValue;
  })
  @IsIn(DATA_QUERY_SORT_DIRECTIONS)
  sortDirection?: DataQuerySortDirection;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeResultChunks?: boolean;
}
