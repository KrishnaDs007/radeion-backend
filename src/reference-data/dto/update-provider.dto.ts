import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateProviderDto {
  @IsOptional()
  @IsUUID()
  practiceId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  npi?: string;

  @IsOptional()
  @IsString()
  externalReferenceId?: string;

  @IsOptional()
  @IsIn(['manual', 'databricks'])
  source?: 'manual' | 'databricks';

  @IsOptional()
  @IsIn(['active', 'disabled'])
  status?: 'active' | 'disabled';
}
