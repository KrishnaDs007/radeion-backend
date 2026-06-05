import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateProviderDto {
  @IsUUID()
  organizationId!: string;

  @IsOptional()
  @IsUUID()
  practiceId?: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  npi?: string;

  @IsOptional()
  @IsString()
  externalReferenceId?: string;

  @IsOptional()
  @IsIn(['manual', 'databricks'])
  source?: 'manual' | 'databricks';
}
