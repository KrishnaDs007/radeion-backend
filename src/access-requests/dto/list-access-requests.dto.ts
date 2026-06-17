import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

const ACCESS_REQUEST_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'declined',
  'failed',
] as const;

export class ListAccessRequestsDto {
  @IsOptional()
  @IsIn(ACCESS_REQUEST_STATUSES)
  status?: (typeof ACCESS_REQUEST_STATUSES)[number];

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsUUID()
  reviewedById?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

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
